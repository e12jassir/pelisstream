import type { MediaItem } from '../domain/media';
import type { IStorageAdapter } from '../storage/storage.interface';

/** Read port that keeps the taste engine independent from Cinemeta. */
export interface TasteMediaSource {
  getByGenre(genre: string, page?: number): Promise<readonly MediaItem[]>;
}

export interface GenreAffinity {
  readonly genre: string;
  readonly weight: number;
}

export interface RecommendationResult {
  readonly media: readonly MediaItem[];
  readonly reason: string;
}

export interface TasteStatistics {
  readonly ratedCount: number;
  readonly favoriteCount: number;
  readonly watchLaterCount: number;
  readonly watchedCount: number;
  readonly watchedEpisodes: number;
  readonly moviesWatched: number;
  readonly seriesWatched: number;
  readonly averageRating: number;
  readonly topGenres: readonly GenreAffinity[];
  readonly watchedRuntimeMinutes: number;
}

export const DEFAULT_RECOMMENDATION_LIMIT = 14;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Taste profile engine. Genre affinities are derived only from explicitly
 * stored signals (ratings, favorites and watched items), never inferred from
 * transient UI state.
 */
export class TasteEngine {
  constructor(
    private readonly storage: IStorageAdapter,
    private readonly mediaSource: TasteMediaSource,
  ) {}

  calculateGenreAffinities(): GenreAffinity[] {
    const ratings = this.storage.get('ratings');
    const seen = this.storage.get('seenMedia');
    const favorites = this.storage.get('favorites');
    const metadata = this.storage.get('cachedMetadata');
    const scores = new Map<string, number>();

    const applyWeight = (mediaId: string, delta: number): void => {
      const meta = metadata[mediaId];
      if (!meta) return;
      for (const genre of meta.genres) {
        const normalized = genre.trim();
        if (!normalized) continue;
        scores.set(normalized, (scores.get(normalized) ?? 0) + delta);
      }
    };

    for (const [mediaId, rating] of Object.entries(ratings)) {
      applyWeight(mediaId, rating - 3);
    }

    for (const mediaId of favorites) {
      applyWeight(mediaId, 1.5);
    }

    for (const mediaId of Object.keys(seen)) {
      if (!(mediaId in ratings)) applyWeight(mediaId, 0.5);
    }

    return Array.from(scores.entries())
      .filter(([, weight]) => weight > 0)
      .map(([genre, weight]) => ({ genre, weight: round2(weight) }))
      .sort((a, b) => b.weight - a.weight || a.genre.localeCompare(b.genre));
  }

  async getForYou(limit: number = DEFAULT_RECOMMENDATION_LIMIT): Promise<RecommendationResult> {
    const affinities = this.calculateGenreAffinities();
    if (affinities.length === 0) {
      return { media: [], reason: '' };
    }

    const topGenres = affinities.slice(0, 3);
    const reason = `Porque te gusta: ${topGenres.map((entry) => entry.genre).join(', ')}`;
    const batches = await Promise.all(
      topGenres.map(async (entry) => {
        try {
          return await this.mediaSource.getByGenre(entry.genre, 0);
        } catch (error) {
          console.warn(`[Taste] No se pudo obtener el género ${entry.genre}.`, error);
          return [] as readonly MediaItem[];
        }
      }),
    );

    const excluded = new Set([
      ...Object.keys(this.storage.get('seenMedia')),
      ...this.storage.get('favorites'),
    ]);

    const candidates = new Map<string, { item: MediaItem; score: number }>();
    for (const item of batches.flat()) {
      if (excluded.has(item.id) || candidates.has(item.id)) continue;

      let score = 0;
      for (const genre of item.genres) {
        const match = topGenres.find(
          (entry) => entry.genre.toLowerCase() === genre.trim().toLowerCase(),
        );
        if (match) score += match.weight;
      }
      score += (item.imdbRating || 0) / 2;
      candidates.set(item.id, { item, score });
    }

    const media = Array.from(candidates.values())
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, Math.max(0, limit))
      .map((entry) => entry.item);

    return { media, reason };
  }

  calculateStatistics(): TasteStatistics {
    const ratings = Object.values(this.storage.get('ratings'));
    const favorites = this.storage.get('favorites');
    const watchLater = this.storage.get('watchLater');
    const seen = this.storage.get('seenMedia');
    const progress = Object.values(this.storage.get('progress'));
    const metadata = this.storage.get('cachedMetadata');
    const watchedEpisodes = Object.keys(this.storage.get('watchedEpisodes'));

    const averageRating =
      ratings.length > 0 ? round2(ratings.reduce((sum, value) => sum + value, 0) / ratings.length) : 0;

    let moviesWatched = 0;
    let seriesWatched = 0;
    for (const entry of progress) {
      if (entry.type === 'movie') {
        moviesWatched += 1;
      } else {
        seriesWatched += 1;
      }
    }

    let watchedRuntimeMinutes = 0;
    for (const mediaId of Object.keys(seen)) {
      const runtime = metadata[mediaId]?.runtimeMinutes;
      if (runtime && runtime > 0) watchedRuntimeMinutes += runtime;
    }

    return {
      ratedCount: ratings.length,
      favoriteCount: favorites.length,
      watchLaterCount: watchLater.length,
      watchedCount: Object.keys(seen).length,
      watchedEpisodes: watchedEpisodes.length,
      moviesWatched,
      seriesWatched,
      averageRating,
      topGenres: this.calculateGenreAffinities().slice(0, 5),
      watchedRuntimeMinutes,
    };
  }
}
