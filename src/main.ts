import './styles/tokens.css';
import './styles/main.css';
import './styles/modals.css';

import { makeEpisodeKey } from './core/domain/episode';
import type { MediaItem } from './core/domain/media';
import type { EpisodePointer } from './core/domain/progress';
import { createDefaultProviderManager } from './core/providers/provider.manager';
import type { PlaybackRequest } from './core/providers/provider.interface';
import { LocalStorageAdapter } from './core/storage/local-storage.adapter';
import type {
  CachedMediaMetadata,
  PelisStreamStorageSchemaV2,
} from './core/storage/storage.interface';
import { TasteEngine } from './core/taste/taste.engine';
import { CinemetaClient } from './services/cinemeta.client';
import { TVAction, TVPlatform } from './tv/platform';
import { SpatialNavigationEngine, type ActiveLocation, type Direction, type SpatialNode } from './tv/spatial-nav';
import { DetailsModal, type DetailsViewState } from './ui/DetailsModal';
import { HeroBanner } from './ui/HeroBanner';
import { HorizontalRail } from './ui/HorizontalRail';
import { PlayerModal } from './ui/PlayerModal';
import { el } from './ui/dom';

interface RailDefinition {
  readonly id: string;
  readonly title: string;
  readonly load: () => Promise<readonly MediaItem[]>;
}

interface RailState {
  readonly definition: RailDefinition;
  readonly view: HorizontalRail;
  nodes: readonly SpatialNode[];
  loading: boolean;
}

interface ActivePlayback {
  readonly item: MediaItem;
  readonly episode?: EpisodePointer;
}

const HERO_ACTIONS = 'hero-actions';
const DETAILS_ACTIONS = 'details-actions';
const DETAILS_SEASONS = 'details-seasons';
const DETAILS_EPISODES = 'details-episodes';
const PLAYER_ACTIONS = 'player-actions';
const TRENDING_RAIL_ID = 'trending';
const FOR_YOU_RAIL_ID = 'foryou';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('No se encontró el contenedor #app.');

while (appRoot.firstChild) appRoot.removeChild(appRoot.firstChild);

const platform = new TVPlatform();
platform.install();

const nav = new SpatialNavigationEngine();
const storage = new LocalStorageAdapter();
const cinemeta = new CinemetaClient();
const providers = createDefaultProviderManager();
const taste = new TasteEngine(storage, cinemeta);

const statusBanner = el('p', 'app-status is-hidden');
const mainView = el('main', 'app-main');
appRoot.append(mainView, statusBanner);

const providerOptions = providers.getAll().map((provider) => ({
  id: provider.id,
  name: provider.name,
}));

let statusTimer: number | null = null;
const showStatus = (message: string, isError: boolean = false): void => {
  statusBanner.textContent = message;
  statusBanner.classList.remove('is-hidden');
  statusBanner.classList.toggle('app-status--error', isError);
  if (statusTimer !== null) window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusBanner.classList.add('is-hidden');
    statusTimer = null;
  }, 5000);
};

const watchedEpisodeSet = (): Set<string> =>
  new Set(Object.keys(storage.get('watchedEpisodes')));

const rememberMetadata = (item: MediaItem): void => {
  const metadata: CachedMediaMetadata = {
    title: item.title,
    poster: item.poster,
    year: item.year,
    imdbRating: item.imdbRating,
    genres: [...item.genres],
    lastUpdated: Date.now(),
    ...(item.runtimeMinutes ? { runtimeMinutes: item.runtimeMinutes } : {}),
  };
  storage.mutate((state) => {
    state.cachedMetadata[item.id] = metadata;
  });
};

const buildDetailsState = (item: MediaItem): DetailsViewState => {
  const progress = storage.get('progress')[item.id];
  const hasEpisode = Boolean(progress?.season && progress?.episode);
  return {
    isFavorite: storage.get('favorites').includes(item.id),
    inWatchLater: storage.get('watchLater').includes(item.id),
    rating: storage.get('ratings')[item.id] ?? 0,
    progressPercent: storage.get('seenMedia')[item.id] ? 100 : 0,
    ...(hasEpisode && progress?.season && progress.episode
      ? { currentEpisode: { season: progress.season, episode: progress.episode } }
      : {}),
  };
};

