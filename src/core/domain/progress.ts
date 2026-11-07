import type { MediaItem, MediaType } from './media';

export interface EpisodePointer {
  readonly season: number;
  readonly episode: number;
}

export interface WatchProgress {
  readonly mediaId: string;
  readonly type: MediaType;
  readonly lastWatchedTimestamp: number;
  readonly currentPositionSeconds: number;
  readonly durationSeconds: number;
  readonly completed: boolean;
  readonly lastEpisode?: EpisodePointer;
}

export const createWatchProgress = (
  item: MediaItem,
  options: {
    readonly timestamp?: number;
    readonly positionSeconds?: number;
    readonly durationSeconds?: number;
    readonly completed?: boolean;
    readonly lastEpisode?: EpisodePointer;
  } = {},
): WatchProgress => ({
  mediaId: item.id,
  type: item.type,
  lastWatchedTimestamp: options.timestamp ?? Date.now(),
  currentPositionSeconds: options.positionSeconds ?? 0,
  durationSeconds: options.durationSeconds ?? 0,
  completed: options.completed ?? false,
  ...(options.lastEpisode ? { lastEpisode: options.lastEpisode } : {}),
});

export const progressPercent = (progress: WatchProgress | undefined): number => {
  if (!progress) return 0;
  if (progress.completed) return 100;
  if (progress.durationSeconds <= 0) return 0;
  const ratio = progress.currentPositionSeconds / progress.durationSeconds;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
};

export const isResumable = (progress: WatchProgress | undefined): boolean =>
  Boolean(
    progress &&
      !progress.completed &&
      progress.currentPositionSeconds > 30 &&
      progress.durationSeconds > 0,
  );
