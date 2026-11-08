import { createStore, useStore } from "./createStore";
import type { MediaItem } from "./types";

interface HoverState {
  item: MediaItem | null;
  rect: DOMRect | null;
  variant: "landscape" | "poster";
}

export const hoverStore = createStore<HoverState>({ item: null, rect: null, variant: "landscape" });
export const useHover = () => useStore(hoverStore, (s) => s);

let showTimer: number | undefined;
let hideTimer: number | undefined;

export const hover = {
  intent(item: MediaItem, el: HTMLElement, variant: HoverState["variant"]) {
    window.clearTimeout(hideTimer);
    window.clearTimeout(showTimer);
    const delay = hoverStore.get().item ? 160 : 520;
    showTimer = window.setTimeout(() => {
      hoverStore.set(() => ({ item, rect: el.getBoundingClientRect(), variant }));
    }, delay);
  },
  cancel() {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => hover.close(), 120);
  },
  keep() {
    window.clearTimeout(hideTimer);
  },
  close() {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    if (hoverStore.get().item) hoverStore.set((s) => ({ ...s, item: null }));
  },
};