const progressBadge = (item: MediaItem): number | undefined => {
  if (item.type === 'movie' && storage.get('seenMedia')[item.id]) return 100;
  return undefined;
};

const buildPlaybackRequest = (item: MediaItem, episode?: EpisodePointer): PlaybackRequest => ({
  imdbId: item.id,
  type: item.type,
  ...(episode ? { season: episode.season, episode: episode.episode } : {}),
});

/* ------------------------------- Hero ---------------------------------- */

let heroPreviewTimer: number | null = null;

const hero = new HeroBanner({
  onPlay: (item) => playMedia(item),
  onDetails: (item) => openDetails(item),
});

const previewHero = (item: MediaItem): void => {
  if (heroPreviewTimer !== null) window.clearTimeout(heroPreviewTimer);
  heroPreviewTimer = window.setTimeout(() => {
    hero.setItem(item);
    heroPreviewTimer = null;
  }, 200);
};

mainView.appendChild(hero.root);

/* ------------------------------- Rails --------------------------------- */

const railsContainer = el('div', 'rails');
mainView.appendChild(railsContainer);

let forYouReason = '';

const RAIL_DEFINITIONS: readonly RailDefinition[] = [
  {
    id: TRENDING_RAIL_ID,
    title: 'Tendencias',
    load: () => cinemeta.getTrending('movie', 18),
  },
  {
    id: 'series',
    title: 'Series populares',
    load: () => cinemeta.getTrending('series', 18),
  },
  {
    id: FOR_YOU_RAIL_ID,
    title: 'Para ti',
    load: async () => {
      const result = await taste.getForYou();
      forYouReason = result.reason;
      return result.media;
    },
  },
  {
    id: 'action',
    title: 'Acción',
    load: () => cinemeta.getByGenre('Action'),
  },
  {
    id: 'comedy',
    title: 'Comedia',
    load: () => cinemeta.getByGenre('Comedy'),
  },
  {
    id: 'scifi',
    title: 'Ciencia ficción',
    load: () => cinemeta.getByGenre('Sci-Fi'),
  },
];

const railStates: RailState[] = RAIL_DEFINITIONS.map((definition) => {
  const view = new HorizontalRail({
    id: definition.id,
    title: definition.title,
    onSelect: (item) => openDetails(item),
    onFocusItem: (item) => previewHero(item),
  });
  view.setLoading();
  railsContainer.appendChild(view.root);
  return { definition, view, nodes: [], loading: false };
});

const refreshTopology = (): void => {
  const visible = railStates.filter((state) => state.nodes.length > 0);
  const firstVisible = visible[0];

  nav.registerContainer({
    id: HERO_ACTIONS,
    type: 'horizontal-rail',
    ...(firstVisible ? { downContainerId: firstVisible.definition.id } : {}),
  });

  visible.forEach((state, index) => {
    const previous = visible[index - 1];
    const next = visible[index + 1];
    nav.registerContainer({
      id: state.definition.id,
      type: 'horizontal-rail',
      scrollElement: state.view.scrollElement,
      upContainerId: previous ? previous.definition.id : HERO_ACTIONS,
      ...(next ? { downContainerId: next.definition.id } : {}),
    });
  });
};

let initialFocusApplied = false;

const applyInitialFocus = (): void => {
  if (initialFocusApplied) return;
  initialFocusApplied = true;
  nav.focusNode(HERO_ACTIONS, 0);
};

