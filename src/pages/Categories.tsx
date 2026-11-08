import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { genreLabel } from "../lib/cinemeta";
import { cx } from "../lib/format";
import { useCatalog, usePagedCatalog } from "../lib/hooks";
import { navigate } from "../lib/router";
import { useActiveProfile } from "../lib/store";
import type { MediaType } from "../lib/types";
import { HUBS, HubTile, MediaGrid, PageHeader, Segmented } from "../components/PageParts";
import { GUTTER } from "../components/Rail";
import { SmartImage } from "../components/SmartImage";

const KIDS_HUBS = ["Animation", "Family", "Adventure", "Comedy", "Fantasy"];

export function Categories() {
  const profile = useActiveProfile();
  const hubs = profile?.kids ? HUBS.filter((h) => KIDS_HUBS.includes(h.genre)) : HUBS;
  return (
    <div className="pb-28">
      <PageHeader
        eyebrow="Explorar"
        title="Categorías"
        subtitle="Universos, géneros y colecciones para encontrar exactamente lo que te apetece."
      />
      <div
        className={cx(
          "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
          GUTTER,
        )}
      >
        {hubs.map((hub, i) => (
          <HubTile key={hub.genre} hub={hub} index={i} />
        ))}
      </div>
    </div>
  );
}

export function Genre({ genre }: { genre: string }) {
  const hub = HUBS.find((h) => h.genre === genre);
  const [type, setType] = useState<MediaType>(hub?.type ?? "movie");
  const [sort, setSort] = useState<"top" | "imdbRating">("top");
  const profile = useActiveProfile();
  const blocked = profile?.kids && !KIDS_HUBS.includes(genre);
  const cover = useCatalog({ type, genre });
  const paged = usePagedCatalog(blocked ? null : { type, genre, catalog: sort });
  const banner = cover.items.find((i) => i.background);

  return (
    <div className="pb-28">
      <section className="relative h-[52vh] min-h-[380px] overflow-hidden">
        {banner && (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <SmartImage
              src={banner.background}
              alt=""
              loading="eager"
              className="animate-kenburns size-full object-cover"
            />
          </motion.div>
        )}
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{
            background: `linear-gradient(120deg, ${hub?.from ?? "#f0a640"}aa, ${hub?.to ?? "#2a1003"}ee)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className={cx("absolute inset-x-0 bottom-10", GUTTER)}>
          <button
            onClick={() => navigate({ name: "categories" })}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-fg/80 hover:text-fg"
          >
            <ArrowLeft className="size-4" /> Categorías
          </button>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 display text-6xl leading-none tracking-tight sm:text-8xl"
          >
            {genreLabel(genre)}
          </motion.h1>
          <div className="flex flex-wrap gap-3">
            <Segmented
              id="genre-type"
              value={type}
              onChange={setType}
              options={[
                { id: "movie", label: "Películas" },
                { id: "series", label: "Series" },
              ]}
            />
            <Segmented
              id="genre-sort"
              value={sort}
              onChange={setSort}
              options={[
                { id: "top", label: "Populares" },
                { id: "imdbRating", label: "Mejor valoradas" },
              ]}
            />
          </div>
        </div>
      </section>
      <div className="pt-6">
        <MediaGrid
          items={paged.items}
          loading={paged.loading && !blocked}
          done={paged.done}
          onMore={paged.loadMore}
          variant={type === "series" ? "poster" : "landscape"}
          empty={
            <p className="py-16 text-center text-muted">
              {blocked
                ? "Esta categoría no está disponible en perfiles infantiles."
                : "No hay títulos en esta categoría."}
            </p>
          }
        />
      </div>
    </div>
  );
}
