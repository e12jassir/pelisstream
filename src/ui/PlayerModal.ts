import type { PlaybackResolution } from '../core/providers/provider.interface';
import type { SpatialNode } from '../tv/spatial-nav';
import { el } from './dom';

export interface PlayerProviderOption {
  readonly id: string;
  readonly name: string;
}

export interface PlaybackContext {
  readonly title: string;
  readonly subtitle?: string;
}

export interface PlayerModalCallbacks {
  readonly onClose: () => void;
  readonly onProviderChange: (providerId: string) => void;
}

/**
 * Safe iframe playback overlay. The iframe is blanked on close to release the
 * embedded decoder memory, which matters on 1 GB Smart TV SoCs.
 */
export class PlayerModal {
  readonly root: HTMLElement;

  private readonly callbacks: PlayerModalCallbacks;
  private readonly frame: HTMLIFrameElement;
  private readonly titleEl: HTMLElement;
  private readonly subtitleEl: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly providerButtons = new Map<string, HTMLButtonElement>();
  private readonly actionNodes: SpatialNode[];

  private activeProviderId: string | null = null;
  private isOpenFlag = false;

  constructor(providers: readonly PlayerProviderOption[], callbacks: PlayerModalCallbacks) {
    this.callbacks = callbacks;

    this.root = el('div', 'modal modal--player');
    this.root.setAttribute('aria-hidden', 'true');

    const panel = el('div', 'modal__panel player');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Reproductor');

    const topbar = el('div', 'modal__topbar player__topbar');
    const heading = el('div', 'player__heading');
    this.titleEl = el('h2', 'player__title');
    this.subtitleEl = el('p', 'player__subtitle');
    this.subtitleEl.classList.add('is-hidden');
    heading.append(this.titleEl, this.subtitleEl);

    this.closeButton = el('button', 'modal__close', 'Cerrar');
    this.closeButton.type = 'button';
    this.closeButton.setAttribute('aria-label', 'Cerrar reproductor');
    this.closeButton.addEventListener('click', () => this.callbacks.onClose());
    topbar.append(heading, this.closeButton);

    const frameWrap = el('div', 'player__frame-wrap');
    this.frame = document.createElement('iframe');
    this.frame.className = 'player__frame';
    this.frame.setAttribute('allowfullscreen', 'true');
    this.frame.setAttribute('referrerpolicy', 'no-referrer');
    this.frame.setAttribute('title', 'Reproductor de video');
    frameWrap.appendChild(this.frame);

    const hint = el(
      'p',
      'player__hint',
      'Si la reproducción no inicia, cambia de servidor con las flechas del control remoto.',
    );

    const providerBar = el('div', 'player__providers');
    providerBar.appendChild(el('span', 'player__providers-label', 'Servidor'));

    this.actionNodes = [
      {
        id: 'player:close',
        element: this.closeButton,
        onSelect: () => this.callbacks.onClose(),
      },
    ];

    for (const provider of providers) {
      const button = el('button', 'player__provider', provider.name);
      button.type = 'button';
      button.dataset['providerId'] = provider.id;
      button.addEventListener('click', () => this.callbacks.onProviderChange(provider.id));
      this.providerButtons.set(provider.id, button);
      providerBar.appendChild(button);
      this.actionNodes.push({
        id: `player:provider-${provider.id}`,
        element: button,
        onSelect: () => this.callbacks.onProviderChange(provider.id),
      });
    }

    panel.append(topbar, frameWrap, hint, providerBar);
    this.root.appendChild(panel);
  }

  get isOpen(): boolean {
    return this.isOpenFlag;
  }

  open(resolution: PlaybackResolution, context: PlaybackContext): void {
    this.titleEl.textContent = context.title;
    this.subtitleEl.textContent = context.subtitle ?? '';
    this.subtitleEl.classList.toggle('is-hidden', !context.subtitle);

    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    this.isOpenFlag = true;

    this.setResolution(resolution);
  }

  setResolution(resolution: PlaybackResolution): void {
    const sameSource =
      this.activeProviderId === resolution.providerId &&
      this.frame.getAttribute('src') === resolution.embedUrl;
    this.activeProviderId = resolution.providerId;

    for (const [providerId, button] of this.providerButtons) {
      const active = providerId === resolution.providerId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }

    if (sameSource) return;

    this.frame.setAttribute('sandbox', resolution.sandboxFlags);
    this.frame.setAttribute('allow', resolution.allowAttributes);
    this.frame.setAttribute('src', resolution.embedUrl);
  }

  close(): void {
    this.isOpenFlag = false;
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');

    // Release the embedded player and its network activity.
    this.frame.setAttribute('src', 'about:blank');
    this.activeProviderId = null;
    for (const button of this.providerButtons.values()) {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
    }
  }

  getActionNodes(): readonly SpatialNode[] {
    return this.actionNodes;
  }
}
