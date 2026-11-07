import {
  SHARED_ALLOW_ATTRIBUTES,
  SHARED_SANDBOX_FLAGS,
  episodeOf,
  isValidPlaybackRequest,
  seasonOf,
  type IVideoProviderStrategy,
  type PlaybackRequest,
  type PlaybackResolution,
} from './provider.interface';

export class MultiEmbedProvider implements IVideoProviderStrategy {
  readonly id = 'multiembed';
  readonly name = 'MultiEmbed';
  readonly priority = 4;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://multiembed.mov/?video_id=${imdbId}&s=${seasonOf(request)}&e=${episodeOf(request)}`
        : `https://multiembed.mov/?video_id=${imdbId}`;

    return {
      providerId: this.id,
      providerName: this.name,
      embedUrl,
      sandboxFlags: SHARED_SANDBOX_FLAGS,
      allowAttributes: SHARED_ALLOW_ATTRIBUTES,
    };
  }
}
