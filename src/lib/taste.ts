import { useEffect, useMemo, useState } from "react";
import { getCatalog } from "./cinemeta";
import type { MediaItem, ProfileData, Rating } from "./types";

const RATING_WEIGHT: Record<Rating, number> = { down: -2, up: 1.5, love: 3 };

export interface Affinity {
  genre: string;
  weight: number;
}

export function affinities(data: ProfileData): Affinity[] {
  const scores = new Map<string, number>();
  const apply = (id: string, delta: number) => {
    const meta = data.meta[id];
    if (!meta) return;
    for (const g of meta.genres) scores.set(g, (scores.get(g) ?? 0) + delta);
  };
  for (const [id, r] of Object.entries(data.ratings)) apply(id, RATING_WEIGHT[r]);
  for (const id of data.list) apply(id, 1.5);
  for (const id of Object.keys(data.history)) if (!(id in data.ratings)) apply(id, 0.5);
  return [...scores.entries()]
    .filter(([, w]) => w > 0)
    .map(([genre, weight]) => ({ genre, weight: Math.round(weight * 100) / 100 }))
    .sort((a, b) => b.weight - a.weight);
}

/** Personal "match" score in the style of Netflix: IMDb quality plus genre affinity. */
export function matchScore(item: MediaItem, aff: Affinity[]): number {
  const top = aff[0]?.weight ?? 1;
  let boost = 0;
  for (const g of item.genres) {
    const a = aff.find((x) => x.genre === g);
    if (a) boost += (a.weight / top) * 9;
  }
  const base = item.imdbRating ? 55 + item.imdbRating * 4.2 : 72;
  // Small deterministic spread so similar titles don't all share one number.
  const jitter = [...item.id].reduce((n, c) => n + c.charCodeAt(0), 0) % 5;
  return Math.max(52, Math.min(99, Math.round(base + Math.min(boost, 14) + jitter - 2)));
}

export function useAffinities(data: ProfileData) {
  return useMemo(() => affinities(data), [data.ratings, data.list, data.history, data.meta]);
}

export function useRecommendations(data: ProfileData, filter: (items: MediaItem[]) => MediaItem[]) {
  const aff = useAffinities(data);
  const top = aff.slice(0, 3);
  const key = top.map((a) => a.genre).join("|");
  const [state, setState] = useState<{ items: MediaItem[]; loading: boolean }>({
    items: [],
    loading: false,
  });

  useEffect(() => {
    if (!top.length) {
      setState({ items: [], loading: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.all(
      top.flatMap((a) => [
        getCatalog({ type: "movie", genre: a.genre }).catch(() => []),
        getCatalog({ type: "series", genre: a.genre }).catch(() => []),
      ]),
    ).then((batches) => {
      if (!alive) return;
      const excluded = new Set([...Object.keys(data.history), ...data.list]);
      const seen = new Map<string, { item: MediaItem; score: number }>();
      for (const item of batches.flat()) {
        if (excluded.has(item.id) || seen.has(item.id)) continue;
        let score = item.imdbRating / 2;
        for (const g of item.genres) score += top.find((a) => a.genre === g)?.weight ?? 0;
        seen.set(item.id, { item, score });
      }
      const items = [...seen.values()].sort((a, b) => b.score - a.score).map((x) => x.item);
      setState({ items: filter(items).slice(0, 20), loading: false });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...state, reasons: top.map((a) => a.genre) };
}

export function statistics(data: ProfileData) {
  const progress = Object.values(data.progress);
  const watchedIds = Object.keys(data.history);
  const watchedSeconds = progress.reduce(
    (sum, p) => sum + Math.min(p.position, p.duration || p.position),
    0,
  );
  const runtimeMinutes = watchedIds.reduce(
    (sum, id) => sum + (data.meta[id]?.runtimeMinutes ?? 0),
    0,
  );
  return {
    watched: watchedIds.length,
    movies: watchedIds.filter((id) => data.meta[id]?.type === "movie").length,
    series: watchedIds.filter((id) => data.meta[id]?.type === "series").length,
    episodes: Object.keys(data.watchedEpisodes).length,
    list: data.list.length,
    rated: Object.keys(data.ratings).length,
    loved: Object.values(data.ratings).filter((r) => r === "love").length,
    watchedMinutes: Math.round(watchedSeconds / 60),
    catalogMinutes: runtimeMinutes,
    topGenres: affinities(data).slice(0, 6),
  };
}
