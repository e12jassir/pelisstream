import type { EpisodePointer } from '../core/domain/progress';
import type { SeriesEpisode } from '../core/domain/episode';
import { formatEpisodeLabel, groupEpisodesBySeason } from '../core/domain/episode';
import type { MediaItem } from '../core/domain/media';
import { displayYear, formatRuntime } from '../core/domain/media';
import type { SpatialNode } from '../tv/spatial-nav';
import { clearChildren, el, setImageSource } from './dom';

export interface DetailsViewState {
  readonly isFavorite: boolean;
  readonly inWatchLater: boolean;
  readonly rating: number;
  readonly progressPercent: number;
  readonly currentEpisode?: EpisodePointer;
}

export interface DetailsModalCallbacks {
  readonly onPlay: (item: MediaItem, episode?: EpisodePointer) => void;
  readonly onClose: () => void;
  readonly onToggleFavorite: (item: MediaItem) => void;
  readonly onToggleWatchLater: (item: MediaItem) => void;
  readonly onRate: (item: MediaItem, rating: number) => void;
  /** Fired after the episode/season DOM was rebuilt. */
  readonly onLayoutChange?: () => void;
}

export class DetailsModal {
  readonly root: HTMLElement;

  private readonly callbacks: DetailsModalCallbacks;
  private readonly panel: HTMLElement;
  private readonly posterEl: HTMLImageElement;
  private readonly titleEl: HTMLElement;
  private readonly metaEl: HTMLElement;
  private readonly genresEl: HTMLElement;
  private readonly synopsisEl: HTMLElement;
  private readonly episodesSection: HTMLElement;
  private readonly seasonsEl: HTMLElement;
  private readonly episodeListEl: HTMLElement;
  private readonly episodesEmptyEl: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly playButton: HTMLButtonElement;
  private readonly favoriteButton: HTMLButtonElement;
  private readonly watchLaterButton: HTMLButtonElement;
  private readonly ratingButtons: HTMLButtonElement[] = [];
  private readonly seasonButtons = new Map<number, HTMLButtonElement>();
  private readonly episodeButtons: HTMLButtonElement[] = [];
  private readonly episodesBySeason = new Map<number, SeriesEpisode[]>();

  private watchedEpisodeIds = new Set<string>();
  private currentSeasonEpisodes: SeriesEpisode[] = [];
  private currentItem: MediaItem | null = null;
  private currentState: DetailsViewState | null = null;
  private startEpisode: EpisodePointer | undefined;
  private selectedSeason = 1;
  private isOpenFlag = false;

  constructor(callbacks: DetailsModalCallbacks) {
    this.callbacks = callbacks;

    this.root = el('div', 'modal modal--details');
    this.root.setAttribute('aria-hidden', 'true');

    this.panel = el('div', 'modal__panel details');
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-labelledby', 'details-title');

    const topbar = el('div', 'modal__topbar');
    this.closeButton = el('button', 'modal__close', 'Cerrar');
    this.closeButton.type = 'button';
    this.closeButton.setAttribute('aria-label', 'Cerrar detalles');
    this.closeButton.addEventListener('click', () => this.callbacks.onClose());
    topbar.appendChild(this.closeButton);

    const body = el('div', 'details__body');
    const posterWrap = el('div', 'details__poster-wrap');
    this.posterEl = document.createElement('img');
    this.posterEl.className = 'details__poster';
    this.posterEl.alt = '';
    posterWrap.appendChild(this.posterEl);

    const info = el('div', 'details__info');
    this.titleEl = el('h2', 'details__title');
    this.titleEl.id = 'details-title';
    this.metaEl = el('p', 'details__meta');
    this.genresEl = el('div', 'details__genres');
    this.synopsisEl = el('p', 'details__synopsis');

    const actions = el('div', 'details__actions');
    this.playButton = this.createButton('Reproducir', 'details__action details__action--primary');
    this.favoriteButton = this.createButton('☆ Favorito', 'details__action');
    this.watchLaterButton = this.createButton('Ver después', 'details__action');

    this.playButton.addEventListener('click', () => {
      if (this.currentItem) this.callbacks.onPlay(this.currentItem, this.startEpisode);
    });
    this.favoriteButton.addEventListener('click', () => {
      if (this.currentItem) this.callbacks.onToggleFavorite(this.currentItem);
    });
    this.watchLaterButton.addEventListener('click', () => {
      if (this.currentItem) this.callbacks.onToggleWatchLater(this.currentItem);
    });

    actions.append(this.playButton, this.favoriteButton, this.watchLaterButton);

    for (let star = 1; star <= 5; star += 1) {
      const button = el('button', 'details__rating', '★');
      button.type = 'button';
      button.setAttribute('aria-label', `Calificar con ${star} estrella${star === 1 ? '' : 's'}`);
      button.addEventListener('click', () => this.handleRate(star));
      this.ratingButtons.push(button);
      actions.appendChild(button);
    }

    info.append(this.titleEl, this.metaEl, this.genresEl, this.synopsisEl, actions);
    body.append(posterWrap, info);

    this.episodesSection = el('section', 'details__episodes');
    this.episodesSection.appendChild(el('h3', 'details__section-title', 'Episodios'));
    this.seasonsEl = el('div', 'details__seasons');
    this.episodesEmptyEl = el('p', 'details__episodes-empty', 'Sin episodios disponibles.');
    this.episodesEmptyEl.classList.add('is-hidden');
    this.episodeListEl = el('div', 'details__episode-list');
    this.episodesSection.append(this.seasonsEl, this.episodesEmptyEl, this.episodeListEl);

    this.panel.append(topbar, body, this.episodesSection);
    this.root.appendChild(this.panel);
  }

