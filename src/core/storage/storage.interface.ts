import type { MediaType, StreamingPlatformId } from '../domain/media';

export const CURRENT_STORAGE_VERSION = 2 as const;
export type StorageVersion = typeof CURRENT_STORAGE_VERSION;

export type ThemeId = 'apple' | 'cinema' | 'netflix' | 'max' | 'disney';

export type AvatarId =
  | 'astronaut'
  | 'samurai'
  | 'starlight'
  | 'director'
  | 'cyber-wolf'
  | 'valkyrie'
  | 'noir'
  | 'arcade';

export interface UserProfile {
  readonly id: string;
  readonly name: string;
  readonly roleLabel: string;
  readonly avatarId?: AvatarId;
  readonly avatarColor: string;
  readonly avatarGradient: string;
  readonly initial: string;
  readonly isKids?: boolean;
  readonly pin?: string;
  readonly preferredTheme?: ThemeId;
}

export interface ProfileDataSnapshot {
  favorites: string[];
  watchLater: string[];
  seenMedia: Record<string, number>;
  ratings: Record<string, number>;
  progress: Record<string, StoredProgressEntry>;
  watchedEpisodes: Record<string, boolean>;
}

export const DEFAULT_PROFILES: readonly UserProfile[] = [
  {
    id: 'esteban',
    name: 'Esteban',
    roleLabel: '4K Dolby Vision · Director',
    avatarId: 'samurai',
    avatarColor: '#38bdf8',
    avatarGradient: 'linear-gradient(135deg, #0ea5e9 0%, #1e1b4b 100%)',
    initial: 'E',
    preferredTheme: 'apple',
  },
  {
    id: 'gaby',
    name: 'Gaby',
    roleLabel: 'Disney+ & Animación',
    avatarId: 'starlight',
    avatarColor: '#f472b6',
    avatarGradient: 'linear-gradient(135deg, #ec4899 0%, #4c1d95 100%)',
    initial: 'G',
    isKids: true,
    preferredTheme: 'disney',
  },
  {
    id: 'papa',
    name: 'Papá',
    roleLabel: 'Acción IMAX & Clásicos',
    avatarId: 'noir',
    avatarColor: '#e50914',
    avatarGradient: 'linear-gradient(135deg, #dc2626 0%, #450a0a 100%)',
    initial: 'P',
    preferredTheme: 'netflix',
  },
  {
    id: 'cine-arte',
    name: 'Sala VIP',
    roleLabel: 'HBO Prestige & A24',
    avatarId: 'astronaut',
    avatarColor: '#a855f7',
    avatarGradient: 'linear-gradient(135deg, #7c3aed 0%, #0f172a 100%)',
    initial: 'V',
    preferredTheme: 'max',
  },
];

export interface CachedMediaMetadata {
  title: string;
  poster: string;
  year: string | number;
  imdbRating: number;
  genres: string[];
  runtimeMinutes?: number;
  lastUpdated: number;
  /** Optional so entries written by older versions stay valid. */
  type?: MediaType;
  background?: string;
  logo?: string;
  synopsis?: string;
  platformHub?: StreamingPlatformId;
}

export interface StoredProgressEntry {
  type: MediaType;
  timestamp: number;
  season?: number;
  episode?: number;
  progressPercent?: number;
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
  activeProfileId: string;
  themeId: ThemeId;
  profiles: UserProfile[];
  profileBuckets: Record<string, ProfileDataSnapshot>;
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

export const createEmptyProfileBucket = (): ProfileDataSnapshot => ({
  favorites: [],
  watchLater: [],
  seenMedia: {},
  ratings: {},
  progress: {},
  watchedEpisodes: {},
});

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
  activeProfileId: 'esteban',
  themeId: 'apple',
  profiles: [...DEFAULT_PROFILES],
  profileBuckets: {},
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
    const progressPercent = toFiniteNumber(entry['progressPercent']);
    result[key] = {
      type,
      timestamp,
      ...(season !== null && season > 0 ? { season } : {}),
      ...(episode !== null && episode > 0 ? { episode } : {}),
      ...(progressPercent !== null && progressPercent > 0 ? { progressPercent } : {}),
    };
  }
  return result;
};

const VALID_PLATFORMS: ReadonlySet<StreamingPlatformId> = new Set([
  'nfx',
  'hbm',
  'atp',
  'dnp',
  'amp',
]);

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
    const type = entry['type'];
    const background = entry['background'];
    const logo = entry['logo'];
    const synopsis = entry['synopsis'];
    const platformHub = entry['platformHub'];
    result[key] = {
      title,
      poster,
      year: typeof year === 'number' || typeof year === 'string' ? year : '',
      imdbRating: toFiniteNumber(entry['imdbRating']) ?? 0,
      genres: toStringArray(entry['genres']),
      lastUpdated: toFiniteNumber(entry['lastUpdated']) ?? 0,
      ...(runtime !== null ? { runtimeMinutes: Math.round(runtime) } : {}),
      ...(type === 'movie' || type === 'series' ? { type } : {}),
      ...(typeof background === 'string' ? { background } : {}),
      ...(typeof logo === 'string' ? { logo } : {}),
      ...(typeof synopsis === 'string' ? { synopsis } : {}),
      ...(typeof platformHub === 'string' && VALID_PLATFORMS.has(platformHub as StreamingPlatformId)
        ? { platformHub: platformHub as StreamingPlatformId }
        : {}),
    };
  }
  return result;
};

