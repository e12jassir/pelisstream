import { ProviderCircuitBreaker, type CircuitState } from './circuit-breaker';
import { PlayLatinProvider } from './playlatin.provider';
import type {
  IVideoProviderStrategy,
  PlaybackRequest,
  PlaybackResolution,
} from './provider.interface';
import { TwoEmbedProvider } from './twoembed.provider';
import { VidSrcMeProvider, VidSrcPmProvider, VidSrcToProvider } from './vidsrc.provider';

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Resilient Strategy Registry with per-provider Circuit Breakers.
 * Consumers never build provider URLs directly; they ask the manager,
 * which applies priority and circuit-breaker health consistently.
 */
export class VideoProviderManager {
  private readonly strategies = new Map<string, IVideoProviderStrategy>();
  private readonly breakers = new Map<string, ProviderCircuitBreaker>();

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
    this.breakers.set(strategy.id, new ProviderCircuitBreaker(strategy.id));
  }

  getAll(): IVideoProviderStrategy[] {
    return Array.from(this.strategies.values()).sort(
      (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
    );
  }

  getAvailable(): IVideoProviderStrategy[] {
    const all = this.getAll();
    const healthy = all.filter((s) => this.breakers.get(s.id)?.isAvailable() ?? true);
    return healthy.length > 0 ? healthy : all;
  }

  get(id: string): IVideoProviderStrategy | undefined {
    return this.strategies.get(id);
  }

  getDefault(): IVideoProviderStrategy {
    return this.getAvailable()[0] ?? this.getAll()[0];
  }

  getCircuitState(providerId: string): CircuitState {
    return this.breakers.get(providerId)?.getState() ?? 'CLOSED';
  }

  reportSuccess(providerId: string): void {
    this.breakers.get(providerId)?.recordSuccess();
  }

  reportFailure(providerId: string): void {
    this.breakers.get(providerId)?.recordFailure();
  }

  getNextProviderId(currentProviderId: string): string {
    const available = this.getAvailable();
    const all = available.length > 1 ? available : this.getAll();
    const idx = all.findIndex((s) => s.id === currentProviderId);
    const next = all[(idx + 1) % all.length];
    return next ? next.id : currentProviderId;
  }

  resolvePlayback(
    preferredProviderId: string | undefined,
    request: PlaybackRequest,
  ): PlaybackResolution {
    const available = this.getAvailable();
    const all = this.getAll();
    const candidates: IVideoProviderStrategy[] = [];

    // Prioritize preferred provider only if it is currently healthy
    if (preferredProviderId) {
      const preferred = available.find((s) => s.id === preferredProviderId);
      if (preferred) {
        candidates.push(preferred);
      }
    }

    // Add remaining healthy strategies in priority order
    for (const strategy of available) {
      if (!candidates.includes(strategy)) {
        candidates.push(strategy);
      }
    }

    // Add remaining strategies as last resort (e.g., if all are circuit-broken)
    for (const strategy of all) {
      if (!candidates.includes(strategy)) {
        candidates.push(strategy);
      }
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
    new VidSrcPmProvider(),
    new PlayLatinProvider(),
    new TwoEmbedProvider(),
    new VidSrcMeProvider(),
    new VidSrcToProvider(),
  ]);

export const defaultProviderManager = createDefaultProviderManager();
