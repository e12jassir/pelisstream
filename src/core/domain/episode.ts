export interface SeriesEpisode {
  readonly id: string;
  readonly seriesId: string;
  readonly seasonNumber: number;
  readonly episodeNumber: number;
  readonly title: string;
  readonly releasedIso?: string;
  readonly thumbnail?: string;
  readonly overview?: string;
}

export interface EpisodeProgressKey {
  readonly seriesId: string;
  readonly season: number;
  readonly episode: number;
}

/**
 * Canonical key used by both the domain and the persisted schema. Keeping a
 * single factory prevents divergent key shapes between features.
 */
export const makeEpisodeKey = (
  seriesId: string,
  season: number,
  episode: number,
): string => `${seriesId}_s${season}_e${episode}`;

export const makeEpisodeProgressKey = (key: EpisodeProgressKey): string =>
  makeEpisodeKey(key.seriesId, key.season, key.episode);

export const formatEpisodeLabel = (season: number, episode: number): string =>
  `T${season} E${episode}`;

export const groupEpisodesBySeason = (
  episodes: readonly SeriesEpisode[],
): ReadonlyMap<number, readonly SeriesEpisode[]> => {
  const grouped = new Map<number, SeriesEpisode[]>();
  for (const episode of episodes) {
    const bucket = grouped.get(episode.seasonNumber);
    if (bucket) {
      bucket.push(episode);
    } else {
      grouped.set(episode.seasonNumber, [episode]);
    }
  }
  return grouped;
};
