import { createStore, useStore } from "./createStore";
import type {
  EpisodePointer,
  MediaItem,
  Profile,
  ProfileData,
  ProfileSettings,
  Rating,
} from "./types";
import { episodeKey } from "./types";

const STORAGE_KEY = "pelisstream:v3";
const DEFAULT_PROFILE_IDS = new Set([
  "p-main",
  "p-gaby",
  "p-fam",
  "p-kids",
  "esteban",
  "gaby",
  "papa",
  "cine-arte",
]);

export const DEFAULT_SETTINGS: ProfileSettings = {
  autoplayPreviews: true,
  previewSound: false,
  autoplayNext: true,
  heroAutoAdvance: true,
  reduceMotion: false,
  subtitles: "off",
  playbackRate: 1,
  preferredProvider: "playlatin",
  theme: "ember",
};

const emptyData = (kids = false): ProfileData => ({
  list: [],
  ratings: {},
  progress: {},
  history: {},
  reminders: [],
  recentSearches: [],
  watchedEpisodes: {},
  meta: {},
  settings: { ...DEFAULT_SETTINGS, previewSound: false, subtitles: kids ? "es" : "off" },
});

export interface PersistedState {
  version: 3;
  profiles: Profile[];
  activeProfileId: string | null;
  data: Record<string, ProfileData>;
}

export interface CloudState {
  version: 3;
  profiles: Profile[];
  data: Record<string, ProfileData>;
}

const seed = (): PersistedState => ({
  version: 3,
  profiles: [],
  activeProfileId: null,
  data: {},
});

export function normalizeCloudState(raw: unknown): CloudState {
  if (!raw || typeof raw !== "object") return { version: 3, profiles: [], data: {} };
  const parsed = raw as Partial<PersistedState>;
  const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
  const profiles = rawProfiles.filter((p) => p && typeof p.id === "string" && !DEFAULT_PROFILE_IDS.has(p.id));
  const rawData = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
  const data: Record<string, ProfileData> = {};

  for (const p of profiles) {
    const d = rawData[p.id] ?? emptyData(p.kids);
    const currentPreferred = d.settings?.preferredProvider;
    const preferredProvider =
      !currentPreferred ||
      currentPreferred === "vidsrc_pm" ||
      currentPreferred === "autoembed" ||
      currentPreferred === "multiembed"
        ? "playlatin"
        : currentPreferred;

    data[p.id] = {
      ...emptyData(p.kids),
      ...d,
      settings: { ...DEFAULT_SETTINGS, ...d.settings, preferredProvider },
    };
  }

  return { version: 3, profiles, data };
}

const restore = (): PersistedState => {
  try {
    for (const legacyKey of [
      "pelisstream:v2",
      "pelisstream_state",
      "pelisstream_profiles",
      "pelisstream_active_profile",
    ]) {
      localStorage.removeItem(legacyKey);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed?.version !== 3 || !Array.isArray(parsed.profiles)) return seed();
    const normalized = normalizeCloudState(parsed);
    const nextState: PersistedState = { ...normalized, activeProfileId: null };
    if (normalized.profiles.length !== parsed.profiles.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    }
    // Always start at the profile gate, like the reference platforms.
    return nextState;
  } catch {
    return seed();
  }
};

let saveTimer: number | undefined;
let suppressCloudHook = false;
const cloudListeners = new Set<(state: CloudState) => void>();

export function onDataChange(listener: (state: CloudState) => void): () => void {
  cloudListeners.add(listener);
  return () => cloudListeners.delete(listener);
}

export const getCloudSnapshot = (): CloudState => {
  const s = appStore.get();
  return { version: 3, profiles: s.profiles, data: s.data };
};

let lastProfiles: Profile[] | undefined;
let lastData: Record<string, ProfileData> | undefined;

export const appStore = createStore<PersistedState>(restore(), (state) => {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, 150);

  const dataMutated = state.profiles !== lastProfiles || state.data !== lastData;
  lastProfiles = state.profiles;
  lastData = state.data;
  if (!suppressCloudHook && dataMutated) {
    const snapshot: CloudState = { version: 3, profiles: state.profiles, data: state.data };
    cloudListeners.forEach((fn) => fn(snapshot));
  }
});

lastProfiles = appStore.get().profiles;
lastData = appStore.get().data;

/* ------------------------------ selectors ------------------------------ */

