import type { MediaType } from '../domain/media';

export const CURRENT_STORAGE_VERSION = 2 as const;
export type StorageVersion = typeof CURRENT_STORAGE_VERSION;

export interface CachedMediaMetadata {
  title: string;
  poster: string;
  year: string | number;
  imdbRating: number;
  genres: string[];
  runtimeMinutes?: number;
  lastUpdated: number;
}

export interface StoredProgressEntry {
  type: MediaType;
  timestamp: number;
  season?: number;
  episode?: number;
}

/**
 * Versioned persistence contract. `version` is literal `2`, so a v1 payload
 * can never be mistaken for a valid v2 payload.
 */
export interface PelisStreamStorageSchemaV2 {
  version: StorageVersion;
  favorites: string[];
  watchLater: string[];
  seenMedia: Record<string, number>;
  ratings: Record<string, number>;
  progress: Record<string, StoredProgressEntry>;
  watchedEpisodes: Record<string, boolean>;
  preferredServerId: string;
  hideWatchedInCatalog: boolean;
  cachedMetadata: Record<string, CachedMediaMetadata>;
}

export type StorageKey = keyof PelisStreamStorageSchemaV2;

export interface IStorageAdapter {
  get<K extends StorageKey>(key: K): PelisStreamStorageSchemaV2[K];
  set<K extends StorageKey>(key: K, value: PelisStreamStorageSchemaV2[K]): void;
  /** Applies a batch of changes through a single persist + notify cycle. */
  mutate(mutator: (draft: PelisStreamStorageSchemaV2) => void): void;
  snapshot(): PelisStreamStorageSchemaV2;
  clear(): void;
  subscribe(listener: (state: PelisStreamStorageSchemaV2) => void): () => void;
}

export const createDefaultState = (): PelisStreamStorageSchemaV2 => ({
  version: CURRENT_STORAGE_VERSION,
  favorites: [],
  watchLater: [],
  seenMedia: {},
  ratings: {},
  progress: {},
  watchedEpisodes: {},
  preferredServerId: 'playlatin',
  hideWatchedInCatalog: false,
  cachedMetadata: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toStringNumberRecord = (value: unknown): Record<string, number> => {
  const result: Record<string, number> = {};
  if (!isRecord(value)) return result;
  for (const [key, entry] of Object.entries(value)) {
    const numeric = toFiniteNumber(entry);
    if (numeric !== null) result[key] = numeric;
  }
  return result;
};

const toBooleanRecord = (value: unknown): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  if (!isRecord(value)) return result;
  for (const [key, entry] of Object.entries(value)) {
    if (entry === true) result[key] = true;
  }
  return result;
};

const toProgressRecord = (value: unknown): Record<string, StoredProgressEntry> => {
  const result: Record<string, StoredProgressEntry> = {};
  if (!isRecord(value)) return result;
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const type = entry['type'];
    const timestamp = toFiniteNumber(entry['timestamp']);
    if ((type !== 'movie' && type !== 'series') || timestamp === null) continue;
    const season = toFiniteNumber(entry['season']);
    const episode = toFiniteNumber(entry['episode']);
    result[key] = {
      type,
      timestamp,
      ...(season !== null && season > 0 ? { season } : {}),
      ...(episode !== null && episode > 0 ? { episode } : {}),
    };
  }
  return result;
};

const toMetadataRecord = (value: unknown): Record<string, CachedMediaMetadata> => {
  const result: Record<string, CachedMediaMetadata> = {};
  if (!isRecord(value)) return result;
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const title = entry['title'];
    const poster = entry['poster'];
    if (typeof title !== 'string' || typeof poster !== 'string') continue;
    const year = entry['year'];
    const runtime = toFiniteNumber(entry['runtimeMinutes']);
    result[key] = {
      title,
      poster,
      year: typeof year === 'number' || typeof year === 'string' ? year : '',
      imdbRating: toFiniteNumber(entry['imdbRating']) ?? 0,
      genres: toStringArray(entry['genres']),
      lastUpdated: toFiniteNumber(entry['lastUpdated']) ?? 0,
      ...(runtime !== null ? { runtimeMinutes: Math.round(runtime) } : {}),
    };
  }
  return result;
};

/** Repairs any unknown/partial v2 payload into a complete valid state. */
export const hydrateState = (raw: unknown): PelisStreamStorageSchemaV2 => {
  const defaults = createDefaultState();
  if (!isRecord(raw)) return defaults;

  const preferredServerId = raw['preferredServerId'];
  const hideWatched = raw['hideWatchedInCatalog'];

  return {
    version: CURRENT_STORAGE_VERSION,
    favorites: toStringArray(raw['favorites']),
    watchLater: toStringArray(raw['watchLater']),
    seenMedia: toStringNumberRecord(raw['seenMedia']),
    ratings: toStringNumberRecord(raw['ratings']),
    progress: toProgressRecord(raw['progress']),
    watchedEpisodes: toBooleanRecord(raw['watchedEpisodes']),
    preferredServerId:
      typeof preferredServerId === 'string' && preferredServerId.length > 0
        ? preferredServerId
        : defaults.preferredServerId,
    hideWatchedInCatalog: hideWatched === true,
    cachedMetadata: toMetadataRecord(raw['cachedMetadata']),
  };
};
