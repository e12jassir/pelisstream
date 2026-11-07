import { MultiEmbedProvider } from './multiembed.provider';
import { PlayLatinProvider } from './playlatin.provider';
import type {
  IVideoProviderStrategy,
  PlaybackRequest,
  PlaybackResolution,
} from './provider.interface';
import { VidSrcMeProvider, VidSrcToProvider } from './vidsrc.provider';

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Strategy registry. Consumers never build provider URLs directly; they ask
 * the manager, which applies priority and fallback consistently.
 */
export class VideoProviderManager {
  private readonly strategies = new Map<string, IVideoProviderStrategy>();

  constructor(strategies: readonly IVideoProviderStrategy[] = []) {
    for (const strategy of strategies) {
      this.register(strategy);
    }
  }

  register(strategy: IVideoProviderStrategy): void {
    if (this.strategies.has(strategy.id)) {
      throw new Error(`Proveedor de video duplicado: ${strategy.id}`);
    }
    this.strategies.set(strategy.id, strategy);
  }

  getAll(): IVideoProviderStrategy[] {
    return Array.from(this.strategies.values()).sort(
      (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
    );
  }

  get(providerId: string): IVideoProviderStrategy | undefined {
    return this.strategies.get(providerId);
  }

  getDefault(): IVideoProviderStrategy | undefined {
    return this.getAll()[0];
  }

  resolvePlayback(
    preferredProviderId: string | undefined,
    request: PlaybackRequest,
  ): PlaybackResolution {
    const preferred = preferredProviderId ? this.strategies.get(preferredProviderId) : undefined;
    const candidates: IVideoProviderStrategy[] = [];
    if (preferred) candidates.push(preferred);
    for (const strategy of this.getAll()) {
      if (strategy !== preferred) candidates.push(strategy);
    }

    for (const strategy of candidates) {
      if (strategy.canHandle(request)) {
        return strategy.resolve(request);
      }
    }

    throw new ProviderUnavailableError(
      `No hay un proveedor de video disponible para ${request.imdbId}.`,
    );
  }
}

export const createDefaultProviderManager = (): VideoProviderManager =>
  new VideoProviderManager([
    new PlayLatinProvider(),
    new VidSrcToProvider(),
    new VidSrcMeProvider(),
    new MultiEmbedProvider(),
  ]);
