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
  readonly name = 'Opción 3: Multi-Servidor (VIP Auto-Failover)';
  readonly shortName = 'Opción 3';
  readonly audioHint = 'Multi-Servidor VIP';
  readonly priority = 3;

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
      audioHint: this.audioHint,
      embedUrl,
      sandboxFlags: SHARED_SANDBOX_FLAGS,
      allowAttributes: SHARED_ALLOW_ATTRIBUTES,
    };
  }
}
