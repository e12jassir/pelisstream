import type { Episode, MediaItem, MediaType, MetaDetails } from "./types";

const BASE_URL = "https://v3-cinemeta.strem.io";
const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 12_000;

export type CatalogId = "top" | "imdbRating" | "year";

export const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Biography",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Sport",
  "Thriller",
  "War",
  "Western",
] as const;

export const GENRE_LABELS: Record<string, string> = {
  Action: "Acción",
  Adventure: "Aventura",
  Animation: "Animación",
  Biography: "Biografía",
  Comedy: "Comedia",
  Crime: "Crimen",
  Documentary: "Documental",
  Drama: "Drama",
  Family: "Familiar",
  Fantasy: "Fantasía",
  History: "Historia",
  Horror: "Terror",
  Mystery: "Misterio",
  Romance: "Romance",
  "Sci-Fi": "Ciencia ficción",
  Sport: "Deportes",
  Thriller: "Suspenso",
  War: "Bélico",
  Western: "Western",
  "Reality-TV": "Reality",
  "Talk-Show": "Talk show",
  "Game-Show": "Concursos",
  Music: "Música",
  Musical: "Musical",
  News: "Noticias",
  Short: "Cortometraje",
};

export const genreLabel = (genre: string) => GENRE_LABELS[genre] ?? genre;

type Raw = Record<string, unknown>;
const isRecord = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const strArr = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number.parseFloat(str(v));
  return Number.isFinite(n) ? n : 0;
};
const posInt = (v: unknown) => {
  const n = typeof v === "number" ? v : Number.parseInt(str(v), 10);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
};

export const upgradeImageUrl = (url: string, id?: string): string => {
  if (!url) return id ? `https://images.metahub.space/background/orig/${id}/img` : "";
  return url
    .replace("/background/medium/", "/background/orig/")
    .replace("/background/large/", "/background/orig/")
    .replace("/t/p/w500/", "/t/p/original/")
    .replace("/t/p/w780/", "/t/p/original/")
    .replace("/t/p/w1280/", "/t/p/original/");
};

const metahub = (kind: "background" | "logo" | "poster", id: string) =>
  kind === "background"
    ? `https://images.metahub.space/background/orig/${id}/img`
    : `https://images.metahub.space/${kind}/medium/${id}/img`;

export const toItem = (raw: Raw, fallback: MediaType): MediaItem | null => {
  const id = str(raw.id).trim();
  if (!id) return null;
  const type: MediaType =
    raw.type === "series" ? "series" : raw.type === "movie" ? "movie" : fallback;
  const runtime = posInt(str(raw.runtime).replace(/[^0-9]/g, ""));
  const trailers = [
    ...(Array.isArray(raw.trailerStreams)
      ? raw.trailerStreams.filter(isRecord).map((t) => str(t.ytId))
      : []),
    ...(Array.isArray(raw.trailers) ? raw.trailers.filter(isRecord).map((t) => str(t.source)) : []),
  ].filter((v, i, a) => v && a.indexOf(v) === i);
  let seasons = 0;
  if (Array.isArray(raw.videos)) {
    for (const v of raw.videos) if (isRecord(v)) seasons = Math.max(seasons, posInt(v.season) ?? 0);
  }
  // Metahub posters are consistent in size/quality for every IMDb id; other sources vary.
  const poster = id.startsWith("tt")
    ? metahub("poster", id)
    : str(raw.poster).replace("/poster/small/", "/poster/medium/");
  const director = Array.isArray(raw.director)
    ? strArr(raw.director)
    : str(raw.director)
      ? [str(raw.director)]
      : [];
  const year = str(raw.releaseInfo) || str(raw.year) || String(raw.year ?? "");
  return {
    id,
    type,
    title: str(raw.name).trim() || "Sin título",
    poster,
    background: upgradeImageUrl(str(raw.background) || metahub("background", id), id),
    logo: str(raw.logo) || metahub("logo", id),
    year: /^\d{4}/.exec(year)?.[0] ?? year,
    releaseInfo: year,
    released: str(raw.released) || undefined,
    imdbRating: num(raw.imdbRating),
    genres: strArr(raw.genres).length ? strArr(raw.genres) : strArr(raw.genre),
    synopsis: str(raw.description),
    runtimeMinutes: runtime ?? undefined,
    cast: strArr(raw.cast),
    director,
    writer: strArr(raw.writer),
    awards: str(raw.awards) || undefined,
    country: str(raw.country) || undefined,
    trailers,
    totalSeasons: seasons || undefined,
  };
};

