import type { SeriesEpisode } from '../core/domain/episode';
import { formatEpisodeLabel, makeEpisodeKey } from '../core/domain/episode';
import type { MediaItem, MediaType } from '../core/domain/media';
import type { TasteMediaSource } from '../core/taste/taste.engine';

const DEFAULT_BASE_URL = 'https://v3-cinemeta.strem.io';
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 120;
const REQUEST_TIMEOUT_MS = 12_000;
const DEFAULT_PAGE_SIZE = 24;

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

export interface CinemetaClientOptions {
  readonly baseUrl?: string;
  readonly ttlMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export interface CatalogOptions {
  readonly catalogId?: string;
  readonly genre?: string;
  readonly search?: string;
  readonly skip?: number;
}

export interface MetaDetails {
  readonly item: MediaItem;
  readonly episodes: readonly SeriesEpisode[];
}

export class CinemetaError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'CinemetaError';
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asPositiveInt = (value: unknown): number | null => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
};

const parseRuntime = (value: unknown): number | null => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value.replace(/[^0-9]/g, ''), 10)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
};

const countSeasons = (videos: unknown): number => {
  if (!Array.isArray(videos)) return 0;
  let maxSeason = 0;
  for (const video of videos) {
    if (!isRecord(video)) continue;
    const season = asPositiveInt(video['season']);
    if (season !== null && season > maxSeason) maxSeason = season;
  }
  return maxSeason;
};

const toMediaItem = (raw: Record<string, unknown>, fallbackType: MediaType): MediaItem | null => {
  const id = asString(raw['id']).trim();
  if (!id) return null;

  const declaredType = raw['type'];
  const type: MediaType =
    declaredType === 'series' ? 'series' : declaredType === 'movie' ? 'movie' : fallbackType;
  const yearValue = raw['year'];
  const year = typeof yearValue === 'number' || typeof yearValue === 'string' ? yearValue : '';
  const background = asString(raw['background']);
  const runtime = parseRuntime(raw['runtime']);
  const poster = asString(raw['poster']) || asString(raw['background']);
  const base = {
    id,
    title: asString(raw['name']).trim() || 'Sin título',
    poster,
    year,
    imdbRating: asNumber(raw['imdbRating']),
    genres: asStringArray(raw['genres']),
    synopsis: asString(raw['description']) || asString(raw['synopsis']),
    ...(background ? { background } : {}),
    ...(runtime !== null ? { runtimeMinutes: runtime } : {}),
  };

  if (type === 'series') {
    const totalSeasons = countSeasons(raw['videos']);
    return {
      ...base,
      type: 'series',
      ...(totalSeasons > 0 ? { totalSeasons } : {}),
    };
  }

  return { ...base, type: 'movie' };
};

