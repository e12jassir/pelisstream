import type { MediaItem } from "./types";

/**
 * Neither Cinemeta nor the streaming catalogs expose official certifications,
 * so this estimates an age band from genres (strictest genre wins).
 */
export function maturity(item: MediaItem): string {
  const g = new Set(item.genres);
  if (g.has("Horror")) return "18+";
  if (g.has("Crime") || g.has("Thriller") || g.has("War")) return "16+";
  if (
    [
      "Action",
      "Sci-Fi",
      "Mystery",
      "Drama",
      "Biography",
      "History",
      "Western",
      "Romance",
      "Sport",
    ].some((x) => g.has(x))
  )
    return "13+";
  if (g.has("Animation") || g.has("Family")) return "7+";
  return "ATP";
}

export const MATURITY_HINT = "Clasificación estimada según el género";