const toEpisodes = (raw: Raw, seriesId: string): Episode[] => {
  if (!Array.isArray(raw.videos)) return [];
  const out: Episode[] = [];
  for (const v of raw.videos) {
    if (!isRecord(v)) continue;
    const season = posInt(v.season);
    const episode = posInt(v.number) ?? posInt(v.episode);
    if (season === null || episode === null) continue;
    out.push({
      id: `${seriesId}:${season}:${episode}`,
      season,
      episode,
      title: str(v.name).trim() || `Episodio ${episode}`,
      overview: str(v.overview) || str(v.description) || undefined,
      thumbnail: str(v.thumbnail) || undefined,
      released: str(v.released) || str(v.firstAired) || undefined,
    });
  }
  return out.sort((a, b) => a.season - b.season || a.episode - b.episode);
};

const cache = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.startsWith("http") ? url : `${BASE_URL}${url}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Cinemeta ${res.status}`);
    return await res.json();
  } finally {
    window.clearTimeout(timer);
  }
}

export function load<T>(path: string, map: (raw: unknown) => T): Promise<T> {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);
  const inflight = pending.get(path);
  if (inflight) return inflight as Promise<T>;
  const p = fetchJson(path)
    .then((raw) => {
      const value = map(raw);
      cache.set(path, { value, expires: Date.now() + TTL_MS });
      return value;
    })
    .finally(() => pending.delete(path));
  pending.set(path, p);
  return p;
}

export const mapMetas = (raw: unknown, type: MediaType) => {
  if (!isRecord(raw) || !Array.isArray(raw.metas)) return [];
  return raw.metas
    .filter(isRecord)
    .map((m) => toItem(m, type))
    .filter((m): m is MediaItem => m !== null);
};

export interface CatalogQuery {
  type: MediaType;
  catalog?: CatalogId;
  genre?: string;
  search?: string;
  skip?: number;
}

export const catalogKey = (q: CatalogQuery) =>
  `${q.type}|${q.catalog ?? "top"}|${q.genre ?? ""}|${q.search ?? ""}|${q.skip ?? 0}`;

export function getCatalog(q: CatalogQuery): Promise<MediaItem[]> {
  const extras: string[] = [];
  if (q.genre) extras.push(`genre=${encodeURIComponent(q.genre)}`);
  if (q.search) extras.push(`search=${encodeURIComponent(q.search.trim())}`);
  if (q.skip) extras.push(`skip=${q.skip}`);
  const extra = extras.length ? `/${extras.join("&")}` : "";
  return load(`/catalog/${q.type}/${q.catalog ?? "top"}${extra}.json`, (raw) =>
    mapMetas(raw, q.type),
  );
}

export async function getMeta(type: MediaType, id: string): Promise<MetaDetails> {
  const raw = await load(`/meta/${type}/${encodeURIComponent(id)}.json`, (v) => v);
  if (!isRecord(raw) || !isRecord(raw.meta)) throw new Error("Metadatos no disponibles");
  const item = toItem(raw.meta, type);
  if (!item) throw new Error("Metadatos no disponibles");
  return { item, episodes: type === "series" ? toEpisodes(raw.meta, id) : [] };
}

export async function searchAll(query: string): Promise<MediaItem[]> {
  const [movies, series] = await Promise.all([
    getCatalog({ type: "movie", search: query }).catch(() => []),
    getCatalog({ type: "series", search: query }).catch(() => []),
  ]);
  const out: MediaItem[] = [];
  const max = Math.max(movies.length, series.length);
  for (let i = 0; i < max; i++) {
    if (movies[i]) out.push(movies[i]);
    if (series[i]) out.push(series[i]);
  }
  return out;
}

export const KIDS_GENRES = ["Animation", "Family"];
export const isKidsSafe = (item: MediaItem) =>
  item.genres.some((g) => KIDS_GENRES.includes(g)) &&
  !item.genres.some((g) => g === "Horror" || g === "Thriller" || g === "Crime" || g === "War");

export const currentYear = () => new Date().getFullYear();
