import { useEffect } from "react";

export interface Palette {
  ink: string;
  raised: string;
  surface: string;
  surfaceHi: string;
  fg: string;
  muted: string;
  dim: string;
  accent: string;
  accentHi: string;
  accentInk: string;
}

export type ThemeId = "ember" | "midnight" | "crimson" | "cobalt" | "aurora" | "jade";

export const THEMES: Record<ThemeId, { name: string; description: string; palette: Palette }> = {
  ember: {
    name: "Ámbar",
    description: "La firma cálida de PelisStream.",
    palette: {
      ink: "#090807",
      raised: "#15110f",
      surface: "#1c1714",
      surfaceHi: "#29221d",
      fg: "#f5ede2",
      muted: "#b8ab9b",
      dim: "#85786a",
      accent: "#f0a640",
      accentHi: "#ffc372",
      accentInk: "#1a0f02",
    },
  },
  midnight: {
    name: "Medianoche OLED",
    description: "Negro puro y platino, al estilo tvOS.",
    palette: {
      ink: "#000000",
      raised: "#0c0c0d",
      surface: "#141416",
      surfaceHi: "#1f1f22",
      fg: "#f5f5f7",
      muted: "#a1a1a6",
      dim: "#6e6e73",
      accent: "#f5f5f7",
      accentHi: "#ffffff",
      accentInk: "#000000",
    },
  },
  crimson: {
    name: "Carmesí",
    description: "Rojo de sala de cine, intenso y nocturno.",
    palette: {
      ink: "#0a0606",
      raised: "#150c0c",
      surface: "#1e1213",
      surfaceHi: "#2b1a1b",
      fg: "#f7eeee",
      muted: "#bba7a8",
      dim: "#866f71",
      accent: "#e50914",
      accentHi: "#ff4d55",
      accentInk: "#ffffff",
    },
  },
  cobalt: {
    name: "Cobalto",
    description: "Azul eléctrico con sombras índigo.",
    palette: {
      ink: "#05060d",
      raised: "#0c0f1d",
      surface: "#131729",
      surfaceHi: "#1d2238",
      fg: "#eef0fb",
      muted: "#a3a8c3",
      dim: "#6c7191",
      accent: "#6d7bff",
      accentHi: "#9aa4ff",
      accentInk: "#ffffff",
    },
  },
  aurora: {
    name: "Aurora",
    description: "Cian boreal sobre azul profundo.",
    palette: {
      ink: "#040a10",
      raised: "#0a1520",
      surface: "#10202d",
      surfaceHi: "#19303f",
      fg: "#eaf6fb",
      muted: "#9fb8c4",
      dim: "#66828f",
      accent: "#2fd4e8",
      accentHi: "#8beef8",
      accentInk: "#031418",
    },
  },
  jade: {
    name: "Jade",
    description: "Verde esmeralda, sereno y elegante.",
    palette: {
      ink: "#050a08",
      raised: "#0c1512",
      surface: "#121e19",
      surfaceHi: "#1b2c25",
      fg: "#edf7f2",
      muted: "#a0b8ac",
      dim: "#688276",
      accent: "#3ddc97",
      accentHi: "#8cf2c5",
      accentInk: "#04140d",
    },
  },
};

const VAR_MAP: Record<keyof Palette, string> = {
  ink: "--color-ink",
  raised: "--color-raised",
  surface: "--color-surface",
  surfaceHi: "--color-surface-hi",
  fg: "--color-fg",
  muted: "--color-muted",
  dim: "--color-dim",
  accent: "--color-accent",
  accentHi: "--color-accent-hi",
  accentInk: "--color-accent-ink",
};

export function applyPalette(p: Palette) {
  const root = document.documentElement.style;
  for (const key of Object.keys(VAR_MAP) as Array<keyof Palette>)
    root.setProperty(VAR_MAP[key], p[key]);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p.ink);
}

/** Applies the active palette to :root whenever it changes. */
export function usePalette(p: Palette) {
  useEffect(() => applyPalette(p), [p]);
}
