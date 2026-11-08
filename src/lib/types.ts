export type PlatformId = "nfx" | "hbm" | "dnp" | "atp" | "amp";

export type MediaType = "movie" | "series";

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  poster: string;
  background: string;
  logo: string;
  year: string;
  releaseInfo: string;
  released?: string;
  imdbRating: number;
  genres: string[];
  synopsis: string;
  runtimeMinutes?: number;
  cast: string[];
  director: string[];
  writer: string[];
  awards?: string;
  country?: string;
  trailers: string[];
  totalSeasons?: number;
  /** Streaming platform the title was sourced from, when known. */
  source?: PlatformId;
}

export interface Episode {
  id: string;
  season: number;
  episode: number;
  title: string;
  overview?: string;
  thumbnail?: string;
  released?: string;
}

export interface MetaDetails {
  item: MediaItem;
  episodes: Episode[];
}

export type Rating = "down" | "up" | "love";

export interface EpisodePointer {
  season: number;
  episode: number;
}

export interface ProgressEntry {
  type: MediaType;
  updatedAt: number;
  position: number;
  duration: number;
  completed: boolean;
  season?: number;
  episode?: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: number;
  kids: boolean;
  pin?: string;
}

export type PlayerMode = "stream" | "trailer";

export interface ProfileSettings {
  autoplayPreviews: boolean;
  previewSound: boolean;
  autoplayNext: boolean;
  heroAutoAdvance: boolean;
  reduceMotion: boolean;
  subtitles: "off" | "es" | "en";
  playbackRate: number;
  preferredProvider: string;
  theme: import("./themes").ThemeId;
}

export interface ProfileData {
  list: string[];
  ratings: Record<string, Rating>;
  progress: Record<string, ProgressEntry>;
  history: Record<string, number>;
  reminders: string[];
  recentSearches: string[];
  watchedEpisodes: Record<string, true>;
  meta: Record<string, MediaItem>;
  settings: ProfileSettings;
}

export const episodeKey = (seriesId: string, season: number, episode: number) =>
  `${seriesId}_s${season}_e${episode}`;