const loadRail = async (state: RailState): Promise<void> => {
  if (state.loading) return;

  const wasActive = nav.getActiveLocation()?.containerId === state.definition.id;
  state.loading = true;
  state.view.setLoading();
  state.nodes = [];
  nav.setNodes(state.definition.id, []);
  refreshTopology();

  try {
    if (state.definition.id === FOR_YOU_RAIL_ID) forYouReason = '';

    const items = await state.definition.load();

    if (state.definition.id === FOR_YOU_RAIL_ID) {
      state.view.setSubtitle(forYouReason);
    }

    if (items.length === 0) {
      state.view.setMessage(
        state.definition.id === FOR_YOU_RAIL_ID
          ? 'Califica o marca favoritos para recibir recomendaciones.'
          : 'No hay contenido disponible en esta sección.',
      );
      state.nodes = [];
    } else {
      state.nodes = state.view.setItems(
        items.map((item) => ({
          item,
          ...(progressBadge(item) !== undefined
            ? { progressPercent: progressBadge(item) }
            : {}),
        })),
      );
      if (state.definition.id === TRENDING_RAIL_ID) {
        const featured = items.find((item) => Boolean(item.background)) ?? items[0];
        if (featured) hero.setItem(featured);
      }
    }
  } catch (error) {
    console.warn(`[Rail] No se pudo cargar ${state.definition.id}.`, error);
    state.view.setMessage('No se pudo cargar esta sección. Revisa la conexión.');
    state.nodes = [];
  } finally {
    state.loading = false;
  }

  nav.setNodes(state.definition.id, state.nodes);
  refreshTopology();

  if (wasActive && state.nodes.length === 0) {
    nav.focusNode(HERO_ACTIONS, 0);
  }

  if (
    !initialFocusApplied &&
    state.definition.id === TRENDING_RAIL_ID &&
    state.nodes.length > 0
  ) {
    applyInitialFocus();
  }
};

const forYouState = railStates.find((state) => state.definition.id === FOR_YOU_RAIL_ID);

const refreshForYouRail = (): void => {
  if (!forYouState) return;
  void loadRail(forYouState);
};

/* ------------------------------ Details -------------------------------- */

const detailsModal = new DetailsModal({
  onPlay: (item, episode) => playMedia(item, episode),
  onClose: () => closeDetails(),
  onToggleFavorite: (item) => toggleFavorite(item),
  onToggleWatchLater: (item) => toggleWatchLater(item),
  onRate: (item, rating) => rateMedia(item, rating),
  onLayoutChange: () => {
    nav.setNodes(DETAILS_SEASONS, detailsModal.getSeasonNodes());
    nav.setNodes(DETAILS_EPISODES, detailsModal.getEpisodeNodes());
  },
});

let openDetailsItem: MediaItem | null = null;
let detailsReturnFocus: ActiveLocation | null = null;
let unregisterDetailsBack: (() => void) | null = null;
let detailsRequestToken = 0;

const refreshDetailsState = (): void => {
  if (!detailsModal.isOpen || !openDetailsItem) return;
  detailsModal.setState(buildDetailsState(openDetailsItem));
  detailsModal.setWatchedEpisodes(watchedEpisodeSet());
};

const openDetails = (item: MediaItem): void => {
  if (detailsModal.isOpen) return;

  rememberMetadata(item);
  openDetailsItem = item;
  detailsReturnFocus = nav.getActiveLocation();
  detailsRequestToken += 1;
  const requestToken = detailsRequestToken;

  nav.registerContainer({
    id: DETAILS_ACTIONS,
    type: 'horizontal-rail',
    downContainerId: item.type === 'series' ? DETAILS_SEASONS : DETAILS_EPISODES,
  });
  nav.registerContainer({
    id: DETAILS_SEASONS,
    type: 'horizontal-rail',
    upContainerId: DETAILS_ACTIONS,
    downContainerId: DETAILS_EPISODES,
  });
  nav.registerContainer({
    id: DETAILS_EPISODES,
    type: 'linear-vertical',
    upContainerId: item.type === 'series' ? DETAILS_SEASONS : DETAILS_ACTIONS,
  });

  detailsModal.open(item, buildDetailsState(item), [], watchedEpisodeSet());
  nav.setNodes(DETAILS_ACTIONS, detailsModal.getActionNodes());
  nav.setNodes(DETAILS_SEASONS, detailsModal.getSeasonNodes());
  nav.setNodes(DETAILS_EPISODES, detailsModal.getEpisodeNodes());
  nav.focusNode(DETAILS_ACTIONS, 0);

  unregisterDetailsBack = platform.registerBackHandler(() => {
    closeDetails();
    return true;
  });

  if (item.type !== 'series') return;

  void cinemeta
    .getEpisodes(item.id)
    .then((episodes) => {
      if (requestToken !== detailsRequestToken || !detailsModal.isOpen) return;
      detailsModal.open(item, buildDetailsState(item), episodes, watchedEpisodeSet());
      nav.setNodes(DETAILS_ACTIONS, detailsModal.getActionNodes());
      nav.setNodes(DETAILS_SEASONS, detailsModal.getSeasonNodes());
      nav.setNodes(DETAILS_EPISODES, detailsModal.getEpisodeNodes());
      const active = nav.getActiveLocation();
      if (active?.containerId === DETAILS_ACTIONS) {
        nav.focusNode(DETAILS_ACTIONS, active.index, { force: true });
      }
    })
    .catch((error: unknown) => {
      console.warn('[Details] No se pudieron cargar los episodios.', error);
      showStatus('No se pudieron cargar los episodios de esta serie.', true);
    });
};

