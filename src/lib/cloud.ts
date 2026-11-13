import { createStore, useStore } from "./createStore";
import { actions, getCloudSnapshot, onDataChange, type CloudState } from "./store";

const ACCOUNT_KEY = "pelisstream:account";
const GUEST_KEY = "pelisstream:guest";
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");

interface StoredAccount {
  token: string;
  username: string;
  updatedAt: number;
}

export interface CloudStatus {
  token: string | null;
  username: string | null;
  guestMode: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

function readGuestMode(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

function writeGuestMode(active: boolean) {
  try {
    if (active) localStorage.setItem(GUEST_KEY, "1");
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore storage errors */
  }
}

function readStoredAccount(): StoredAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAccount>;
    if (!parsed.token || !parsed.username) return null;
    return {
      token: parsed.token,
      username: parsed.username,
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return null;
  }
}

function writeStoredAccount(acc: StoredAccount | null) {
  try {
    if (!acc) localStorage.removeItem(ACCOUNT_KEY);
    else localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc));
  } catch {
    /* ignore storage errors */
  }
}

const initial = readStoredAccount();

export const cloudStore = createStore<CloudStatus>({
  token: initial?.token ?? null,
  username: initial?.username ?? null,
  guestMode: !initial?.token && readGuestMode(),
  syncing: false,
  lastSyncedAt: initial?.updatedAt ?? null,
  error: null,
});

export const useCloud = () => useStore(cloudStore, (s) => s);

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiJson<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null; keepalive?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    keepalive: options.keepalive,
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new ApiError(res.status, data.error || `Error ${res.status}`);
  }
  return data;
}

let pushTimer: number | undefined;
let pendingState: CloudState | null = null;

async function flushPush(keepalive = false) {
  window.clearTimeout(pushTimer);
  pushTimer = undefined;
  const stateToPush = pendingState;
  pendingState = null;

  const { token, username } = cloudStore.get();
  if (!token || !username || !stateToPush) return;

  cloudStore.set((s) => ({ ...s, syncing: true, error: null }));
  try {
    const res = await apiJson<{ ok: boolean; updatedAt: number }>("/api/sync", {
      method: "PUT",
      token,
      body: { state: stateToPush },
      keepalive,
    });
    writeStoredAccount({ token, username, updatedAt: res.updatedAt });
    cloudStore.set((s) => ({
      ...s,
      syncing: false,
      lastSyncedAt: res.updatedAt,
      error: null,
    }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      cloudActions.logout({ keepLocal: true });
      return;
    }
    cloudStore.set((s) => ({
      ...s,
      syncing: false,
      error: err instanceof Error ? err.message : "No se pudo sincronizar",
    }));
  }
}

function schedulePush(snapshot: CloudState) {
  if (!cloudStore.get().token) return;
  pendingState = snapshot;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    void flushPush(false);
  }, 1200);
}

onDataChange((snapshot) => {
  schedulePush(snapshot);
});

let initialized = false;
export function initCloudSync() {
  if (initialized) return;
  initialized = true;

  if (cloudStore.get().token) {
    void cloudActions.pull();
  }

  window.addEventListener("pagehide", () => {
    if (pendingState) void flushPush(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pendingState) {
      void flushPush(true);
    }
  });
}

export const cloudActions = {
  async register(username: string, password: string) {
    cloudStore.set((s) => ({ ...s, syncing: true, error: null }));
    try {
      const localState = getCloudSnapshot();
      const res = await apiJson<{
        token: string;
        username: string;
        state: CloudState;
        updatedAt: number;
      }>("/api/auth/register", {
        method: "POST",
        body: { username, password, state: localState },
      });
      writeGuestMode(false);
      writeStoredAccount({ token: res.token, username: res.username, updatedAt: res.updatedAt });
      cloudStore.set(() => ({
        token: res.token,
        username: res.username,
        guestMode: false,
        syncing: false,
        lastSyncedAt: res.updatedAt,
        error: null,
      }));
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo crear la cuenta";
      cloudStore.set((s) => ({ ...s, syncing: false, error: msg }));
      throw new Error(msg);
    }
  },

  async login(username: string, password: string) {
    cloudStore.set((s) => ({ ...s, syncing: true, error: null }));
    try {
      const res = await apiJson<{
        token: string;
        username: string;
        state: CloudState;
        updatedAt: number;
      }>("/api/auth/login", {
        method: "POST",
        body: { username, password },
      });
      window.clearTimeout(pushTimer);
      pendingState = null;
      writeGuestMode(false);
      writeStoredAccount({ token: res.token, username: res.username, updatedAt: res.updatedAt });
      actions.hydrateFromCloud(res.state);
      cloudStore.set(() => ({
        token: res.token,
        username: res.username,
        guestMode: false,
        syncing: false,
        lastSyncedAt: res.updatedAt,
        error: null,
      }));
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo iniciar sesión";
      cloudStore.set((s) => ({ ...s, syncing: false, error: msg }));
      throw new Error(msg);
    }
  },

  async pull() {
    const { token, username, lastSyncedAt } = cloudStore.get();
    if (!token || !username) return;
    cloudStore.set((s) => ({ ...s, syncing: true, error: null }));
    try {
      const res = await apiJson<{
        username: string;
        state: CloudState;
        updatedAt: number;
      }>("/api/sync", { token });

      const localEmpty = getCloudSnapshot().profiles.length === 0 && res.state.profiles.length > 0;
      if (localEmpty || res.updatedAt > (lastSyncedAt ?? 0)) {
        actions.hydrateFromCloud(res.state);
      }
      writeStoredAccount({ token, username, updatedAt: res.updatedAt });
      cloudStore.set((s) => ({
        ...s,
        syncing: false,
        lastSyncedAt: res.updatedAt,
        error: null,
      }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        cloudActions.logout({ keepLocal: true });
        return;
      }
      cloudStore.set((s) => ({
        ...s,
        syncing: false,
        error: err instanceof Error ? err.message : "Error de conexión",
      }));
    }
  },

  async syncNow() {
    if (pendingState) {
      await flushPush(false);
    } else if (cloudStore.get().token) {
      pendingState = getCloudSnapshot();
      await flushPush(false);
    }
  },

  enterGuest() {
    writeGuestMode(true);
    cloudStore.set((s) => ({ ...s, guestMode: true, error: null }));
    const snap = getCloudSnapshot();
    if (snap.profiles.length === 0) {
      const id = actions.addProfile({ name: "Invitado", avatar: 0, kids: false });
      actions.selectProfile(id);
    } else if (snap.profiles.length === 1 && !snap.profiles[0].pin) {
      actions.selectProfile(snap.profiles[0].id);
    }
  },

  logout(opts: { keepLocal?: boolean } = {}) {
    window.clearTimeout(pushTimer);
    pendingState = null;
    writeStoredAccount(null);
    writeGuestMode(false);
    cloudStore.set(() => ({
      token: null,
      username: null,
      guestMode: false,
      syncing: false,
      lastSyncedAt: null,
      error: null,
    }));
    if (!opts.keepLocal) {
      actions.clearAllProfiles();
    }
  },
};