  get isOpen(): boolean {
    return this.isOpenFlag;
  }

  private createButton(label: string, className: string): HTMLButtonElement {
    const button = el('button', className, label);
    button.type = 'button';
    return button;
  }

  open(
    item: MediaItem,
    state: DetailsViewState,
    episodes: readonly SeriesEpisode[],
    watchedEpisodeIds: ReadonlySet<string>,
  ): void {
    this.currentItem = item;
    this.currentState = state;
    this.watchedEpisodeIds = new Set(watchedEpisodeIds);

    this.episodesBySeason.clear();
    for (const [season, list] of groupEpisodesBySeason(episodes)) {
      this.episodesBySeason.set(season, [...list]);
    }

    this.selectedSeason = state.currentEpisode?.season ?? this.firstSeason() ?? 1;
    this.startEpisode = state.currentEpisode ?? this.firstEpisodeOf(this.selectedSeason);

    this.renderHeader(item);
    this.applyState();
    this.renderSeasons();
    this.renderEpisodes();

    this.panel.scrollTop = 0;
    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    this.isOpenFlag = true;
  }

  close(): void {
    this.isOpenFlag = false;
    this.currentItem = null;
    this.currentState = null;
    this.startEpisode = undefined;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
  }

  setState(state: DetailsViewState): void {
    this.currentState = state;
    if (!this.startEpisode) {
      this.startEpisode = state.currentEpisode ?? this.firstEpisodeOf(this.selectedSeason);
    }
    this.applyState();
  }

  setWatchedEpisodes(watchedEpisodeIds: ReadonlySet<string>): void {
    this.watchedEpisodeIds = new Set(watchedEpisodeIds);
    this.applyWatchedClasses();
  }

  getActionNodes(): readonly SpatialNode[] {
    const nodes: SpatialNode[] = [
      {
        id: 'details:close',
        element: this.closeButton,
        onSelect: () => this.callbacks.onClose(),
      },
      {
        id: 'details:play',
        element: this.playButton,
        onSelect: () => {
          if (this.currentItem) this.callbacks.onPlay(this.currentItem, this.startEpisode);
        },
      },
      {
        id: 'details:favorite',
        element: this.favoriteButton,
        onSelect: () => {
          if (this.currentItem) this.callbacks.onToggleFavorite(this.currentItem);
        },
      },
      {
        id: 'details:watch-later',
        element: this.watchLaterButton,
        onSelect: () => {
          if (this.currentItem) this.callbacks.onToggleWatchLater(this.currentItem);
        },
      },
    ];

    this.ratingButtons.forEach((button, index) => {
      nodes.push({
        id: `details:rate-${index + 1}`,
        element: button,
        onSelect: () => this.handleRate(index + 1),
      });
    });

    return nodes;
  }

  getSeasonNodes(): readonly SpatialNode[] {
    return Array.from(this.seasonButtons.entries())
      .sort(([a], [b]) => a - b)
      .map(([season, element]) => ({
        id: `details:season-${season}`,
        element,
        onSelect: () => this.selectSeason(season),
      }));
  }

  getEpisodeNodes(): readonly SpatialNode[] {
    const nodes: SpatialNode[] = [];
    this.currentSeasonEpisodes.forEach((episode, index) => {
      const element = this.episodeButtons[index];
      if (element) {
        nodes.push({
          id: `details:episode-${episode.id}`,
          element,
          onSelect: () => this.playEpisode(episode),
        });
      }
    });
    return nodes;
  }

  private renderHeader(item: MediaItem): void {
    setImageSource(this.posterEl, item.poster, item.title);
    this.titleEl.textContent = item.title;
    this.metaEl.textContent = [
      displayYear(item),
      formatRuntime(item.runtimeMinutes),
      item.imdbRating > 0 ? `★ ${item.imdbRating.toFixed(1)}` : '',
      item.type === 'series' ? `${item.totalSeasons ?? 0} temporadas` : 'Película',
    ]
      .filter((part) => part.length > 0)
      .join(' · ');

    clearChildren(this.genresEl);
    for (const genre of item.genres) {
      this.genresEl.appendChild(el('span', 'details__genre', genre));
    }
    this.genresEl.classList.toggle('is-hidden', item.genres.length === 0);
    this.synopsisEl.textContent = item.synopsis || 'Sin sinopsis disponible.';

    const isSeries = item.type === 'series';
    this.episodesSection.classList.toggle('is-hidden', !isSeries);
  }