const closeDetails = (): void => {
  if (!detailsModal.isOpen) return;

  detailsModal.close();
  unregisterDetailsBack?.();
  unregisterDetailsBack = null;
  detailsRequestToken += 1;
  openDetailsItem = null;

  const target = detailsReturnFocus;
  detailsReturnFocus = null;
  nav.setNodes(DETAILS_EPISODES, []);
  nav.setNodes(DETAILS_SEASONS, []);

  if (target) {
    nav.focusNode(target.containerId, target.index);
  } else {
    nav.focusNode(HERO_ACTIONS, 0);
  }
};

const toggleInList = (
  state: PelisStreamStorageSchemaV2,
  key: 'favorites' | 'watchLater',
  mediaId: string,
): boolean => {
  const list = state[key];
  const index = list.indexOf(mediaId);
  if (index >= 0) {
    list.splice(index, 1);
    return false;
  }
  list.push(mediaId);
  return true;
};

const toggleFavorite = (item: MediaItem): void => {
  let added = false;
  storage.mutate((state) => {
    added = toggleInList(state, 'favorites', item.id);
  });
  showStatus(added ? 'Añadido a favoritos.' : 'Eliminado de favoritos.');
  refreshDetailsState();
  refreshForYouRail();
};

const toggleWatchLater = (item: MediaItem): void => {
  let added = false;
  storage.mutate((state) => {
    added = toggleInList(state, 'watchLater', item.id);
  });
  showStatus(added ? 'Añadido a ver después.' : 'Eliminado de ver después.');
  refreshDetailsState();
};

const rateMedia = (item: MediaItem, rating: number): void => {
  storage.mutate((state) => {
    if (rating <= 0) {
      delete state.ratings[item.id];
    } else {
      state.ratings[item.id] = Math.max(1, Math.min(5, Math.round(rating)));
    }
  });
  showStatus(rating > 0 ? `Calificación guardada: ${rating} ★` : 'Calificación eliminada.');
  refreshDetailsState();
  refreshForYouRail();
};

/* ------------------------------- Player -------------------------------- */

const playerModal = new PlayerModal(providerOptions, {
  onClose: () => closePlayer(),
  onProviderChange: (providerId) => applyProvider(providerId),
});

let activePlayback: ActivePlayback | null = null;
let playerReturnFocus: ActiveLocation | null = null;
let unregisterPlayerBack: (() => void) | null = null;

const recordPlayback = (item: MediaItem, episode?: EpisodePointer): void => {
  const timestamp = Date.now();
  storage.mutate((state) => {
    state.progress[item.id] = {
      type: item.type,
      timestamp,
      ...(episode ? { season: episode.season, episode: episode.episode } : {}),
    };
    state.seenMedia[item.id] = timestamp;
    if (item.type === 'series' && episode) {
      state.watchedEpisodes[makeEpisodeKey(item.id, episode.season, episode.episode)] = true;
    }
  });
};

const resolveStoredEpisode = (item: MediaItem): EpisodePointer | undefined => {
  const progress = storage.get('progress')[item.id];
  if (item.type !== 'series' || !progress?.season || !progress.episode) return undefined;
  return { season: progress.season, episode: progress.episode };
};

