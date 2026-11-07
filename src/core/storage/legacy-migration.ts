import type { StoredProgressEntry } from './storage.interface';
import {
  CURRENT_STORAGE_VERSION,
  createDefaultState,
  type CachedMediaMetadata,
  type PelisStreamStorageSchemaV2,
} from './storage.interface';

/** Minimal read port so the migration stays independent from `localStorage`. */
export type LegacyKeyValueReader = (key: string) => string | null;

export interface LegacyMigrationResult {
  readonly state: PelisStreamStorageSchemaV2;
  readonly migrated: boolean;
}

export const LEGACY_KEYS = {
  favorites: 'pelisstream_favorites',
  watchLater: 'pelisstream_watch_later',
  server: 'pelisstream_server',
  seen: 'pelisstream_seen',
  ratings: 'pelisstream_ratings',
  hideWatched: 'pelisstream_hide_watched',
  progress: 'pelisstream_progress',
  cachedMetadata: 'pelisstream_metadata',
} as const;

const SERVER_ID_MAP: Record<string, string> = {
  '1': 'playlatin',
  '2': 'vidsrc_to',
  '3': 'vidsrc_me',
  '4': 'multiembed',
  playlatin: 'playlatin',
  vidsrc_to: 'vidsrc_to',
  vidsrc_me: 'vidsrc_me',
  multiembed: 'multiembed',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJson = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const extractIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string' && entry.length > 0) {
      ids.push(entry);
    } else if (isRecord(entry)) {
      const id = entry['id'];
      if (typeof id === 'string' && id.length > 0) ids.push(id);
    }
  }
  return Array.from(new Set(ids));
};

const toSeenMap = (value: unknown, now: number): Record<string, number> => {
  if (Array.isArray(value)) {
    return extractIds(value).reduce<Record<string, number>>((acc, id) => {
      acc[id] = now;
      return acc;
    }, {});
  }
  const result: Record<string, number> = {};
  if (!isRecord(value)) return result;
  for (const [id, entry] of Object.entries(value)) {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      result[id] = entry;
    } else if (entry === true) {
      result[id] = now;
    }
  }
  return result;
};

const toRatingMap = (value: unknown): Record<string, number> => {
  const result: Record<string, number> = {};
  if (!isRecord(value)) return result;
  for (const [id, entry] of Object.entries(value)) {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      const clamped = Math.max(1, Math.min(5, Math.round(entry)));
      result[id] = clamped;
    }
  }
  return result;
};

const toLegacyProgress = (value: unknown): Record<string, StoredProgressEntry> => {
  const result: Record<string, StoredProgressEntry> = {};
  if (!isRecord(value)) return result;
  for (const [id, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const type = entry['type'];
    const timestamp = entry['timestamp'];
    if ((type !== 'movie' && type !== 'series') || typeof timestamp !== 'number') continue;
    const season = entry['season'];
    const episode = entry['episode'];
    result[id] = {
      type,
      timestamp,
      ...(typeof season === 'number' ? { season } : {}),
      ...(typeof episode === 'number' ? { episode } : {}),
    };
  }
  return result;
};

const toLegacyMetadata = (value: unknown): Record<string, CachedMediaMetadata> => {
  const result: Record<string, CachedMediaMetadata> = {};
  if (!isRecord(value)) return result;
  for (const [id, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const title = entry['title'];
    const poster = entry['poster'];
    if (typeof title !== 'string' || typeof poster !== 'string') continue;
    const year = entry['year'];
    const rating = entry['imdbRating'];
    result[id] = {
      title,
      poster,
      year: typeof year === 'number' || typeof year === 'string' ? year : '',
      imdbRating: typeof rating === 'number' && Number.isFinite(rating) ? rating : 0,
      genres: Array.isArray(entry['genres'])
        ? entry['genres'].filter((genre): genre is string => typeof genre === 'string')
        : [],
      lastUpdated: Date.now(),
    };
  }
  return result;
};

const toBooleanFlag = (value: unknown): boolean =>
  value === true || value === 1 || value === 'true' || value === '1';

/**
 * Converts the v1 localStorage payload (fragmented keys, object-shaped
 * favorites, numeric server ids) into the v2 schema. Unknown fields are
 * ignored instead of failing the whole migration.
 */
export const migrateFromLegacyStorage = (
  read: LegacyKeyValueReader,
  now: number = Date.now(),
): LegacyMigrationResult => {
  const state = createDefaultState();
  const favorites = extractIds(parseJson(read(LEGACY_KEYS.favorites)));
  const watchLater = extractIds(parseJson(read(LEGACY_KEYS.watchLater)));
  const seen = toSeenMap(parseJson(read(LEGACY_KEYS.seen)), now);
  const ratings = toRatingMap(parseJson(read(LEGACY_KEYS.ratings)));
  const progress = toLegacyProgress(parseJson(read(LEGACY_KEYS.progress)));
  const cachedMetadata = toLegacyMetadata(parseJson(read(LEGACY_KEYS.cachedMetadata)));

  const serverRaw = read(LEGACY_KEYS.server);
  const serverId = serverRaw ? SERVER_ID_MAP[serverRaw.trim()] : undefined;
  const hideWatched = toBooleanFlag(parseJson(read(LEGACY_KEYS.hideWatched)));

  state.version = CURRENT_STORAGE_VERSION;
  state.favorites = favorites;
  state.watchLater = watchLater;
  state.seenMedia = seen;
  state.ratings = ratings;
  state.progress = progress;
  state.cachedMetadata = cachedMetadata;
  if (serverId) state.preferredServerId = serverId;
  state.hideWatchedInCatalog = hideWatched;

  const migrated =
    favorites.length > 0 ||
    watchLater.length > 0 ||
    Object.keys(seen).length > 0 ||
    Object.keys(ratings).length > 0 ||
    Object.keys(progress).length > 0 ||
    Object.keys(cachedMetadata).length > 0 ||
    Boolean(serverId) ||
    hideWatched;

  return { state, migrated };
};
