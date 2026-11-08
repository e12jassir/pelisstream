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
 * VidSrc.pm: Ultra-fast Vidstack HLS player, direct stream loading,
 * multi-audio and multilingual subtitle tracks.
 */
export class VidSrcPmProvider implements IVideoProviderStrategy {
  readonly id = 'vidsrc_pm';
  readonly name = 'Opción 1: Ultra Rápido (HD · Multi-Audio)';
  readonly shortName = 'Opción 1';
  readonly audioHint = 'Ultra HD · Multi';
  readonly priority = 1;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://vidsrc.pm/embed/tv/${imdbId}/${seasonOf(request)}/${episodeOf(request)}`
        : `https://vidsrc.pm/embed/movie/${imdbId}`;

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

/**
 * VidSrc family. `VidSrcMeProvider` points directly to `vidsrc.sh` to avoid
 * an unnecessary HTTP 301 redirect (~250ms saved).
 */
export class VidSrcMeProvider implements IVideoProviderStrategy {
  readonly id = 'vidsrc_me';
  readonly name = 'Opción 2: Directo (HD · Subtitulado)';
  readonly shortName = 'Opción 2';
  readonly audioHint = 'Directo · Sub';
  readonly priority = 2;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://vidsrc.sh/embed/tv/${imdbId}/${seasonOf(request)}/${episodeOf(request)}`
        : `https://vidsrc.sh/embed/movie/${imdbId}`;

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

export class VidSrcToProvider implements IVideoProviderStrategy {
  readonly id = 'vidsrc_to';
  readonly name = 'Opción 6: Espejo Secundario';
  readonly shortName = 'Opción 6';
  readonly audioHint = 'HD Mirror';
  readonly priority = 6;

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
      audioHint: this.audioHint,
      embedUrl,
      sandboxFlags: SHARED_SANDBOX_FLAGS,
      allowAttributes: SHARED_ALLOW_ATTRIBUTES,
    };
  }
}
