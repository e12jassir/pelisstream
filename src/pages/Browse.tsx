import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, Rows3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { currentYear, genreLabel, type CatalogId, type CatalogQuery } from "../lib/cinemeta";
import { DedupeScope } from "../lib/dedupe";
import { cx } from "../lib/format";
import { usePagedCatalog } from "../lib/hooks";
import { EASE_SPRING } from "../lib/motion";
import { PLATFORM_ORDER, PLATFORMS } from "../lib/platforms";
import { useSource, type SortMode } from "../lib/sources";
import { useActiveProfile } from "../lib/store";
import type { MediaItem, MediaType } from "../lib/types";
import { Hero } from "../components/Hero";
import { ContinueRail } from "../components/HomeRails";
import { MediaGrid } from "../components/PageParts";
import { GUTTER, SourceRail } from "../components/Rail";
import { Top10Module } from "../components/Top10";
import { PlatformWordmark } from "../components/Wordmarks";

const GENRE_CHIPS: Array<{ id: string | null; label: string }> = [
  { id: null, label: "Todos" },
  { id: "Action", label: "Acción" },
  { id: "Sci-Fi", label: "Ciencia ficción" },
  { id: "Drama", label: "Drama" },
  { id: "Thriller", label: "Suspenso" },
  { id: "Comedy", label: "Comedia" },
  { id: "Horror", label: "Terror" },
  { id: "Animation", label: "Animación" },
];
const KIDS_CHIPS = GENRE_CHIPS.filter(
  (g) => g.id === null || ["Animation", "Comedy"].includes(g.id),
);
const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: "trending", label: "Tendencias" },
  { id: "rating", label: "Mejor calificadas" },
  { id: "recent", label: "Más recientes" },
];
const CATALOG_FOR: Record<SortMode, CatalogId> = {
  trending: "top",
  rating: "imdbRating",
  recent: "year",
};
const EXTRA_GENRES = ["Crime", "Mystery", "Fantasy", "Romance", "Documentary", "Adventure"];

type View = "rails" | "grid";

function catalogQuery(
  type: MediaType,
  sort: SortMode,
  genre: string | null,
  kids: boolean,
): CatalogQuery {
  const g = genre ?? (kids ? "Animation" : undefined);
  // The "year" catalog is keyed by year, so genre filtering happens client-side.
  if (sort === "recent") return { type, catalog: "year", genre: String(currentYear()) };
  return { type, catalog: CATALOG_FOR[sort], genre: g };
}

