import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "./_lib/db.js";

interface ImdbSuggestionItem {
  id?: string;
  l?: string;
  qid?: string;
  q?: string;
  y?: number;
  yr?: string;
  i?: { imageUrl?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (raw.length < 2) {
    return res.status(200).json({ items: [] });
  }

  const clean = raw.toLowerCase().replace(/[^a-z0-9\sáéíóúñü.-]/gi, " ").trim();
  const first = clean.charAt(0).replace(/[^a-z0-9]/i, "x") || "x";
  const url = `https://v3.sg.media-imdb.com/suggestion/${encodeURIComponent(first)}/${encodeURIComponent(clean)}.json`;

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!upstream.ok) {
      return res.status(200).json({ items: [] });
    }
    const json = (await upstream.json()) as { d?: ImdbSuggestionItem[] };
    const items = (json.d ?? [])
      .filter((x) => {
        if (!x.id?.startsWith("tt") || !x.l || !x.i?.imageUrl) return false;
        const kind = (x.qid || x.q || "").toLowerCase();
        return (
          kind.includes("movie") ||
          kind.includes("feature") ||
          kind.includes("tvseries") ||
          kind.includes("tv series") ||
          kind.includes("tvminiseries") ||
          kind.includes("mini series")
        );
      })
      .slice(0, 12)
      .map((x) => {
        const kind = (x.qid || x.q || "").toLowerCase();
        const isSeries = kind.includes("series");
        return {
          id: x.id!,
          type: isSeries ? "series" : "movie",
          title: x.l!,
          year: x.y ? String(x.y) : x.yr || "",
          poster: `https://images.metahub.space/poster/medium/${x.id}/img`,
          posterFallback: x.i!.imageUrl!,
        };
      });

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ items });
  } catch {
    return res.status(200).json({ items: [] });
  }
}
