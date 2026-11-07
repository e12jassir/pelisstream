import { displayYear, formatRuntime, type MediaItem } from '../core/domain/media';
import { el, setImageSource } from './dom';

export interface MovieCardOptions {
  readonly item: MediaItem;
  readonly onSelect: (item: MediaItem) => void;
  readonly progressPercent?: number;
  readonly badge?: string;
  readonly subtitle?: string;
}

export class MovieCard {
  readonly root: HTMLButtonElement;

  constructor(options: MovieCardOptions) {
    const { item } = options;
    const root = el('button', 'media-card');
    root.type = 'button';
    root.setAttribute('aria-label', `${item.title} (${displayYear(item)})`);
    root.dataset['mediaId'] = item.id;

    const art = el('span', 'media-card__art');
    const image = document.createElement('img');
    image.className = 'media-card__image';
    setImageSource(image, item.poster, item.title);
    art.appendChild(image);

    if (options.badge) {
      art.appendChild(el('span', 'media-card__badge', options.badge));
    }

    if (item.imdbRating > 0) {
      art.appendChild(
        el('span', 'media-card__rating', `★ ${item.imdbRating.toFixed(1)}`),
      );
    }

    const info = el('span', 'media-card__info');
    info.appendChild(el('span', 'media-card__title', item.title));

    const metaText =
      options.subtitle ??
      [displayYear(item), formatRuntime(item.runtimeMinutes)].filter(Boolean).join(' · ');
    if (metaText) {
      info.appendChild(el('span', 'media-card__meta', metaText));
    }

    if (options.progressPercent && options.progressPercent > 0) {
      const progress = el('span', 'media-card__progress');
      const fill = el('span', 'media-card__progress-fill');
      fill.style.width = `${Math.max(0, Math.min(100, options.progressPercent))}%`;
      progress.appendChild(fill);
      info.appendChild(progress);
    }

    root.append(art, info);
    root.addEventListener('click', () => options.onSelect(item));
    this.root = root;
  }
}
