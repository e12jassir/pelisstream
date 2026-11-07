/**
 * PelisStream v2 - Data Models and Type Definitions
 * Tailored for Smart TV 10-Foot UI architecture.
 */

export type ContentType = 'movie' | 'series';

export interface ServerSource {
  id: string;
  name: string;
  language: 'Latino' | 'Castellano' | 'Subtitulado' | 'Inglés';
  quality: '4K' | '1080p' | '720p';
  url: string;
  isVip?: boolean;
}

export interface Episode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  synopsis: string;
  duration: string;
  thumbnailUrl: string;
  sources: ServerSource[];
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  originalTitle?: string;
  year: number;
  duration?: string;              // e.g. "2h 46m"
  ratingImdb: number;             // e.g. 8.6
  genres: string[];               // e.g. ["Ciencia Ficción", "Aventura"]
  quality: '4K' | 'HD';
  audio: string[];                // e.g. ["Latino", "Castellano", "Sub"]
  ageRating: string;              // e.g. "+16", "ATP"
  posterUrl: string;              // Vertical 2:3 aspect ratio
  backdropUrl: string;            // Horizontal 16:9 cinematic still
  synopsis: string;
  director?: string;
  cast?: string[];
  sources?: ServerSource[];       // For movies
  seasons?: Season[];             // For series
  progress?: {                    // For "Continuar viendo"
    percentage: number;
    seasonNumber?: number;
    episodeNumber?: number;
    remainingTime?: string;
  };
}

export interface RailCategory {
  id: string;
  title: string;
  icon?: string;
  countLabel?: string;
  items: ContentItem[];
}