  private applyState(): void {
    const state = this.currentState;
    const item = this.currentItem;
    if (!state || !item) return;

    if (item.type === 'series' && this.startEpisode) {
      this.playButton.textContent = `Reproducir ${formatEpisodeLabel(
        this.startEpisode.season,
        this.startEpisode.episode,
      )}`;
    } else {
      this.playButton.textContent = 'Reproducir';
    }

    this.favoriteButton.textContent = state.isFavorite ? '★ Favorito' : '☆ Favorito';
    this.favoriteButton.classList.toggle('is-active', state.isFavorite);
    this.favoriteButton.setAttribute('aria-pressed', String(state.isFavorite));

    this.watchLaterButton.textContent = state.inWatchLater ? '✓ En ver después' : 'Ver después';
    this.watchLaterButton.classList.toggle('is-active', state.inWatchLater);
    this.watchLaterButton.setAttribute('aria-pressed', String(state.inWatchLater));

    this.ratingButtons.forEach((button, index) => {
      const active = index + 1 <= state.rating;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(index + 1 === state.rating));
    });
  }

  private renderSeasons(): void {
    clearChildren(this.seasonsEl);
    this.seasonButtons.clear();

    const seasons = Array.from(this.episodesBySeason.keys()).sort((a, b) => a - b);
    this.seasonsEl.classList.toggle('is-hidden', seasons.length === 0);

    for (const season of seasons) {
      const button = el('button', 'details__season', `Temporada ${season}`);
      button.type = 'button';
      const active = season === this.selectedSeason;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => this.selectSeason(season));
      this.seasonButtons.set(season, button);
      this.seasonsEl.appendChild(button);
    }
  }

  private selectSeason(season: number): void {
    if (!this.episodesBySeason.has(season)) return;
    this.selectedSeason = season;
    this.startEpisode = this.firstEpisodeOf(season) ?? this.startEpisode;
    this.renderSeasons();
    this.renderEpisodes();
    this.applyState();
    this.callbacks.onLayoutChange?.();
  }

  private renderEpisodes(): void {
    clearChildren(this.episodeListEl);
    this.episodeButtons.length = 0;
    this.currentSeasonEpisodes = [...(this.episodesBySeason.get(this.selectedSeason) ?? [])];

    const hasEpisodes = this.currentSeasonEpisodes.length > 0;
    this.episodesEmptyEl.classList.toggle('is-hidden', hasEpisodes);
    this.episodeListEl.classList.toggle('is-hidden', !hasEpisodes);

    for (const episode of this.currentSeasonEpisodes) {
      const button = el('button', 'details__episode');
      button.type = 'button';
      button.setAttribute(
        'aria-label',
        `${formatEpisodeLabel(episode.seasonNumber, episode.episodeNumber)}: ${episode.title}`,
      );

      const number = el(
        'span',
        'details__episode-number',
        formatEpisodeLabel(episode.seasonNumber, episode.episodeNumber),
      );
      const text = el('span', 'details__episode-text');
      text.appendChild(el('span', 'details__episode-title', episode.title));
      if (episode.overview) {
        text.appendChild(el('span', 'details__episode-overview', episode.overview));
      }
      const check = el('span', 'details__episode-check', '✓');

      button.append(number, text, check);
      button.addEventListener('click', () => this.playEpisode(episode));

      this.episodeListEl.appendChild(button);
      this.episodeButtons.push(button);
    }

    this.applyWatchedClasses();
  }

  private applyWatchedClasses(): void {
    this.currentSeasonEpisodes.forEach((episode, index) => {
      const button = this.episodeButtons[index];
      if (!button) return;
      button.classList.toggle(
        'details__episode--watched',
        this.watchedEpisodeIds.has(episode.id),
      );
    });
  }

  private playEpisode(episode: SeriesEpisode): void {
    if (!this.currentItem) return;
    this.callbacks.onPlay(this.currentItem, {
      season: episode.seasonNumber,
      episode: episode.episodeNumber,
    });
  }

  private handleRate(star: number): void {
    const item = this.currentItem;
    const state = this.currentState;
    if (!item || !state) return;
    this.callbacks.onRate(item, state.rating === star ? 0 : star);
  }

  private firstSeason(): number | undefined {
    return Array.from(this.episodesBySeason.keys()).sort((a, b) => a - b)[0];
  }

  private firstEpisodeOf(season: number): EpisodePointer | undefined {
    const episode = this.episodesBySeason.get(season)?.[0];
    if (!episode) return undefined;
    return { season: episode.seasonNumber, episode: episode.episodeNumber };
  }
}
