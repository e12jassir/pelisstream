export enum TVAction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  ENTER = 'ENTER',
  BACK = 'BACK',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  PLAY_PAUSE = 'PLAY_PAUSE',
  STOP = 'STOP',
  FAST_FORWARD = 'FAST_FORWARD',
  REWIND = 'REWIND',
}

export const TV_KEY_CODES = {
  WEBOS_BACK: 461,
  TIZEN_BACK: 10009,
} as const;

/** Remote key codes shared by webOS, Tizen and desktop browsers. */
export const TV_KEY_MAP: Record<number, TVAction> = {
  38: TVAction.UP,
  40: TVAction.DOWN,
  37: TVAction.LEFT,
  39: TVAction.RIGHT,
  13: TVAction.ENTER,
  27: TVAction.BACK,

  461: TVAction.BACK, // LG webOS Back
  415: TVAction.PLAY,
  19: TVAction.PAUSE,
  413: TVAction.STOP,
  417: TVAction.FAST_FORWARD,
  412: TVAction.REWIND,

  10009: TVAction.BACK, // Samsung Tizen Return
  10252: TVAction.PLAY_PAUSE,
  10182: TVAction.PLAY,
  10243: TVAction.PAUSE,
  10245: TVAction.STOP,
  10232: TVAction.FAST_FORWARD,
  10233: TVAction.REWIND,
};

export type TVPlatformKind = 'webos' | 'tizen' | 'browser';
export type TVActionHandler = (event: KeyboardEvent) => boolean | void;
export type BackHandler = () => boolean;

interface WebOSBridge {
  readonly platformBack?: () => void;
}

interface TizenCurrentApplication {
  readonly exit?: () => void;
}

interface TizenApplicationBridge {
  readonly getCurrentApplication?: () => TizenCurrentApplication | null;
}

interface TizenInputDeviceBridge {
  readonly registerKey?: (keyName: string) => void;
}

interface TizenBridge {
  readonly application?: TizenApplicationBridge;
  readonly tvinputdevice?: TizenInputDeviceBridge;
}

interface TizenHardwareKeyEvent extends Event {
  readonly keyName?: string;
}

interface TizenHardwareKeyDetail {
  readonly keyName?: string;
}

declare global {
  interface Window {
    webOS?: WebOSBridge;
    tizen?: TizenBridge;
  }
  interface WindowEventMap {
    tizenhwkey: CustomEvent<TizenHardwareKeyDetail>;
  }
}

const TIZEN_MEDIA_KEYS = [
  'MediaPlayPause',
  'MediaPlay',
  'MediaPause',
  'MediaStop',
  'MediaFastForward',
  'MediaRewind',
] as const;

/**
 * Hardware abstraction layer for LG webOS (key 461) and Samsung Tizen
 * (key 10009 + `tizenhwkey`). It installs a single capture-phase listener so
 * the app never races multiple global key handlers.
 */
export class TVPlatform {
  readonly kind: TVPlatformKind;

  private readonly view: Window;
  private readonly actionHandlers = new Map<TVAction, Set<TVActionHandler>>();
  private readonly backHandlers: BackHandler[] = [];
  private installed = false;
  private keydownBound: ((event: KeyboardEvent) => void) | null = null;
  private tizenKeyBound: ((event: Event) => void) | null = null;

  constructor(view: Window = window, userAgent: string = navigator.userAgent) {
    this.view = view;
    const isWebOS = /Web0S|webOS/i.test(userAgent) || Boolean(view.webOS);
    const isTizen = /Tizen/i.test(userAgent) || Boolean(view.tizen);
    this.kind = isTizen ? 'tizen' : isWebOS ? 'webos' : 'browser';
  }

  get isTV(): boolean {
    return this.kind !== 'browser';
  }

  install(): void {
    if (this.installed) return;
    this.installed = true;

    this.keydownBound = (event) => this.handleKeyDown(event);
    this.view.addEventListener('keydown', this.keydownBound, { capture: true });

    if (this.kind === 'tizen') {
      this.initializeTizen();
    }

    console.info(`[TVPlatform] Plataforma detectada: ${this.kind}`);
  }

  dispose(): void {
    if (this.keydownBound) {
      this.view.removeEventListener('keydown', this.keydownBound, { capture: true });
      this.keydownBound = null;
    }
    if (this.tizenKeyBound) {
      this.view.removeEventListener('tizenhwkey', this.tizenKeyBound);
      this.tizenKeyBound = null;
    }
    this.actionHandlers.clear();
    this.backHandlers.length = 0;
    this.installed = false;
  }

  registerActionHandler(action: TVAction, handler: TVActionHandler): () => void {
    let handlers = this.actionHandlers.get(action);
    if (!handlers) {
      handlers = new Set<TVActionHandler>();
      this.actionHandlers.set(action, handlers);
    }
    handlers.add(handler);
    return () => {
      handlers?.delete(handler);
    };
  }

  /** LIFO stack: the last registered handler (topmost modal) runs first. */
  registerBackHandler(handler: BackHandler): () => void {
    this.backHandlers.push(handler);
    return () => {
      const index = this.backHandlers.lastIndexOf(handler);
      if (index >= 0) this.backHandlers.splice(index, 1);
    };
  }

  exit(): void {
    try {
      if (this.kind === 'tizen') {
        const app = this.view.tizen?.application?.getCurrentApplication?.();
        if (app?.exit) {
          app.exit();
          return;
        }
      }
      if (this.kind === 'webos' && this.view.webOS?.platformBack) {
        this.view.webOS.platformBack();
        return;
      }
    } catch (error) {
      console.warn('[TVPlatform] La API nativa de cierre falló; se intenta window.close().', error);
    }

    try {
      this.view.close();
    } catch {
      // Nothing else can be done on this platform.
    }
  }

  private initializeTizen(): void {
    const bridge = this.view.tizen;
    if (!bridge) return;

    for (const key of TIZEN_MEDIA_KEYS) {
      try {
        bridge.tvinputdevice?.registerKey?.(key);
      } catch (error) {
        console.warn(`[TVPlatform] No se pudo registrar la tecla Tizen ${key}.`, error);
      }
    }

    this.tizenKeyBound = (event) => {
      const keyName =
        (event as TizenHardwareKeyEvent).keyName ??
        (event as CustomEvent<TizenHardwareKeyDetail>).detail?.keyName;
      if (keyName === 'back') {
        event.preventDefault();
        this.triggerBack();
      }
    };
    this.view.addEventListener('tizenhwkey', this.tizenKeyBound);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const action = TV_KEY_MAP[event.keyCode];
    if (!action) return;

    if (action === TVAction.BACK) {
      event.preventDefault();
      event.stopPropagation();
      this.triggerBack();
      return;
    }

    let handled = false;
    const handlers = this.actionHandlers.get(action);
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        try {
          if (handler(event) === true) {
            handled = true;
            break;
          }
        } catch (error) {
          console.warn(`[TVPlatform] Un manejador de ${action} falló.`, error);
        }
      }
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // D-Pad keys must never scroll the page, even at a navigation edge.
    if (
      action === TVAction.UP ||
      action === TVAction.DOWN ||
      action === TVAction.LEFT ||
      action === TVAction.RIGHT
    ) {
      event.preventDefault();
    }
  }

  private triggerBack(): void {
    for (let index = this.backHandlers.length - 1; index >= 0; index -= 1) {
      const handler = this.backHandlers[index];
      if (!handler) continue;
      try {
        if (handler()) return;
      } catch (error) {
        console.warn('[TVPlatform] Un manejador de BACK falló; se continúa con el anterior.', error);
      }
    }
    this.exit();
  }
}
