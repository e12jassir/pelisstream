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

/** PlayLatin: Spanish/Latino audio selection (Alex original default server). */
export class PlayLatinProvider implements IVideoProviderStrategy {
  readonly id = 'playlatin';
  readonly name = 'Opción 1: Español Latino y Castellano (PlayLatin)';
  readonly shortName = 'Español Latino';
  readonly audioHint = 'Latino · Castellano';
  readonly priority = 1;

  canHandle(request: PlaybackRequest): boolean {
    return isValidPlaybackRequest(request);
  }

  resolve(request: PlaybackRequest): PlaybackResolution {
    const imdbId = encodeURIComponent(request.imdbId.trim());
    const embedUrl =
      request.type === 'series'
        ? `https://playlatinsrc.co/custom/serial/${imdbId}/${seasonOf(request)}/${episodeOf(request)}`
        : `https://playlatinsrc.co/movie/${imdbId}`;

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
