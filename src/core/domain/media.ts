/**
 * Core media entities. Movies and series are modelled as a discriminated
 * union so the compiler rejects cross-type access at the domain boundary.
 */
export type MediaType = 'movie' | 'series';

export type StreamingPlatformId = 'nfx' | 'hbm' | 'atp' | 'dnp' | 'amp';

export interface BaseMediaItem {
  /** IMDb identifier, e.g. `tt0111161`. */
  readonly id: string;
  readonly type: MediaType;
  readonly title: string;
  readonly poster: string;
  readonly background?: string;
  readonly logo?: string;
  readonly year: number | string;
  readonly imdbRating: number;
  readonly genres: readonly string[];
  readonly synopsis: string;
  readonly runtimeMinutes?: number;
  readonly cast?: readonly string[];
  readonly director?: readonly string[];
  readonly awards?: string;
  readonly trailerYtId?: string;
  readonly platformHub?: StreamingPlatformId;
}

export interface MovieItem extends BaseMediaItem {
  readonly type: 'movie';
}

export interface SeriesItem extends BaseMediaItem {
  readonly type: 'series';
  readonly totalSeasons?: number;
}

export type MediaItem = MovieItem | SeriesItem;

export const isMovie = (item: MediaItem): item is MovieItem => item.type === 'movie';

export const isSeries = (item: MediaItem): item is SeriesItem => item.type === 'series';

/** Extracts the four-digit year from values such as `1994–2004`. */
export const displayYear = (item: MediaItem): string => {
  const value = typeof item.year === 'number' ? String(item.year) : item.year;
  const match = /^\d{4}/.exec(value.trim());
  return match?.[0] ?? value.trim();
};

export const formatRuntime = (minutes: number | undefined): string => {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
};

export const deriveMaturityRating = (item: MediaItem): string => {
  const genres = item.genres.join(' ');
  if (/Horror|Crime|Thriller/i.test(genres)) return '16+';
  if (/Animation|Family/i.test(genres)) return '7+';
  if (/Action|Sci-Fi|Drama/i.test(genres)) return '13+';
  return '13+';
};

export const PLATFORM_NAMES: Record<StreamingPlatformId, string> = {
  nfx: 'NETFLIX',
  hbm: 'HBO MAX',
  atp: 'APPLE TV+',
  dnp: 'DISNEY+',
  amp: 'PRIME VIDEO',
};

export const mediaLabel = (item: MediaItem): string => `${item.title} (${displayYear(item)})`;
