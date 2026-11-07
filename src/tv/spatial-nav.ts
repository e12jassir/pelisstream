export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type SpatialContainerType = 'horizontal-rail' | 'grid' | 'linear-vertical';

export interface SpatialNode {
  readonly id: string;
  readonly element: HTMLElement;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
  readonly onSelect?: () => void;
}

export interface ContainerDescriptor {
  readonly id: string;
  readonly type: SpatialContainerType;
  readonly columns?: number;
  readonly upContainerId?: string;
  readonly downContainerId?: string;
  readonly leftContainerId?: string;
  readonly rightContainerId?: string;
  /** Explicit scroll container; defaults to the first node's parent. */
  readonly scrollElement?: HTMLElement;
}

export interface ActiveLocation {
  readonly containerId: string;
  readonly index: number;
}

export interface FocusOptions {
  readonly force?: boolean;
}

export const FOCUS_CLASS = 'tv-focused';

interface RailMetrics {
  readonly step: number;
  readonly cardWidth: number;
  readonly railWidth: number;
}

const getDefaultView = (): Window | null =>
  typeof window === 'undefined' ? null : window;

/**
 * Virtual topology navigation (O(1) per key press).
 *
 * Unlike the v1 engine, this never scans the DOM and never calls
 * `getBoundingClientRect()` while navigating. Rail metrics are measured once
 * when a rail is populated (one layout read per render) and invalidated on
 * resize; each key press only mutates cached indices and `scrollLeft`.
 */
export class SpatialNavigationEngine {
  private readonly containers = new Map<string, ContainerDescriptor>();
  private readonly nodesByContainer = new Map<string, SpatialNode[]>();
  private readonly metricsByContainer = new Map<string, RailMetrics | null>();
  private readonly lastIndexByContainer = new Map<string, number>();
  private readonly view: Window | null;

  private activeContainerId: string | null = null;
  private activeNodeIndex = 0;
  private resizeTimer: number | null = null;

  constructor(view: Window | null = getDefaultView()) {
    this.view = view;
    this.view?.addEventListener('resize', this.handleResize);
  }

