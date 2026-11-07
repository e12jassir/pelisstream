import { displayYear, formatRuntime, type MediaItem } from '../core/domain/media';
import type { SpatialNode } from '../tv/spatial-nav';
import { el, setImageSource } from './dom';

export interface HeroBannerOptions {
  readonly onPlay: (item: MediaItem) => void;
  readonly onDetails: (item: MediaItem) => void;
}

export class HeroBanner {
  readonly root: HTMLElement;

  private readonly options: HeroBannerOptions;
  private readonly backdrop: HTMLImageElement;
  private readonly titleEl: HTMLElement;
  private readonly metaEl: HTMLElement;
  private readonly synopsisEl: HTMLElement;
  private readonly reasonEl: HTMLElement;
  private readonly playButton: HTMLButtonElement;
  private readonly detailsButton: HTMLButtonElement;
  private readonly actionNodes: readonly SpatialNode[];
  private currentItem: MediaItem | null = null;

  constructor(options: HeroBannerOptions) {
    this.options = options;

    this.root = el('section', 'hero');
    this.root.setAttribute('aria-label', 'Contenido destacado');

    const media = el('div', 'hero__media');
    this.backdrop = document.createElement('img');
    this.backdrop.className = 'hero__backdrop';
    this.backdrop.alt = '';
    media.append(this.backdrop, el('div', 'hero__overlay'));

    const content = el('div', 'hero__content');
    const brand = el('p', 'hero__brand', 'PelisStream');
    this.reasonEl = el('p', 'hero__reason');
    this.reasonEl.classList.add('is-hidden');
    this.titleEl = el('h1', 'hero__title');
    this.metaEl = el('p', 'hero__meta');
    this.synopsisEl = el('p', 'hero__synopsis');

    const actions = el('div', 'hero__actions');
    this.playButton = this.createButton('Reproducir', 'hero__button hero__button--primary', () => {
      if (this.currentItem) this.options.onPlay(this.currentItem);
    });
    this.detailsButton = this.createButton('Ver detalles', 'hero__button', () => {
      if (this.currentItem) this.options.onDetails(this.currentItem);
    });
    actions.append(this.playButton, this.detailsButton);

    content.append(brand, this.reasonEl, this.titleEl, this.metaEl, this.synopsisEl, actions);
    this.root.append(media, content);

    this.actionNodes = [
      {
        id: 'hero:play',
        element: this.playButton,
        onSelect: () => {
          if (this.currentItem) this.options.onPlay(this.currentItem);
        },
      },
      {
        id: 'hero:details',
        element: this.detailsButton,
        onSelect: () => {
          if (this.currentItem) this.options.onDetails(this.currentItem);
        },
      },
    ];
  }

  private createButton(
    label: string,
    className: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = el('button', className, label);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
  }

  setItem(item: MediaItem, reason: string = ''): void {
    this.currentItem = item;
    setImageSource(this.backdrop, item.background ?? item.poster, '');
    this.titleEl.textContent = item.title;

    const metaParts = [
      displayYear(item),
      formatRuntime(item.runtimeMinutes),
      item.imdbRating > 0 ? `★ ${item.imdbRating.toFixed(1)}` : '',
      item.type === 'series' ? 'Serie' : 'Película',
    ].filter((part) => part.length > 0);
    this.metaEl.textContent = metaParts.join(' · ');
    this.synopsisEl.textContent = item.synopsis;
    this.reasonEl.textContent = reason;
    this.reasonEl.classList.toggle('is-hidden', reason.length === 0);
    this.playButton.disabled = false;
    this.detailsButton.disabled = false;
  }

  setEmpty(message: string): void {
    this.currentItem = null;
    setImageSource(this.backdrop, undefined, '');
    this.titleEl.textContent = 'PelisStream';
    this.metaEl.textContent = 'Catálogo para Smart TV';
    this.synopsisEl.textContent = message;
    this.reasonEl.textContent = '';
    this.reasonEl.classList.add('is-hidden');
    this.playButton.disabled = true;
    this.detailsButton.disabled = true;
  }

  getActionNodes(): readonly SpatialNode[] {
    return this.actionNodes;
  }
}
