import { load, mapMetas } from "./cinemeta";
import type { Palette } from "./themes";
import type { MediaItem, MediaType, PlatformId } from "./types";

/** Public instance of the Stremio "Streaming Catalogs" addon (rleroi). */
const STREAMING_BASE = "https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club";

export interface Platform {
  id: PlatformId;
  name: string;
  tagline: string;
  palette: Palette;
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  nfx: {
    id: "nfx",
    name: "Netflix",
    tagline: "Series que marcan conversación y películas para maratonear.",
    palette: {
      ink: "#0b0b0b",
      raised: "#141414",
      surface: "#1c1c1c",
      surfaceHi: "#2a2a2a",
      fg: "#ffffff",
      muted: "#b3b3b3",
      dim: "#808080",
      accent: "#e50914",
      accentHi: "#ff3b44",
      accentInk: "#ffffff",
    },
  },
  hbm: {
    id: "hbm",
    name: "HBO Max",
    tagline: "Prestigio HBO, sagas de Warner Bros. y el universo DC.",
    palette: {
      ink: "#03040c",
      raised: "#0a0c1e",
      surface: "#11142b",
      surfaceHi: "#1b1f3d",
      fg: "#f2f3ff",
      muted: "#a6abd0",
      dim: "#6d7299",
      accent: "#4a63ff",
      accentHi: "#93a2ff",
      accentInk: "#ffffff",
    },
  },
  dnp: {
    id: "dnp",
    name: "Disney+",
    tagline: "Disney, Pixar, Marvel, Star Wars y National Geographic.",
    palette: {
      ink: "#030b1a",
      raised: "#08152c",
      surface: "#0e1f3b",
      surfaceHi: "#172c4f",
      fg: "#f1f6ff",
      muted: "#a3b4d1",
      dim: "#6a7e9f",
      accent: "#14c6ff",
      accentHi: "#86e3ff",
      accentInk: "#021220",
    },
  },
  atp: {
    id: "atp",
    name: "Apple TV+",
    tagline: "Apple Originals con una factura cinematográfica impecable.",
    palette: {
      ink: "#000000",
      raised: "#0c0c0d",
      surface: "#151517",
      surfaceHi: "#202023",
      fg: "#f5f5f7",
      muted: "#a1a1a6",
      dim: "#6e6e73",
      accent: "#f5f5f7",
      accentHi: "#ffffff",
      accentInk: "#000000",
    },
  },
  amp: {
    id: "amp",
    name: "Prime Video",
    tagline: "Amazon Originals, estrenos de cine y clásicos de culto.",
    palette: {
      ink: "#060b12",
      raised: "#0f1722",
      surface: "#16212f",
      surfaceHi: "#212f40",
      fg: "#f2f6fa",
      muted: "#a5b2c0",
      dim: "#6b7a8a",
      accent: "#1a98ff",
      accentHi: "#7cc4ff",
      accentInk: "#ffffff",
    },
  },
};

export const PLATFORM_ORDER: PlatformId[] = ["nfx", "hbm", "dnp", "atp", "amp"];
export const isPlatformId = (v: string): v is PlatformId => v in PLATFORMS;

export function getPlatformCatalog(platform: PlatformId, type: MediaType): Promise<MediaItem[]> {
  return load(`${STREAMING_BASE}/catalog/${type}/${platform}.json`, (raw) =>
    mapMetas(raw, type).map((item) => ({ ...item, source: platform })),
  );
}

/** Movies and series of a platform interleaved by rank. */
export async function getPlatformMix(platform: PlatformId): Promise<MediaItem[]> {
  const [series, movies] = await Promise.all([
    getPlatformCatalog(platform, "series").catch(() => []),
    getPlatformCatalog(platform, "movie").catch(() => []),
  ]);
  return interleave([series, movies]);
}

export function interleave(lists: MediaItem[][], limit = Infinity): MediaItem[] {
  const out: MediaItem[] = [];
  const seen = new Set<string>();
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max && out.length < limit; i++) {
    for (const list of lists) {
      const item = list[i];
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}
