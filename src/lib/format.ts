import type { MediaItem } from "./types";

export const formatRuntime = (minutes?: number) => {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

export const durationLabel = (item: MediaItem) =>
  item.type === "series"
    ? item.totalSeasons
      ? `${item.totalSeasons} ${item.totalSeasons === 1 ? "temporada" : "temporadas"}`
      : ""
    : formatRuntime(item.runtimeMinutes);

export const formatClock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
export const shortDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { month: MONTHS[d.getUTCMonth()], day: String(d.getUTCDate()).padStart(2, "0"), date: d };
};

export const longDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
};

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/** "2024–" (ongoing) reads better as "Desde 2024"; "2011–2019" stays as a range. */
export const yearLabel = (item: MediaItem) => {
  const info = (item.releaseInfo || item.year || "").trim();
  return /^\d{4}[–-]$/.test(info) ? `Desde ${info.slice(0, 4)}` : info;
};