const VALID_THEMES: ReadonlySet<ThemeId> = new Set(['apple', 'cinema', 'netflix', 'max', 'disney']);
const VALID_AVATARS: ReadonlySet<AvatarId> = new Set([
  'astronaut',
  'samurai',
  'starlight',
  'director',
  'cyber-wolf',
  'valkyrie',
  'noir',
  'arcade',
]);

const toThemeId = (value: unknown): ThemeId =>
  typeof value === 'string' && VALID_THEMES.has(value as ThemeId) ? (value as ThemeId) : 'apple';

const toProfilesArray = (value: unknown): UserProfile[] => {
  if (!Array.isArray(value) || value.length === 0) return [...DEFAULT_PROFILES];
  const parsed: UserProfile[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const id = typeof raw['id'] === 'string' ? raw['id'].trim() : '';
    const name = typeof raw['name'] === 'string' ? raw['name'].trim() : '';
    if (!id || !name) continue;
    const roleLabel =
      typeof raw['roleLabel'] === 'string' && raw['roleLabel'].trim()
        ? raw['roleLabel'].trim()
        : '4K Dolby Vision';
    const avatarIdRaw = raw['avatarId'];
    const defaultMatch = DEFAULT_PROFILES.find((p) => p.id === id);
    const avatarId: AvatarId =
      typeof avatarIdRaw === 'string' && VALID_AVATARS.has(avatarIdRaw as AvatarId)
        ? (avatarIdRaw as AvatarId)
        : (defaultMatch?.avatarId ?? 'astronaut');
    const avatarColor =
      typeof raw['avatarColor'] === 'string' && raw['avatarColor']
        ? raw['avatarColor']
        : (defaultMatch?.avatarColor ?? '#38bdf8');
    const avatarGradient =
      typeof raw['avatarGradient'] === 'string' && raw['avatarGradient']
        ? raw['avatarGradient']
        : (defaultMatch?.avatarGradient ?? 'linear-gradient(135deg, #0ea5e9 0%, #1e1b4b 100%)');
    const initial =
      typeof raw['initial'] === 'string' && raw['initial']
        ? raw['initial'].slice(0, 1).toUpperCase()
        : name.slice(0, 1).toUpperCase();
    const isKids = raw['isKids'] === true;
    const pin = typeof raw['pin'] === 'string' && /^\d{4}$/.test(raw['pin']) ? raw['pin'] : undefined;
    const preferredTheme =
      typeof raw['preferredTheme'] === 'string' && VALID_THEMES.has(raw['preferredTheme'] as ThemeId)
        ? (raw['preferredTheme'] as ThemeId)
        : defaultMatch?.preferredTheme;

    parsed.push({
      id,
      name,
      roleLabel,
      avatarId,
      avatarColor,
      avatarGradient,
      initial,
      ...(isKids ? { isKids: true } : {}),
      ...(pin ? { pin } : {}),
      ...(preferredTheme ? { preferredTheme } : {}),
    });
  }
  return parsed.length > 0 ? parsed : [...DEFAULT_PROFILES];
};

const toProfileBuckets = (value: unknown): Record<string, ProfileDataSnapshot> => {
  const result: Record<string, ProfileDataSnapshot> = {};
  if (!isRecord(value)) return result;
  for (const [profileId, rawBucket] of Object.entries(value)) {
    if (!isRecord(rawBucket)) continue;
    result[profileId] = {
      favorites: toStringArray(rawBucket['favorites']),
      watchLater: toStringArray(rawBucket['watchLater']),
      seenMedia: toStringNumberRecord(rawBucket['seenMedia']),
      ratings: toStringNumberRecord(rawBucket['ratings']),
      progress: toProgressRecord(rawBucket['progress']),
      watchedEpisodes: toBooleanRecord(rawBucket['watchedEpisodes']),
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
  const profiles = toProfilesArray(raw['profiles']);
  const activeProfileId =
    typeof raw['activeProfileId'] === 'string' &&
    profiles.some((p) => p.id === raw['activeProfileId'])
      ? raw['activeProfileId']
      : (profiles[0]?.id ?? defaults.activeProfileId);

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
    activeProfileId,
    themeId: toThemeId(raw['themeId']),
    profiles,
    profileBuckets: toProfileBuckets(raw['profileBuckets']),
  };
};