  dispose(): void {
    if (this.view) {
      this.view.removeEventListener('resize', this.handleResize);
      if (this.resizeTimer !== null) this.view.clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = null;
  }

  registerContainer(descriptor: ContainerDescriptor): void {
    this.containers.set(descriptor.id, descriptor);
    if (!this.nodesByContainer.has(descriptor.id)) {
      this.nodesByContainer.set(descriptor.id, []);
    }
    this.metricsByContainer.delete(descriptor.id);
  }

  setNodes(containerId: string, nodes: readonly SpatialNode[]): void {
    const previousElement = this.getCurrentNode()?.element ?? null;
    const list = Array.from(nodes);
    this.nodesByContainer.set(containerId, list);
    this.metricsByContainer.delete(containerId);
    this.lastIndexByContainer.delete(containerId);

    if (this.activeContainerId !== containerId) return;

    if (list.length === 0) {
      this.activeNodeIndex = 0;
      return;
    }

    const current = this.getCurrentNode();
    if (!previousElement || !previousElement.isConnected || !current) {
      const targetIndex = Math.min(Math.max(0, this.activeNodeIndex), list.length - 1);
      this.focusNode(containerId, targetIndex, { force: true });
    }
  }

  focusNode(containerId: string, index: number, options: FocusOptions = {}): boolean {
    const nodes = this.nodesByContainer.get(containerId);
    const descriptor = this.containers.get(containerId);
    if (!descriptor || !nodes || nodes.length === 0) return false;

    const clampedIndex = Math.max(0, Math.min(Math.trunc(index), nodes.length - 1));
    const target = nodes[clampedIndex];
    if (!target) return false;

    const previous = this.getCurrentNode();
    const alreadyFocused =
      this.activeContainerId === containerId &&
      this.activeNodeIndex === clampedIndex &&
      previous === target;

    if (alreadyFocused && !options.force) {
      this.syncDomFocus(target.element);
      return true;
    }

    if (previous && previous !== target) {
      previous.element.classList.remove(FOCUS_CLASS);
      this.invoke(previous.onBlur);
    }

    if (this.activeContainerId !== null) {
      this.lastIndexByContainer.set(this.activeContainerId, this.activeNodeIndex);
    }

    this.activeContainerId = containerId;
    this.activeNodeIndex = clampedIndex;

    target.element.classList.add(FOCUS_CLASS);
    this.invoke(target.onFocus);
    this.syncDomFocus(target.element);
    this.scrollToNode(descriptor, target, clampedIndex);
    return true;
  }

  navigate(direction: Direction): boolean {
    const active = this.getActiveLocation();
    if (!active) return false;

    const descriptor = this.containers.get(active.containerId);
    const nodes = this.nodesByContainer.get(active.containerId);
    if (!descriptor || !nodes || nodes.length === 0) return false;

    switch (descriptor.type) {
      case 'horizontal-rail':
        return this.navigateRail(descriptor, active.index, nodes.length, direction);
      case 'grid':
        return this.navigateGrid(descriptor, active.index, nodes.length, direction);
      case 'linear-vertical':
        return this.navigateLinear(descriptor, active.index, nodes.length, direction);
      default:
        return false;
    }
  }

  selectCurrent(): void {
    const current = this.getCurrentNode();
    if (!current?.onSelect) return;
    try {
      current.onSelect();
    } catch (error) {
      console.warn('[SpatialNav] El callback de selección falló.', error);
    }
  }

  getCurrentNode(): SpatialNode | null {
    if (!this.activeContainerId) return null;
    const nodes = this.nodesByContainer.get(this.activeContainerId);
    if (!nodes || nodes.length === 0) return null;
    return nodes[this.activeNodeIndex] ?? null;
  }

  getActiveLocation(): ActiveLocation | null {
    if (!this.activeContainerId) return null;
    if (!this.getCurrentNode()) return null;
    return { containerId: this.activeContainerId, index: this.activeNodeIndex };
  }

  /**
   * Safety net for the FocusManager rule: if the platform stole DOM focus
   * (body/null), restore it on the last spatial node.
   */
  restoreFocus(): boolean {
    if (typeof document === 'undefined') return false;
    const current = this.getCurrentNode();
    if (!current) return false;

    const active = document.activeElement;
    if (active === current.element || current.element.contains(active)) {
      return false;
    }

    this.syncDomFocus(current.element);
    this.scrollToNode(
      this.containers.get(this.activeContainerId ?? '') ?? {
        id: this.activeContainerId ?? '',
        type: 'horizontal-rail',
      },
      current,
      this.activeNodeIndex,
    );
    return true;
  }

  private handleResize = (): void => {
    if (!this.view) return;
    if (this.resizeTimer !== null) this.view.clearTimeout(this.resizeTimer);
    this.resizeTimer = this.view.setTimeout(() => {
      this.metricsByContainer.clear();
      const active = this.getActiveLocation();
      if (active) this.focusNode(active.containerId, active.index, { force: true });
      this.resizeTimer = null;
    }, 150);
  };

  private navigateRail(
    descriptor: ContainerDescriptor,
    index: number,
    length: number,
    direction: Direction,
  ): boolean {
    if (direction === 'LEFT') {
      if (index > 0) return this.focusNode(descriptor.id, index - 1);
      return this.jumpToContainer(descriptor.leftContainerId, index);
    }
    if (direction === 'RIGHT') {
      if (index < length - 1) return this.focusNode(descriptor.id, index + 1);
      return this.jumpToContainer(descriptor.rightContainerId, index);
    }
    if (direction === 'UP') {
      return this.jumpToContainer(descriptor.upContainerId, index);
    }
    return this.jumpToContainer(descriptor.downContainerId, index);
  }

  private navigateGrid(
    descriptor: ContainerDescriptor,
    index: number,
    length: number,
    direction: Direction,
  ): boolean {
    const columns = Math.max(1, descriptor.columns ?? 1);
    const column = index % columns;

    switch (direction) {
      case 'LEFT':
        if (column > 0) return this.focusNode(descriptor.id, index - 1);
        return this.jumpToContainer(descriptor.leftContainerId, index);
      case 'RIGHT':
        if (index + 1 < length && column + 1 < columns) {
          return this.focusNode(descriptor.id, index + 1);
        }
        return this.jumpToContainer(descriptor.rightContainerId, index);
      case 'UP':
        if (index - columns >= 0) return this.focusNode(descriptor.id, index - columns);
        return this.jumpToContainer(descriptor.upContainerId, index);
      case 'DOWN':
        if (index + columns < length) return this.focusNode(descriptor.id, index + columns);
        return this.jumpToContainer(descriptor.downContainerId, index);
      default:
        return false;
    }
  }

  private navigateLinear(
    descriptor: ContainerDescriptor,
    index: number,
    length: number,
    direction: Direction,
  ): boolean {
    if (direction === 'UP') {
      if (index > 0) return this.focusNode(descriptor.id, index - 1);
      return this.jumpToContainer(descriptor.upContainerId, index);
    }
    if (direction === 'DOWN') {
      if (index < length - 1) return this.focusNode(descriptor.id, index + 1);
      return this.jumpToContainer(descriptor.downContainerId, index);
    }
    return this.jumpToContainer(
      direction === 'LEFT' ? descriptor.leftContainerId : descriptor.rightContainerId,
      index,
    );
  }

  private jumpToContainer(containerId: string | undefined, fallbackIndex: number): boolean {
    if (!containerId) return false;
    const targetNodes = this.nodesByContainer.get(containerId);
    if (!targetNodes || targetNodes.length === 0) return false;

    const remembered = this.lastIndexByContainer.get(containerId);
    const targetIndex = remembered ?? Math.min(Math.max(0, fallbackIndex), targetNodes.length - 1);
    return this.focusNode(containerId, targetIndex);
  }

  private measure(
    descriptor: ContainerDescriptor,
    nodes: readonly SpatialNode[],
  ): RailMetrics | null {
    const first = nodes[0];
    if (!first) return null;

    const cardWidth = first.element.offsetWidth || 220;
    const second = nodes[1];
    const measuredStep = second
      ? second.element.offsetLeft - first.element.offsetLeft
      : cardWidth + 16;
    const step = measuredStep > 0 ? measuredStep : cardWidth + 16;
    const scroller = this.resolveScroller(descriptor, first);
    const railWidth = scroller?.clientWidth ?? 0;

    return { step, cardWidth, railWidth };
  }

  private resolveScroller(
    descriptor: ContainerDescriptor,
    node: SpatialNode,
  ): HTMLElement | null {
    return descriptor.scrollElement ?? node.element.parentElement;
  }

  private scrollToNode(
    descriptor: ContainerDescriptor,
    node: SpatialNode,
    index: number,
  ): void {
    const nodes = this.nodesByContainer.get(descriptor.id) ?? [];
    let metrics = this.metricsByContainer.get(descriptor.id);
    if (metrics === undefined) {
      metrics = this.measure(descriptor, nodes);
      this.metricsByContainer.set(descriptor.id, metrics);
    }
    if (!metrics) return;

    const scroller = this.resolveScroller(descriptor, node);
    if (scroller && descriptor.type === 'horizontal-rail') {
      const centered = index * metrics.step - (metrics.railWidth - metrics.cardWidth) / 2;
      scroller.scrollLeft = Math.max(0, Math.round(centered));
      return;
    }

    if (scroller && descriptor.type === 'grid') {
      const columns = Math.max(1, descriptor.columns ?? 1);
      const column = index % columns;
      const centered = column * metrics.step - (metrics.railWidth - metrics.cardWidth) / 2;
      scroller.scrollLeft = Math.max(0, Math.round(centered));
    }

    node.element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  private syncDomFocus(element: HTMLElement): void {
    if (typeof document === 'undefined') return;
    if (document.activeElement === element) return;

    try {
      element.focus({ preventScroll: true });
    } catch {
      try {
        element.focus();
      } catch {
        // Element cannot receive focus; the visual class still applies.
      }
    }
  }

  private invoke(callback: (() => void) | undefined): void {
    if (!callback) return;
    try {
      callback();
    } catch (error) {
      console.warn('[SpatialNav] Un callback de foco falló.', error);
    }
  }
}