export function Browse({ type }: { type: MediaType }) {
  const kids = useActiveProfile()?.kids ?? false;
  const [genre, setGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("trending");
  const [view, setView] = useState<View>("rails");
  const [scrolled, setScrolled] = useState(false);
  const label = type === "movie" ? "Películas" : "Series";

  useEffect(() => {
    setGenre(null);
    setSort("trending");
    setView("rails");
  }, [type]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const main = catalogQuery(type, sort, genre, kids);
  const genreFilter = useMemo(
    () => (sort === "recent" && genre ? (i: MediaItem) => i.genres.includes(genre) : undefined),
    [sort, genre],
  );
  const heroSource = useSource({
    kind: "catalog",
    query: catalogQuery(type, sort === "recent" ? "trending" : sort, genre, kids),
  });
  const heroItems = heroSource.items.filter((i) => i.background && i.synopsis).slice(0, 6);
  const paged = usePagedCatalog(view === "grid" ? main : null, genreFilter);
  const chips = kids ? KIDS_CHIPS : GENRE_CHIPS;
  const sortLabel = SORTS.find((s) => s.id === sort)!.label;

  return (
    <div className="pb-28">
      {/* Editorial filter bar */}
      <div className={cx("relative z-10 mt-[76px] md:sticky md:top-0 md:z-30 md:mt-0")}>
        <div
          className={cx(
            "glass absolute inset-0 hidden transition-opacity duration-500 refract md:block",
            scrolled || view === "grid" ? "opacity-100" : "opacity-0",
          )}
        />
        <div className={cx("relative flex flex-wrap items-center gap-x-6 gap-y-3 py-4", GUTTER)}>
          <h1 className="display text-[1.9rem] sm:text-[2.3rem]">{label}</h1>
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto max-md:-mx-5 max-md:w-[calc(100%+2.5rem)] max-md:px-5 md:-mx-1 md:max-w-full md:px-1">
            {chips.map((c) => {
              const active = genre === c.id;
              return (
                <button
                  key={c.label}
                  onClick={() => setGenre(c.id)}
                  aria-pressed={active}
                  className={cx(
                    "relative h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold",
                    active ? "text-ink" : "text-fg/70 hover:text-fg",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`genre-${type}`}
                      transition={{ duration: 0.5, ease: EASE_SPRING }}
                      className="absolute inset-0 rounded-full bg-fg"
                    />
                  )}
                  <span className="relative">{c.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 max-md:no-scrollbar max-md:-mx-5 max-md:w-[calc(100%+2.5rem)] max-md:overflow-x-auto max-md:px-5 lg:ml-auto">
            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-white/[0.06] p-1 refract">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  aria-pressed={sort === s.id}
                  className={cx(
                    "relative h-8 shrink-0 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold md:px-3 md:text-[13px]",
                    sort === s.id ? "text-ink" : "text-muted hover:text-fg",
                  )}
                >
                  {sort === s.id && (
                    <motion.span
                      layoutId={`sort-${type}`}
                      transition={{ duration: 0.5, ease: EASE_SPRING }}
                      className="absolute inset-0 rounded-full bg-fg"
                    />
                  )}
                  <span className="relative">{s.label}</span>
                </button>
              ))}
            </div>
            <div
              className="flex shrink-0 items-center gap-0.5 rounded-full bg-white/[0.06] p-1 refract"
              role="group"
              aria-label="Vista"
            >
              {(
                [
                  ["rails", Rows3, "Carruseles"],
                  ["grid", LayoutGrid, "Cuadrícula"],
                ] as const
              ).map(([id, Icon, name]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  aria-label={name}
                  title={name}
                  className={cx(
                    "relative flex size-8 items-center justify-center rounded-full",
                    view === id ? "text-ink" : "text-muted hover:text-fg",
                  )}
                >
                  {view === id && (
                    <motion.span
                      layoutId={`view-${type}`}
                      transition={{ duration: 0.5, ease: EASE_SPRING }}
                      className="absolute inset-0 rounded-full bg-fg"
                    />
                  )}
                  <Icon className="relative size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "rails" ? (
          <motion.div
            key="rails"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="md:-mt-[78px]">
              <Hero
                items={heroItems}
                loading={heroSource.loading}
                eyebrowFor={() => (
                  <span className="eyebrow text-fg/80">
                    {label}
                    {genre ? ` · ${genreLabel(genre)}` : ""} · {sortLabel}
                  </span>
                )}
              />
            </div>
            <DedupeScope key={`${type}-${genre}-${sort}`}>
              <div className="relative z-10 -mt-14 space-y-9 sm:-mt-20 sm:space-y-11">
                {!genre && sort === "trending" && (
                  <ContinueRail title={`Continuar viendo ${label.toLowerCase()}`} type={type} />
                )}
                {!genre && sort === "trending" && <Top10Module kids={kids} key={type} />}
                <SourceRail
                  order={1}
                  title={`${genre ? genreLabel(genre) : `Todas las ${label.toLowerCase()}`} · ${sortLabel.toLowerCase()}`}
                  source={{ kind: "catalog", query: main }}
                  exclude={genreFilter ? (i) => !genreFilter(i) : undefined}
                  variant={type === "series" ? "poster" : "landscape"}
                  limit={30}
                />
                {PLATFORM_ORDER.map((pid, i) => (
                  <SourceRail
                    key={pid}
                    order={2 + i}
                    eyebrow={
                      <span className="inline-flex h-3.5 text-fg/90">
                        <PlatformWordmark id={pid} mono />
                      </span>
                    }
                    title={`${label}${genre ? ` de ${genreLabel(genre).toLowerCase()}` : ""} en ${PLATFORMS[pid].name}`}
                    source={{
                      kind: "platform",
                      platform: pid,
                      type,
                      genres: genre ? [genre] : undefined,
                      sort,
                    }}
                    variant={i % 2 ? "poster" : "landscape"}
                    minItems={5}
                  />
                ))}
                {!genre &&
                  !kids &&
                  EXTRA_GENRES.map((g, i) => (
                    <SourceRail
                      key={g}
                      order={10 + i}
                      title={genreLabel(g)}
                      source={{
                        kind: "catalog",
                        query: {
                          type,
                          catalog: sort === "rating" ? "imdbRating" : "top",
                          genre: g,
                        },
                      }}
                      variant={i % 2 ? "landscape" : "poster"}
                      onSeeAll={() => setGenre(GENRE_CHIPS.some((c) => c.id === g) ? g : null)}
                    />
                  ))}
              </div>
            </DedupeScope>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pt-8"
          >
            <p className={cx("numeric mb-6 text-sm text-muted", GUTTER)}>
              {genre ? genreLabel(genre) : "Todos los géneros"} · {sortLabel}
              {!paged.loading && ` · ${paged.items.length} títulos`}
            </p>
            <MediaGrid
              items={paged.items}
              loading={paged.loading}
              done={paged.done}
              onMore={paged.loadMore}
              variant={type === "series" ? "poster" : "landscape"}
              empty={
                <p className="py-20 text-center text-muted">
                  No encontramos títulos con estos filtros.
                </p>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
