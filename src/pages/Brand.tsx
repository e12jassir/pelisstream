import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { isKidsSafe } from "../lib/cinemeta";
import { DedupeScope } from "../lib/dedupe";
import { cx } from "../lib/format";
import { EASE_GLIDE } from "../lib/motion";
import { navigate } from "../lib/router";
import { getPlatformCatalog, PLATFORMS } from "../lib/platforms";
import { useActiveProfile } from "../lib/store";
import type { MediaItem, PlatformId } from "../lib/types";
import { Hero } from "../components/Hero";
import { GUTTER, SourceRail } from "../components/Rail";
import { Top10Module } from "../components/Top10";
import { PlatformWordmark } from "../components/Wordmarks";

const GENRE_RAILS: Array<{ title: string; genres: string[]; variant?: "poster" }> = [
  { title: "Acción y aventura", genres: ["Action", "Adventure"] },
  { title: "Comedias", genres: ["Comedy"], variant: "poster" },
  { title: "Dramas que atrapan", genres: ["Drama"] },
  { title: "Ciencia ficción y fantasía", genres: ["Sci-Fi", "Fantasy"] },
  { title: "Crimen y suspenso", genres: ["Crime", "Thriller", "Mystery"], variant: "poster" },
  { title: "Terror", genres: ["Horror"] },
  { title: "Animación", genres: ["Animation", "Family"] },
  { title: "Documentales", genres: ["Documentary", "Biography", "History"] },
];

function usePlatformHero(platform: PlatformId, kids: boolean) {
  const [state, setState] = useState<{
    items: MediaItem[];
    loading: boolean;
    rank: Map<string, number>;
  }>({
    items: [],
    loading: true,
    rank: new Map(),
  });
  useEffect(() => {
    let alive = true;
    setState({ items: [], loading: true, rank: new Map() });
    Promise.all([
      getPlatformCatalog(platform, "series").catch(() => []),
      getPlatformCatalog(platform, "movie").catch(() => []),
    ]).then(([series, movies]) => {
      if (!alive) return;
      const rank = new Map<string, number>();
      series.forEach((s, i) => rank.set(s.id, i + 1));
      movies.forEach((m, i) => rank.set(m.id, i + 1));
      const ok = (i: MediaItem) => Boolean(i.background && i.synopsis) && (!kids || isKidsSafe(i));
      const s = series.filter(ok);
      const m = movies.filter(ok);
      const items: MediaItem[] = [];
      for (let i = 0; items.length < 7 && (i < s.length || i < m.length); i++) {
        if (s[i]) items.push(s[i]);
        if (m[i] && items.length < 7) items.push(m[i]);
      }
      setState({ items, loading: false, rank });
    });
    return () => {
      alive = false;
    };
  }, [platform, kids]);
  return state;
}

export function Brand({ platform }: { platform: PlatformId }) {
  const p = PLATFORMS[platform];
  const kids = useActiveProfile()?.kids ?? false;
  const hero = usePlatformHero(platform, kids);

  return (
    <div className="pb-28">
      <div className="relative">
        <Hero
          items={hero.items}
          loading={hero.loading}
          eyebrowFor={(item) => {
            const r = hero.rank.get(item.id);
            return (
              <span className="eyebrow text-fg/80">
                {r && r <= 10
                  ? `N.º ${r} en ${item.type === "series" ? "series" : "películas"} de ${p.name}`
                  : item.type === "series"
                    ? "Serie"
                    : "Película"}
              </span>
            );
          }}
        />
        {/* Brand masthead */}
        <motion.div
          key={platform}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_GLIDE }}
          className={cx(
            "absolute inset-x-0 top-24 flex items-start justify-between md:top-10",
            GUTTER,
          )}
        >
          <div>
            <div className="h-10 sm:h-12">
              <PlatformWordmark id={platform} />
            </div>
            <p className="mt-3 hidden max-w-sm text-sm text-fg/70 sm:block">{p.tagline}</p>
          </div>
          <button
            onClick={() => navigate({ name: "home" })}
            className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold backdrop-blur-xl refract"
          >
            <ArrowLeft className="size-4" />
            Todas las plataformas
          </button>
        </motion.div>
      </div>

      <DedupeScope key={platform}>
        <div className="relative z-10 -mt-14 space-y-9 sm:-mt-20 sm:space-y-11">
          <Top10Module key={platform} fixedPlatform={platform} kids={kids} />
          <SourceRail
            order={1}
            title={`Series populares en ${p.name}`}
            source={{ kind: "platform", platform, type: "series" }}
          />
          <SourceRail
            order={2}
            title={`Películas populares en ${p.name}`}
            source={{ kind: "platform", platform, type: "movie" }}
            variant="poster"
          />
          <SourceRail
            order={3}
            eyebrow="Aclamadas"
            title="Mejor calificadas"
            source={{ kind: "platform", platform, sort: "rating" }}
          />
          <SourceRail
            order={4}
            eyebrow="Recién llegados"
            title="Lo más reciente"
            source={{ kind: "platform", platform, sort: "recent" }}
          />
          {GENRE_RAILS.map((g, i) => (
            <SourceRail
              key={g.title}
              order={5 + i}
              title={g.title}
              variant={g.variant}
              source={{ kind: "platform", platform, genres: g.genres }}
            />
          ))}
        </div>
      </DedupeScope>
    </div>
  );
}