export const useProfiles = () => useStore(appStore, (s) => s.profiles);
export const useActiveProfile = () =>
  useStore(appStore, (s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? null);
export const useProfileData = () =>
  useStore(appStore, (s) => (s.activeProfileId ? s.data[s.activeProfileId] : undefined)) ??
  FALLBACK;
export const useSettings = () => useProfileData().settings;
const FALLBACK = emptyData();

const activeData = () => {
  const s = appStore.get();
  return s.activeProfileId ? s.data[s.activeProfileId] : undefined;
};
export const getProfileData = () => activeData() ?? FALLBACK;

const updateData = (fn: (d: ProfileData) => ProfileData) =>
  appStore.set((s) => {
    if (!s.activeProfileId) return s;
    const current = s.data[s.activeProfileId] ?? emptyData();
    return { ...s, data: { ...s.data, [s.activeProfileId]: fn(current) } };
  });

const remember = (d: ProfileData, item: MediaItem): ProfileData["meta"] => ({
  ...d.meta,
  [item.id]: item,
});

/* ------------------------------- actions ------------------------------- */

export const actions = {
  selectProfile(id: string) {
    appStore.set((s) => ({ ...s, activeProfileId: id }));
  },
  signOut() {
    appStore.set((s) => ({ ...s, activeProfileId: null }));
  },
  addProfile(input: Omit<Profile, "id">) {
    const id = `p-${Date.now().toString(36)}`;
    appStore.set((s) => ({
      ...s,
      profiles: [...s.profiles, { ...input, id }],
      data: { ...s.data, [id]: emptyData(input.kids) },
    }));
    return id;
  },
  updateProfile(id: string, patch: Partial<Omit<Profile, "id">>) {
    appStore.set((s) => ({
      ...s,
      profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },
  deleteProfile(id: string) {
    appStore.set((s) => {
      const data = { ...s.data };
      delete data[id];
      return {
        ...s,
        profiles: s.profiles.filter((p) => p.id !== id),
        data,
        activeProfileId: s.activeProfileId === id ? null : s.activeProfileId,
      };
    });
  },
  toggleList(item: MediaItem): boolean {
    const inList = getProfileData().list.includes(item.id);
    updateData((d) => ({
      ...d,
      list: inList ? d.list.filter((x) => x !== item.id) : [item.id, ...d.list],
      meta: remember(d, item),
    }));
    return !inList;
  },
  rate(item: MediaItem, rating: Rating | null) {
    updateData((d) => {
      const ratings = { ...d.ratings };
      if (rating === null || ratings[item.id] === rating) delete ratings[item.id];
      else ratings[item.id] = rating;
      return { ...d, ratings, meta: remember(d, item) };
    });
  },
  toggleReminder(item: MediaItem): boolean {
    const has = getProfileData().reminders.includes(item.id);
    updateData((d) => ({
      ...d,
      reminders: has ? d.reminders.filter((x) => x !== item.id) : [item.id, ...d.reminders],
      meta: remember(d, item),
    }));
    return !has;
  },
  saveProgress(item: MediaItem, position: number, duration: number, episode?: EpisodePointer) {
    const completed = duration > 0 && position / duration > 0.94;
    updateData((d) => ({
      ...d,
      progress: {
        ...d.progress,
        [item.id]: {
          type: item.type,
          updatedAt: Date.now(),
          position,
          duration,
          completed,
          ...(episode ?? {}),
        },
      },
      history: { ...d.history, [item.id]: Date.now() },
      watchedEpisodes:
        episode && completed
          ? { ...d.watchedEpisodes, [episodeKey(item.id, episode.season, episode.episode)]: true }
          : d.watchedEpisodes,
      meta: remember(d, item),
    }));
  },
  removeProgress(id: string) {
    updateData((d) => {
      const progress = { ...d.progress };
      delete progress[id];
      return { ...d, progress };
    });
  },
  setEpisodeWatched(seriesId: string, season: number, episode: number, watched: boolean) {
    updateData((d) => {
      const watchedEpisodes = { ...d.watchedEpisodes };
      const key = episodeKey(seriesId, season, episode);
      if (watched) watchedEpisodes[key] = true;
      else delete watchedEpisodes[key];
      return { ...d, watchedEpisodes };
    });
  },
  addRecentSearch(query: string) {
    const q = query.trim();
    if (q.length < 2) return;
    updateData((d) => ({
      ...d,
      recentSearches: [
        q,
        ...d.recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase()),
      ].slice(0, 8),
    }));
  },
  clearRecentSearches() {
    updateData((d) => ({ ...d, recentSearches: [] }));
  },
  updateSettings(patch: Partial<ProfileSettings>) {
    updateData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  },
  clearHistory() {
    updateData((d) => ({ ...d, history: {}, progress: {}, watchedEpisodes: {} }));
  },
  clearRatings() {
    updateData((d) => ({ ...d, ratings: {} }));
  },
  resetProfile() {
    updateData((d) => ({ ...emptyData(), settings: d.settings }));
  },
  hydrateFromCloud(raw: unknown) {
    const next = normalizeCloudState(raw);
    suppressCloudHook = true;
    try {
      appStore.set((s) => {
        const stillExists =
          s.activeProfileId && next.profiles.some((p) => p.id === s.activeProfileId);
        return {
          ...next,
          activeProfileId: stillExists ? s.activeProfileId : null,
        };
      });
    } finally {
      suppressCloudHook = false;
    }
  },
  clearAllProfiles() {
    suppressCloudHook = true;
    try {
      appStore.set(() => seed());
    } finally {
      suppressCloudHook = false;
    }
  },
};
