import type { MediaItem } from '../core/domain/media';
import type { SpatialNode } from '../tv/spatial-nav';
import { clearChildren, el } from './dom';
import { MovieCard } from './MovieCard';

export interface RailItem {
  readonly item: MediaItem;
  readonly progressPercent?: number;
}

export interface HorizontalRailOptions {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly onSelect: (item: MediaItem) => void;
  readonly onFocusItem?: (item: MediaItem) => void;
}

/**
 * Horizontal TV rail. Cards are appended once per catalog load; the spatial
 * engine handles scrolling without querying the DOM on every key press.
 */
export class HorizontalRail {
  readonly id: string;
  readonly root: HTMLElement;
  readonly track: HTMLElement;

  private readonly options: HorizontalRailOptions;
  private readonly subtitleEl: HTMLElement;
  private nodes: SpatialNode[] = [];

  constructor(options: HorizontalRailOptions) {
    this.options = options;
    this.id = options.id;

    this.root = el('section', 'rail');
    this.root.dataset['railId'] = options.id;

    const header = el('header', 'rail__header');
    header.appendChild(el('h2', 'rail__title', options.title));

    this.subtitleEl = el('p', 'rail__subtitle', options.subtitle ?? '');
    this.subtitleEl.classList.toggle('is-hidden', !options.subtitle);
    header.appendChild(this.subtitleEl);

    this.track = el('div', 'rail__track');
    this.track.setAttribute('role', 'list');

    this.root.append(header, this.track);
  }

  get scrollElement(): HTMLElement {
    return this.track;
  }

  getNodes(): readonly SpatialNode[] {
    return this.nodes;
  }

  setSubtitle(text: string): void {
    this.subtitleEl.textContent = text;
    this.subtitleEl.classList.toggle('is-hidden', text.length === 0);
  }

  setLoading(count: number = 8): void {
    clearChildren(this.track);
    this.nodes = [];
    for (let index = 0; index < count; index += 1) {
      const skeleton = el('div', 'media-card media-card--skeleton');
      skeleton.appendChild(el('span', 'media-card__art'));
      skeleton.appendChild(el('span', 'media-card__title-skeleton'));
      this.track.appendChild(skeleton);
    }
  }

  setMessage(message: string): void {
    clearChildren(this.track);
    this.nodes = [];
    const box = el('div', 'rail__message');
    box.appendChild(el('p', 'rail__message-text', message));
    this.track.appendChild(box);
  }

  setItems(items: readonly RailItem[]): readonly SpatialNode[] {
    clearChildren(this.track);
    const nodes: SpatialNode[] = [];
    const seen = new Set<string>();

    for (const entry of items) {
      if (seen.has(entry.item.id)) continue;
      seen.add(entry.item.id);

      const card = new MovieCard({
        item: entry.item,
        onSelect: this.options.onSelect,
        progressPercent: entry.progressPercent,
      });
      this.track.appendChild(card.root);

      nodes.push({
        id: `${this.id}:${entry.item.id}`,
        element: card.root,
        onSelect: () => this.options.onSelect(entry.item),
        onFocus: () => this.options.onFocusItem?.(entry.item),
      });
    }

    this.nodes = nodes;
    return nodes;
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('is-hidden', !visible);
  }
}
