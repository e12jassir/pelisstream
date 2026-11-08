import { createStore, useStore } from "./createStore";
import type { EpisodePointer, MediaItem, PlayerMode } from "./types";

export interface Toast {
  id: number;
  message: string;
  tone: "default" | "success" | "accent";
}

interface UiState {
  details: MediaItem | null;
  player: { item: MediaItem; episode?: EpisodePointer; mode: PlayerMode } | null;
  toasts: Toast[];
  profileEditor: { profileId: string | null } | null;
  pinRequest: { profileId: string } | null;
}

export const uiStore = createStore<UiState>({
  details: null,
  player: null,
  toasts: [],
  profileEditor: null,
  pinRequest: null,
});

let pinSuccess: (() => void) | null = null;

export const useUi = <S>(selector: (s: UiState) => S) => useStore(uiStore, selector);

let toastId = 0;
export const ui = {
  openDetails(item: MediaItem) {
    uiStore.set((s) => ({ ...s, details: item }));
  },
  closeDetails() {
    uiStore.set((s) => ({ ...s, details: null }));
  },
  play(item: MediaItem, episode?: EpisodePointer, mode: PlayerMode = "stream") {
    uiStore.set((s) => ({ ...s, player: { item, episode, mode } }));
  },
  closePlayer() {
    uiStore.set((s) => ({ ...s, player: null }));
  },
  /** Ask for a profile's PIN; `onSuccess` runs only after the correct PIN. */
  requestPin(profileId: string, onSuccess: () => void) {
    pinSuccess = onSuccess;
    uiStore.set((s) => ({ ...s, pinRequest: { profileId } }));
  },
  resolvePin(ok: boolean) {
    const cb = pinSuccess;
    pinSuccess = null;
    uiStore.set((s) => ({ ...s, pinRequest: null }));
    if (ok) cb?.();
  },
  editProfile(profileId: string | null) {
    uiStore.set((s) => ({ ...s, profileEditor: { profileId } }));
  },
  closeProfileEditor() {
    uiStore.set((s) => ({ ...s, profileEditor: null }));
  },
  toast(message: string, tone: Toast["tone"] = "default") {
    const id = ++toastId;
    uiStore.set((s) => ({ ...s, toasts: [...s.toasts.slice(-2), { id, message, tone }] }));
    window.setTimeout(
      () => uiStore.set((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })),
      3200,
    );
  },
};
