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

/** AutoEmbed: Multi-audio (Latino / Castellano / English) with permissive `frame-ancestors *`. */
export class AutoEmbedProvider implements IVideoProviderStrategy {
  readonly id = 'autoembed';
  readonly name = 'AutoEmbed (Multi / Latino)';
  readonly shortName = 'AutoEmbed';
  readonly audioHint = 'Multi · Latino';
  readonly priority = 2;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://player.autoembed.me/embed/tv/${imdbId}/${seasonOf(request)}/${episodeOf(request)}`
        : `https://player.autoembed.me/embed/movie/${imdbId}`;

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
