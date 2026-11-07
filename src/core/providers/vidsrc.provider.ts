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

/**
 * VidSrc family. Both variants share the same resolution contract and differ
 * only in their embed URL layout, so they live in one module.
 */
export class VidSrcToProvider implements IVideoProviderStrategy {
  readonly id = 'vidsrc_to';
  readonly name = 'VidSrc.to';
  readonly priority = 2;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://vidsrc.to/embed/tv/${imdbId}/${seasonOf(request)}/${episodeOf(request)}`
        : `https://vidsrc.to/embed/movie/${imdbId}`;

    return {
      providerId: this.id,
      providerName: this.name,
      embedUrl,
      sandboxFlags: SHARED_SANDBOX_FLAGS,
      allowAttributes: SHARED_ALLOW_ATTRIBUTES,
    };
  }
}

export class VidSrcMeProvider implements IVideoProviderStrategy {
  readonly id = 'vidsrc_me';
  readonly name = 'VidSrc.me';
  readonly priority = 3;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${seasonOf(request)}&episode=${episodeOf(request)}`
        : `https://vidsrc.me/embed/movie?imdb=${imdbId}`;

    return {
      providerId: this.id,
      providerName: this.name,
      embedUrl,
      sandboxFlags: SHARED_SANDBOX_FLAGS,
      allowAttributes: SHARED_ALLOW_ATTRIBUTES,
    };
  }
}
