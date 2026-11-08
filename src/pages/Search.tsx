import { AnimatePresence, motion } from "motion/react";
import { Clock, Search as SearchIcon, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchAll } from "../lib/cinemeta";
import { cx } from "../lib/format";
import { useCatalog, useDebounced, useKidsFilter } from "../lib/hooks";
import { navigate } from "../lib/router";
import { actions, useActiveProfile, useProfileData } from "../lib/store";
import { ui } from "../lib/ui";
import type { MediaItem } from "../lib/types";
import { HUBS, HubTile, MediaGrid, Segmented } from "../components/PageParts";
import { GUTTER } from "../components/Rail";
import { SmartImage } from "../components/SmartImage";
import { searchAnime } from "../core/extractors/anime.extractor";

type Filter = "all" | "movie" | "series" | "anime";

export function Search({ initial }: { initial?: string }) {
  const [query, setQuery] = useState(initial ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const debounced = useDebounced(query.trim(), 380);
  const [results, setResults] = useState<{ q: string; items: MediaItem[] }>({ q: "", items: [] });
  const [loading, setLoading] = useState(false);
  const kidsFilter = useKidsFilter();
  const profile = useActiveProfile();
  const data = useProfileData();
  const input = useRef<HTMLInputElement>(null);
  const popular = useCatalog(
    profile?.kids ? { type: "movie", genre: "Animation" } : { type: "movie" },
  );

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    navigate({ name: "search", q: debounced || undefined }, { replace: true });
    if (debounced.length < 2) {
      setResults({ q: "", items: [] });
      return;
    }
    let alive = true;
    setLoading(true);

    Promise.all([
      searchAll(debounced).catch(() => []),
      searchAnime(debounced).catch(() => []),
    ]).then(([cinemetaItems, animeResults]) => {
      if (!alive) return;

      const animeItems: MediaItem[] = (animeResults || []).map((a) => ({
        id: `anime-${a.id}`,
        type: "series",
        title: a.title,
        poster: a.poster || "",
        background: a.poster || "",
        logo: "",
        year: "Anime",
        releaseInfo: "HiAnime Stream",
        imdbRating: 8.8,
        genres: ["Anime", "Animación", "Japón"],
        synopsis: `Serie Anime: ${a.title}. Stream HLS extraído directamente vía motor ani-cli / HiAnime sin anuncios.`,
        cast: [],
        director: [],
        writer: [],
        trailers: [],
      }));

      const combined = [...cinemetaItems, ...animeItems];
      setResults({ q: debounced, items: combined });
      setLoading(false);
      if (combined.length) actions.addRecentSearch(debounced);
    });

    return () => {
      alive = false;
    };
  }, [debounced]);

  const visible = useMemo(
    () =>
      kidsFilter(results.items).filter((i) => {
        if (filter === "all") return true;
        if (filter === "anime") {
          return i.id.startsWith("anime-") || i.genres?.some((g) => g.toLowerCase().includes("anime"));
        }
        if (filter === "movie") return i.type === "movie" && !i.id.startsWith("anime-");
        if (filter === "series") return i.type === "series" && !i.id.startsWith("anime-");
        return true;
      }),
    [results.items, filter, kidsFilter],
  );
  const searching = debounced.length >= 2;
  const hubs = profile?.kids
    ? HUBS.filter((h) =>
        ["Animation", "Family", "Adventure", "Comedy", "Fantasy"].includes(h.genre),
      )
    : HUBS.slice(0, 12);

  return (
    <div className="min-h-screen pb-28">
      <div className={cx("pt-32 pb-8 md:pt-16", GUTTER)}>
        <motion.label
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="group/search relative flex items-center gap-4 border-b-2 border-line-hi pb-4 transition-colors focus-within:border-accent"
        >
          <SearchIcon className="size-8 shrink-0 text-dim transition-colors group-focus-within/search:text-accent sm:size-10" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Películas, series, géneros…"
            aria-label="Buscar"
            className="w-full bg-transparent display text-3xl tracking-tight outline-none placeholder:text-white/20 sm:text-5xl lg:text-6xl"
          />
          {loading && (
            <span className="size-6 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
          )}
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Borrar búsqueda"
              className="shrink-0 rounded-full p-2 text-muted hover:bg-white/10 hover:text-fg"
            >
              <X className="size-6" />
            </button>
          )}
        </motion.label>
      </div>

      <AnimatePresence mode="wait">
        {searching ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={cx("mb-6 flex flex-wrap items-center justify-between gap-3", GUTTER)}>
              <p className="text-muted">
                {loading && results.q !== debounced
                  ? "Buscando…"
                  : `${visible.length} resultados para “${results.q || debounced}”`}
              </p>
              <Segmented
                id="search-filter"
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: "Todo" },
                  { id: "movie", label: "Películas" },
                  { id: "series", label: "Series" },
                  { id: "anime", label: "Anime" },
                ]}
              />
            </div>
            <MediaGrid
              items={visible}
              loading={loading && results.q !== debounced}
              variant="poster"
              empty={
                <div className="py-16 text-center">
                  <p className="mb-2 text-xl font-bold">No encontramos “{debounced}”</p>
                  <p className="text-muted">
                    Prueba con otro título, actor o revisa la ortografía.
                  </p>
                </div>
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="discover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-12"
          >
            {data.recentSearches.length > 0 && (
              <section className={GUTTER}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Búsquedas recientes</h2>
                  <button
                    onClick={() => actions.clearRecentSearches()}
                    className="text-sm font-semibold text-muted hover:text-fg"
                  >
                    Borrar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.recentSearches.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuery(q)}
                      className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] refract px-4 py-2 text-sm font-semibold text-muted transition hover:border-white/40 hover:text-fg"
                    >
                      <Clock className="size-3.5" />
                      {q}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className={cx("grid gap-10 xl:grid-cols-[1fr_1.4fr]", GUTTER)}>
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <TrendingUp className="size-5 text-accent" />
                  Búsquedas populares
                </h2>
                <ol className="space-y-1">
                  {(popular.loading ? [] : popular.items.slice(0, 8)).map((item, i) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <button
                        onClick={() => ui.openDetails(item)}
                        className="group/pop flex w-full items-center gap-4 rounded-xl p-2 text-left transition hover:bg-white/[0.05]"
                      >
                        <span className="w-6 text-center display text-2xl text-dim group-hover/pop:text-accent">
                          {i + 1}
                        </span>
                        <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-surface">
                          <SmartImage
                            src={item.background}
                            alt=""
                            className="size-full object-cover"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{item.title}</span>
                          <span className="text-sm text-muted">{item.year}</span>
                        </span>
                      </button>
                    </motion.li>
                  ))}
                  {popular.loading &&
                    Array.from({ length: 6 }, (_, i) => (
                      <div key={i} className="skeleton h-16 rounded-xl" />
                    ))}
                </ol>
              </div>
              <div>
                <h2 className="mb-4 text-lg font-bold">Explorar por género</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {hubs.map((hub, i) => (
                    <HubTile key={hub.genre} hub={hub} index={i} />
                  ))}
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