const playMedia = (item: MediaItem, episode?: EpisodePointer): void => {
  if (playerModal.isOpen) return;

  const effectiveEpisode = episode ?? resolveStoredEpisode(item);
  const request = buildPlaybackRequest(item, effectiveEpisode);

  let resolution;
  try {
    resolution = providers.resolvePlayback(storage.get('preferredServerId'), request);
  } catch (error) {
    console.warn('[Player] No hay proveedor disponible.', error);
    showStatus('No hay un servidor de video disponible para este título.', true);
    return;
  }

  rememberMetadata(item);
  recordPlayback(item, effectiveEpisode);
  refreshDetailsState();

  activePlayback = { item, ...(effectiveEpisode ? { episode: effectiveEpisode } : {}) };
  playerReturnFocus = nav.getActiveLocation();

  playerModal.open(resolution, {
    title: item.title,
    ...(effectiveEpisode
      ? { subtitle: `T${effectiveEpisode.season} E${effectiveEpisode.episode}` }
      : {}),
  });
  nav.setNodes(PLAYER_ACTIONS, playerModal.getActionNodes());
  nav.focusNode(PLAYER_ACTIONS, 0);

  unregisterPlayerBack = platform.registerBackHandler(() => {
    closePlayer();
    return true;
  });
};

const closePlayer = (): void => {
  if (!playerModal.isOpen) return;

  playerModal.close();
  unregisterPlayerBack?.();
  unregisterPlayerBack = null;
  activePlayback = null;

  const target = playerReturnFocus;
  playerReturnFocus = null;

  refreshDetailsState();

  if (target) {
    nav.focusNode(target.containerId, target.index);
  } else {
    nav.focusNode(HERO_ACTIONS, 0);
  }

  refreshForYouRail();
};

const applyProvider = (providerId: string): void => {
  const playback = activePlayback;
  if (!playback) return;

  try {
    const resolution = providers.resolvePlayback(
      providerId,
      buildPlaybackRequest(playback.item, playback.episode),
    );
    storage.set('preferredServerId', providerId);
    playerModal.setResolution(resolution);
    nav.setNodes(PLAYER_ACTIONS, playerModal.getActionNodes());
    showStatus(`Servidor: ${resolution.providerName}`);
  } catch (error) {
    console.warn('[Player] El servidor seleccionado no está disponible.', error);
    showStatus('Ese servidor no está disponible. Prueba con otro.', true);
  }
};

/* ---------------------------- Modal containers -------------------------- */

appRoot.append(detailsModal.root, playerModal.root);

nav.registerContainer({ id: HERO_ACTIONS, type: 'horizontal-rail' });
nav.registerContainer({
  id: DETAILS_ACTIONS,
  type: 'horizontal-rail',
  downContainerId: DETAILS_SEASONS,
});
nav.registerContainer({
  id: DETAILS_SEASONS,
  type: 'horizontal-rail',
  upContainerId: DETAILS_ACTIONS,
  downContainerId: DETAILS_EPISODES,
});
nav.registerContainer({
  id: DETAILS_EPISODES,
  type: 'linear-vertical',
  upContainerId: DETAILS_SEASONS,
});
nav.registerContainer({ id: PLAYER_ACTIONS, type: 'horizontal-rail' });

nav.setNodes(HERO_ACTIONS, hero.getActionNodes());
nav.setNodes(DETAILS_ACTIONS, detailsModal.getActionNodes());
nav.setNodes(PLAYER_ACTIONS, playerModal.getActionNodes());

/* ---------------------------- TV key bindings --------------------------- */

const directionBindings: ReadonlyArray<readonly [TVAction, Direction]> = [
  [TVAction.UP, 'UP'],
  [TVAction.DOWN, 'DOWN'],
  [TVAction.LEFT, 'LEFT'],
  [TVAction.RIGHT, 'RIGHT'],
];

for (const [action, direction] of directionBindings) {
  platform.registerActionHandler(action, () => {
    nav.restoreFocus();
    return nav.navigate(direction);
  });
}

platform.registerActionHandler(TVAction.ENTER, () => {
  nav.selectCurrent();
  return true;
});

window.addEventListener('focus', () => {
  nav.restoreFocus();
});

/* ------------------------------- Bootstrap ------------------------------ */

refreshTopology();

const loadAllRails = async (): Promise<void> => {
  await Promise.allSettled(railStates.map(loadRail));

  if (railStates.every((state) => state.nodes.length === 0)) {
    hero.setEmpty('No se pudo cargar el catálogo. Revisa la conexión a internet.');
    showStatus('No se pudo cargar el catálogo de PelisStream.', true);
  }

  applyInitialFocus();
};

void loadAllRails();

console.info('[PelisStream] v2 iniciado.');
