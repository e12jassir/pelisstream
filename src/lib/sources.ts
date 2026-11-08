import { useEffect, useState } from "react";
import { catalogKey, getCatalog, type CatalogQuery } from "./cinemeta";
import { useKidsFilter } from "./hooks";
import { getPlatformCatalog, getPlatformMix } from "./platforms";
import type { MediaItem, MediaType, PlatformId } from "./types";

export type SortMode = "trending" | "rating" | "recent";

export type RailSource =
  | { kind: "catalog"; query: CatalogQuery }
  | {
      kind: "platform";
      platform: PlatformId;
      type?: MediaType;
      genres?: string[];
      sort?: SortMode;
    };

export const sourceKey = (s: RailSource) =>
  s.kind === "catalog"
    ? `c:${catalogKey(s.query)}`
    : `p:${s.platform}:${s.type ?? "mix"}:${(s.genres ?? []).join(",")}:${s.sort ?? "trending"}`;

export function sortItems(items: MediaItem[], sort: SortMode = "trending") {
  if (sort === "rating") return [...items].sort((a, b) => b.imdbRating - a.imdbRating);
  if (sort === "recent")
    return [...items].sort((a, b) => (b.released ?? b.year).localeCompare(a.released ?? a.year));
  return items;
}

export function matchesGenres(item: MediaItem, genres?: string[]) {
  return !genres?.length || item.genres.some((g) => genres.includes(g));
}

export async function loadSource(s: RailSource): Promise<MediaItem[]> {
  if (s.kind === "catalog") return getCatalog(s.query);
  const base = s.type
    ? await getPlatformCatalog(s.platform, s.type)
    : await getPlatformMix(s.platform);
  return sortItems(
    base.filter((i) => matchesGenres(i, s.genres)),
    s.sort,
  );
}

export function useSource(source: RailSource | null, enabled = true) {
  const filter = useKidsFilter();
  const key = source ? sourceKey(source) : "";
  const [state, setState] = useState<{
    key: string;
    items: MediaItem[];
    loading: boolean;
    error: boolean;
  }>({
    key: "",
    items: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    if (!source || !enabled) return;
    let alive = true;
    setState((s) => ({ ...s, key, loading: true, error: false }));
    loadSource(source)
      .then((items) => alive && setState({ key, items, loading: false, error: false }))
      .catch(() => alive && setState({ key, items: [], loading: false, error: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const fresh = state.key === key;
  return {
    items: fresh ? filter(state.items) : [],
    loading: !fresh || state.loading,
    error: fresh && state.error,
  };
}
