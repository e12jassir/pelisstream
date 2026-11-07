export type PlaybackMediaType = 'movie' | 'series';

export interface PlaybackRequest {
  readonly imdbId: string;
  readonly type: PlaybackMediaType;
  readonly season?: number;
  readonly episode?: number;
}

export interface PlaybackResolution {
  readonly providerId: string;
  readonly providerName: string;
  readonly embedUrl: string;
  /** Passed verbatim to the iframe `sandbox` attribute. */
  readonly sandboxFlags: string;
  /** Passed verbatim to the iframe `allow` attribute. */
  readonly allowAttributes: string;
}

export interface IVideoProviderStrategy {
  readonly id: string;
  readonly name: string;
  /** Lower values are preferred when falling back. */
  readonly priority: number;
  canHandle(request: PlaybackRequest): boolean;
  resolve(request: PlaybackRequest): PlaybackResolution;
}

export const SHARED_SANDBOX_FLAGS = 'allow-scripts allow-same-origin allow-forms';

export const SHARED_ALLOW_ATTRIBUTES = 'fullscreen; autoplay; encrypted-media; picture-in-picture';

export const isValidPlaybackRequest = (request: PlaybackRequest): boolean =>
  request.imdbId.trim().length > 0;

export const seasonOf = (request: PlaybackRequest): number =>
  request.season && request.season > 0 ? request.season : 1;

export const episodeOf = (request: PlaybackRequest): number =>
  request.episode && request.episode > 0 ? request.episode : 1;