const toEpisodes = (raw: Record<string, unknown>, seriesId: string): SeriesEpisode[] => {
  const videos = raw['videos'];
  if (!Array.isArray(videos)) return [];

  const episodes: SeriesEpisode[] = [];
  for (const video of videos) {
    if (!isRecord(video)) continue;
    const season = asPositiveInt(video['season']);
    const episode = asPositiveInt(video['number']) ?? asPositiveInt(video['episode']);
    if (season === null || episode === null) continue;

    const released = asString(video['released']);
    const thumbnail = asString(video['thumbnail']);
    const overview = asString(video['overview']) || asString(video['description']);
    const title = asString(video['name']).trim();

    episodes.push({
      id: makeEpisodeKey(seriesId, season, episode),
      seriesId,
      seasonNumber: season,
      episodeNumber: episode,
      title: title || formatEpisodeLabel(season, episode),
      ...(released ? { releasedIso: released } : {}),
      ...(thumbnail ? { thumbnail } : {}),
      ...(overview ? { overview } : {}),
    });
  }

  return episodes.sort(
    (a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
  );
};

/**
 * Cinemeta HTTP client with a bounded in-memory LRU cache (10 minute TTL) and
 * in-flight request de-duplication. Every entry is cached by full path, so
 * catalog, genre, search and metadata queries never collide.
 */
export class CinemetaClient implements TasteMediaSource {
  private readonly baseUrl: string;
  private readonly ttlMs: number;
  private readonly fetcher: typeof fetch | null;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(options: CinemetaClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.fetcher = options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private writeCache<T>(key: string, value: T): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  private async fetchJson(path: string): Promise<unknown> {
    if (!this.fetcher) {
      throw new CinemetaError('fetch no está disponible en esta plataforma.');
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new CinemetaError(`Cinemeta respondió con estado ${response.status}.`, response.status);
      }

      return (await response.json()) as unknown;
    } catch (error) {
      if (error instanceof CinemetaError) throw error;
      if (isRecord(error) && error['name'] === 'AbortError') {
        throw new CinemetaError('Tiempo de espera agotado consultando Cinemeta.');
      }
      throw new CinemetaError('No se pudo conectar con Cinemeta.');
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private async getOrLoad<T>(path: string, mapper: (raw: unknown) => T): Promise<T> {
    const cached = this.cache.get(path) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) {
      this.cache.delete(path);
      this.cache.set(path, cached);
      return cached.value;
    }
    if (cached) this.cache.delete(path);

    const inFlight = this.pending.get(path) as Promise<T> | undefined;
    if (inFlight) return inFlight;

    const promise = this.fetchJson(path)
      .then((raw) => {
        const value = mapper(raw);
        this.writeCache(path, value);
        return value;
      })
      .finally(() => {
        this.pending.delete(path);
      });

    this.pending.set(path, promise);
    return promise;
  }

  private mapMetas(raw: unknown, fallbackType: MediaType): MediaItem[] {
    if (!isRecord(raw)) return [];
    const metas = raw['metas'];
    if (!Array.isArray(metas)) return [];

    const items: MediaItem[] = [];
    for (const meta of metas) {
      if (!isRecord(meta)) continue;
      const item = toMediaItem(meta, fallbackType);
      if (item) items.push(item);
    }
    return items;
  }

  async getCatalog(type: MediaType, options: CatalogOptions = {}): Promise<MediaItem[]> {
    const catalogId = options.catalogId ?? 'top';
    const extras: string[] = [];
    if (options.genre) extras.push(`genre=${encodeURIComponent(options.genre)}`);
    if (options.search) extras.push(`search=${encodeURIComponent(options.search)}`);
    if (options.skip !== undefined && options.skip > 0) extras.push(`skip=${options.skip}`);

    const extraPath = extras.length > 0 ? `/${extras.join('&')}` : '';
    const path = `/catalog/${type}/${catalogId}${extraPath}.json`;

    return this.getOrLoad(path, (raw) => this.mapMetas(raw, type));
  }

  async getTrending(type: MediaType, limit: number = DEFAULT_PAGE_SIZE): Promise<MediaItem[]> {
    const items = await this.getCatalog(type);
    return items.slice(0, Math.max(0, limit));
  }

  async getByGenre(genre: string, page: number = 0): Promise<readonly MediaItem[]> {
    const skip = Math.max(0, page) * DEFAULT_PAGE_SIZE;
    const [movies, series] = await Promise.all([
      this.getCatalog('movie', { genre, skip }),
      this.getCatalog('series', { genre, skip }),
    ]);

    const seen = new Set<string>();
    const merged: MediaItem[] = [];
    for (const item of [...movies, ...series]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged;
  }

  async search(type: MediaType, query: string): Promise<MediaItem[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return this.getCatalog(type, { search: trimmed });
  }

  async getMeta(type: MediaType, imdbId: string): Promise<MetaDetails> {
    const path = `/meta/${type}/${encodeURIComponent(imdbId)}.json`;
    const raw = await this.getOrLoad(path, (value) => value);
    if (!isRecord(raw) || !isRecord(raw['meta'])) {
      throw new CinemetaError(`Respuesta de metadatos inválida para ${imdbId}.`);
    }

    const meta = raw['meta'];
    const item = toMediaItem(meta, type);
    if (!item) {
      throw new CinemetaError(`No se encontraron metadatos para ${imdbId}.`);
    }

    return {
      item,
      episodes: type === 'series' ? toEpisodes(meta, imdbId) : [],
    };
  }

  async getEpisodes(seriesId: string): Promise<readonly SeriesEpisode[]> {
    const details = await this.getMeta('series', seriesId);
    return details.episodes;
  }
}
