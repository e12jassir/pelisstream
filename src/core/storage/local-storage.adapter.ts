import { migrateFromLegacyStorage } from './legacy-migration';
import {
  CURRENT_STORAGE_VERSION,
  createDefaultState,
  hydrateState,
  type IStorageAdapter,
  type PelisStreamStorageSchemaV2,
  type StorageKey,
} from './storage.interface';

const DEFAULT_STORAGE_KEY = 'pelisstream_db_v2';

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Listener = (state: PelisStreamStorageSchemaV2) => void;

const resolveBackend = (): KeyValueStore | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__pelisstream_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
};

const isVersionedV2 = (value: unknown): value is PelisStreamStorageSchemaV2 => {
  if (typeof value !== 'object' || value === null) return false;
  return (value as { version?: unknown }).version === CURRENT_STORAGE_VERSION;
};

const cloneState = (state: PelisStreamStorageSchemaV2): PelisStreamStorageSchemaV2 => {
  try {
    return JSON.parse(JSON.stringify(state)) as PelisStreamStorageSchemaV2;
  } catch (error) {
    console.warn('[Storage] No se pudo clonar el estado; se reconstruye desde el esquema.', error);
    return hydrateState(state);
  }
};

/**
 * Versioned, defensive localStorage adapter. When the TV browser refuses
 * storage access (private mode, quota, corrupted payload) it degrades to an
 * in-memory store instead of throwing into the UI layer.
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private state: PelisStreamStorageSchemaV2;
  private readonly listeners = new Set<Listener>();
  private readonly backend: KeyValueStore | null;
  private readonly storageKey: string;

  constructor(storageKey: string = DEFAULT_STORAGE_KEY) {
    this.storageKey = storageKey;
    this.backend = resolveBackend();
    this.state = this.load();
  }

  get isPersistent(): boolean {
    return this.backend !== null;
  }

  private load(): PelisStreamStorageSchemaV2 {
    if (!this.backend) return createDefaultState();

    try {
      const raw = this.backend.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isVersionedV2(parsed)) {
          return hydrateState(parsed);
        }
      }

      const legacy = migrateFromLegacyStorage((key) => this.backend?.getItem(key) ?? null);
      if (legacy.migrated) {
        this.persist(legacy.state);
        return legacy.state;
      }
    } catch (error) {
      console.warn('[Storage] Estado persistido ilegible; se inicia un estado limpio.', error);
    }

    return createDefaultState();
  }

  private persist(state: PelisStreamStorageSchemaV2): void {
    if (!this.backend) return;
    try {
      this.backend.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('[Storage] Fallo de cuota o restricción de escritura en localStorage.', error);
    }
  }

  private notify(): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(this.state);
      } catch (error) {
        console.warn('[Storage] Un suscriptor falló al recibir el estado.', error);
      }
    }
  }

  get<K extends StorageKey>(key: K): PelisStreamStorageSchemaV2[K] {
    return this.state[key];
  }

  set<K extends StorageKey>(key: K, value: PelisStreamStorageSchemaV2[K]): void {
    this.state[key] = value;
    this.persist(this.state);
    this.notify();
  }

  mutate(mutator: (draft: PelisStreamStorageSchemaV2) => void): void {
    const draft = cloneState(this.state);
    mutator(draft);
    this.state = draft;
    this.persist(this.state);
    this.notify();
  }

  snapshot(): PelisStreamStorageSchemaV2 {
    return cloneState(this.state);
  }

  clear(): void {
    this.state = createDefaultState();
    this.persist(this.state);
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
