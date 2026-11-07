/**
 * PelisStream v2 - 10-Foot Spatial Navigation Engine
 * Directional D-Pad navigation for Smart TV Remotes & Keyboard arrows.
 * Handles focus traps, smooth centering of focused elements, and remote back keys.
 */

export class SpatialNavigationManager {
  private currentFocused: HTMLElement | null = null;
  private previousFocused: HTMLElement | null = null;
  private activeModal: HTMLElement | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Initializes remote control listeners and sets initial focus.
   */
  public init(): void {
    window.addEventListener('keydown', this.handleKeyDown);

    // Allow mouse/pointer interaction to sync with TV focus
    document.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement).closest('.tv-focusable') as HTMLElement;
      if (target && target !== this.currentFocused) {
        this.setFocus(target, false);
      }
    });

    // Initialize initial focus on first hero button or first card
    const initialElement = document.querySelector('.tv-hero-actions .tv-btn-primary') as HTMLElement
      || document.querySelector('.tv-card') as HTMLElement;
    
    if (initialElement) {
      this.setFocus(initialElement, false);
    }
  }

  /**
   * Play an ultra-subtle 10-Foot UI tick sound using Web Audio API (zero audio file dependencies).
   */
  private playFocusSound(): void {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      if (this.audioContext) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.04);
        gain.gain.setValueAtTime(0.02, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.045);
      }
    } catch {
      // Audio autoplay policies or unsupported context silently ignored
    }
  }

  /**
   * Focuses a target element, updates TV classes, and centers it in view.
   */
  public setFocus(element: HTMLElement | null, playSound: boolean = true): void {
    if (!element) return;

    if (this.currentFocused) {
      this.currentFocused.classList.remove('tv-focused');
    }

    this.currentFocused = element;
    element.classList.add('tv-focused');
    element.focus({ preventScroll: true });

    if (playSound) {
      this.playFocusSound();
    }

    // Scroll horizontal rails or modal views smoothly into comfortable sight
    this.scrollIntoComfortableView(element);
  }

  /**
   * Centers the focused element in its rail or page without jarring jumps.
   */
  private scrollIntoComfortableView(element: HTMLElement): void {
    const railTrack = element.closest('.tv-rail-track') as HTMLElement;
    if (railTrack) {
      // Smoothly center the card horizontally inside its rail
      const trackRect = railTrack.getBoundingClientRect();
      const cardRect = element.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const trackCenter = trackRect.left + trackRect.width / 2;
      const offset = cardCenter - trackCenter;

      railTrack.scrollBy({
        left: offset,
        behavior: 'smooth'
      });
    }

    // Ensure the element is visible vertically on the TV screen
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }

  /**
   * Spatial direction engine: finds best candidate in 2D space.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key;

    // Handle Back / Escape keys
    if (
      key === 'Escape' || 
      key === 'Backspace' || 
      key === 'GoBack' || 
      e.keyCode === 10009 || // Samsung Tizen Return
      e.keyCode === 461      // LG webOS Back
    ) {
      if (this.activeModal) {
        e.preventDefault();
        this.closeActiveModal();
        return;
      }
    }

    // Handle Enter / OK
    if (key === 'Enter' || key === ' ') {
      if (this.currentFocused) {
        e.preventDefault();
        this.currentFocused.click();
        return;
      }
    }

    // Directional keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      this.navigateDirection(key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
    }
  }

  /**
   * Computes the next focusable candidate based on container context or 2D geometric distance.
   */
  private navigateDirection(direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): void {
    if (!this.currentFocused) {
      const first = document.querySelector('.tv-focusable') as HTMLElement;
      this.setFocus(first);
      return;
    }

    // 1. If currently inside a modal, constrain navigation to modal elements
    if (this.activeModal) {
      this.navigateInsideModal(direction);
      return;
    }

    // 2. Main screen hierarchical navigation (Hero <-> Rails)
    const current = this.currentFocused;

    // A) Navigation inside Hero Action Buttons
    if (current.closest('.tv-hero-actions')) {
      if (direction === 'ArrowLeft') {
        const prev = current.previousElementSibling as HTMLElement;
        if (prev && prev.classList.contains('tv-focusable')) this.setFocus(prev);
      } else if (direction === 'ArrowRight') {
        const next = current.nextElementSibling as HTMLElement;
        if (next && next.classList.contains('tv-focusable')) this.setFocus(next);
      } else if (direction === 'ArrowDown') {
        // Move to first card of the first rail
        const firstCard = document.querySelector('.tv-rail-track .tv-card') as HTMLElement;
        if (firstCard) this.setFocus(firstCard);
      }
      return;
    }

    // B) Navigation inside a Movie Rail
    const currentRail = current.closest('.tv-rail') as HTMLElement;
    if (currentRail) {
      if (direction === 'ArrowLeft') {
        const prevCard = current.previousElementSibling as HTMLElement;
        if (prevCard && prevCard.classList.contains('tv-focusable')) {
          this.setFocus(prevCard);
        }
      } else if (direction === 'ArrowRight') {
        const nextCard = current.nextElementSibling as HTMLElement;
        if (nextCard && nextCard.classList.contains('tv-focusable')) {
          this.setFocus(nextCard);
        }
      } else if (direction === 'ArrowDown') {
        const nextRail = currentRail.nextElementSibling as HTMLElement;
        if (nextRail && nextRail.classList.contains('tv-rail')) {
          const targetCard = this.findVerticallyClosestElement(current, nextRail.querySelectorAll('.tv-card'));
          if (targetCard) this.setFocus(targetCard);
        }
      } else if (direction === 'ArrowUp') {
        const prevRail = currentRail.previousElementSibling as HTMLElement;
        if (prevRail && prevRail.classList.contains('tv-rail')) {
          const targetCard = this.findVerticallyClosestElement(current, prevRail.querySelectorAll('.tv-card'));
          if (targetCard) this.setFocus(targetCard);
        } else {
          // At top rail -> move focus up to Hero Play CTA
          const heroPlay = document.getElementById('hero-btn-play');
          if (heroPlay) this.setFocus(heroPlay);
        }
      }
      return;
    }

    // Fallback: Geometric 2D ray-cast
    this.navigateGeometric(direction);
  }

  /**
   * Finds the card in target rail with the closest horizontal coordinate.
   */
  private findVerticallyClosestElement(origin: HTMLElement, targets: NodeListOf<Element>): HTMLElement | null {
    if (!targets.length) return null;
    const originRect = origin.getBoundingClientRect();
    let closest: HTMLElement | null = null;
    let minDiff = Infinity;

    targets.forEach((node) => {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      const diff = Math.abs(rect.left - originRect.left);
      if (diff < minDiff) {
        minDiff = diff;
        closest = el;
      }
    });

    return closest || (targets[0] as HTMLElement);
  }

  /**
   * Modal focus trap navigation.
   */
  private navigateInsideModal(direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): void {
    if (!this.activeModal || !this.currentFocused) return;

    const focusables = Array.from(this.activeModal.querySelectorAll<HTMLElement>('.tv-focusable:not([disabled])'));
    const currentIndex = focusables.indexOf(this.currentFocused);

    if (direction === 'ArrowLeft' || direction === 'ArrowUp') {
      const nextIndex = currentIndex > 0 ? currentIndex - 1 : focusables.length - 1;
      this.setFocus(focusables[nextIndex]);
    } else if (direction === 'ArrowRight' || direction === 'ArrowDown') {
      const nextIndex = currentIndex < focusables.length - 1 ? currentIndex + 1 : 0;
      this.setFocus(focusables[nextIndex]);
    }
  }

  /**
   * Generic 2D geometric navigation fallback.
   */
  private navigateGeometric(direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): void {
    if (!this.currentFocused) return;
    const currentRect = this.currentFocused.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('.tv-focusable:not([disabled])'))
      .filter((el) => el !== this.currentFocused && el.offsetParent !== null);

    let bestCandidate: HTMLElement | null = null;
    let bestDistance = Infinity;

    candidates.forEach((cand) => {
      const r = cand.getBoundingClientRect();
      let isValidDirection = false;
      let primaryDiff = 0;
      let secondaryDiff = 0;

      if (direction === 'ArrowRight' && r.left >= currentRect.right - 10) {
        isValidDirection = true;
        primaryDiff = r.left - currentRect.right;
        secondaryDiff = Math.abs((r.top + r.height / 2) - (currentRect.top + currentRect.height / 2));
      } else if (direction === 'ArrowLeft' && r.right <= currentRect.left + 10) {
        isValidDirection = true;
        primaryDiff = currentRect.left - r.right;
        secondaryDiff = Math.abs((r.top + r.height / 2) - (currentRect.top + currentRect.height / 2));
      } else if (direction === 'ArrowDown' && r.top >= currentRect.bottom - 10) {
        isValidDirection = true;
        primaryDiff = r.top - currentRect.bottom;
        secondaryDiff = Math.abs((r.left + r.width / 2) - (currentRect.left + currentRect.width / 2));
      } else if (direction === 'ArrowUp' && r.bottom <= currentRect.top + 10) {
        isValidDirection = true;
        primaryDiff = currentRect.top - r.bottom;
        secondaryDiff = Math.abs((r.left + r.width / 2) - (currentRect.left + currentRect.width / 2));
      }

      if (isValidDirection) {
        const weightedDist = primaryDiff + secondaryDiff * 1.8;
        if (weightedDist < bestDistance) {
          bestDistance = weightedDist;
          bestCandidate = cand;
        }
      }
    });

    if (bestCandidate) {
      this.setFocus(bestCandidate);
    }
  }

  /**
   * Modal management: opens a modal and traps remote focus inside it.
   */
  public openModal(modal: HTMLElement, defaultFocusSelector?: string): void {
    this.previousFocused = this.currentFocused;
    this.activeModal = modal;
    modal.classList.add('active');

    const focusTarget = defaultFocusSelector 
      ? modal.querySelector(defaultFocusSelector) as HTMLElement
      : modal.querySelector('.tv-focusable') as HTMLElement;

    if (focusTarget) {
      this.setFocus(focusTarget, false);
    }
  }

  /**
   * Closes active modal and restores previous card focus.
   */
  public closeActiveModal(): void {
    if (!this.activeModal) return;

    this.activeModal.classList.remove('active');
    const closedModal = this.activeModal;
    this.activeModal = null;

    // Special cleanup if player iframe
    if (closedModal.id === 'player-modal') {
      const iframe = closedModal.querySelector('iframe') as HTMLIFrameElement;
      if (iframe) iframe.src = 'about:blank';
    }

    if (this.previousFocused && document.body.contains(this.previousFocused)) {
      this.setFocus(this.previousFocused, false);
    } else {
      const fallback = document.querySelector('.tv-card') as HTMLElement;
      this.setFocus(fallback, false);
    }
  }

  public getActiveModal(): HTMLElement | null {
    return this.activeModal;
  }

  public getCurrentFocused(): HTMLElement | null {
    return this.currentFocused;
  }
}
