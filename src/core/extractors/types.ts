export interface SubtitleTrack {
  url: string;
  label: string;
  lang: string;
  default?: boolean;
}

export interface DirectStreamResult {
  streamUrl: string;
  subtitles: SubtitleTrack[];
  headers?: Record<string, string>;
  serverName: string;
}

export interface AnimeSearchResult {
  id: string;
  title: string;
  poster?: string;
}

export interface AnimeEpisode {
  id: string;
  number: string | number;
  title?: string;
}

export interface MovieStreamRequest {
  imdbId?: string;
  tmdbId?: string | number;
  type?: 'movie' | 'series';
  season?: number;
  episode?: number;
  title?: string;
  year?: number | string;
}

export interface MovieSearchResult {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year?: string;
  poster?: string;
}
