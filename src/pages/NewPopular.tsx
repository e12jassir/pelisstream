import { motion } from "motion/react";
import { Bell, BellRing, Check, Info, Play, Plus, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { currentYear, genreLabel } from "../lib/cinemeta";
import { cx, durationLabel, longDate, shortDate } from "../lib/format";
import { useCatalog } from "../lib/hooks";
import { actions, useProfileData } from "../lib/store";
import { ui } from "../lib/ui";
import type { MediaItem } from "../lib/types";
import { PageHeader, Segmented } from "../components/PageParts";
import { GUTTER } from "../components/Rail";
import { SmartImage, TitleLogo } from "../components/SmartImage";

type Tab = "releases" | "trending" | "top-series" | "top-movies";

export function NewPopular() {
  const [tab, setTab] = useState<Tab>("releases");
  const year = currentYear();
  const relMovies = useCatalog({ type: "movie", catalog: "year", genre: String(year) });
  const relSeries = useCatalog({ type: "series", catalog: "year", genre: String(year) });
  const topMovies = useCatalog({ type: "movie" });
  const topSeries = useCatalog({ type: "series" });

  const { items, loading, ranked } = useMemo(() => {
    switch (tab) {
      case "releases": {
        const merged = [...relMovies.items, ...relSeries.items]
          .filter((i) => i.released)
          .sort((a, b) => (b.released ?? "").localeCompare(a.released ?? ""))
          .slice(0, 24);
        return { items: merged, loading: relMovies.loading || relSeries.loading, ranked: false };
      }
      case "trending": {
        const out: MediaItem[] = [];
        for (let i = 0; i < 12; i++) {
          if (topMovies.items[i]) out.push(topMovies.items[i]);
          if (topSeries.items[i]) out.push(topSeries.items[i]);
        }
        return {
          items: out.slice(0, 20),
          loading: topMovies.loading || topSeries.loading,
          ranked: false,
        };
      }
      case "top-series":
        return { items: topSeries.items.slice(0, 10), loading: topSeries.loading, ranked: true };
      case "top-movies":
        return { items: topMovies.items.slice(0, 10), loading: topMovies.loading, ranked: true };
    }
  }, [tab, relMovies, relSeries, topMovies, topSeries]);

  return (
    <div className="pb-28">
      <PageHeader
        eyebrow="Novedades populares"
        title="Lo nuevo y lo que todos ven"
        subtitle="Estrenos recientes, lo más visto de la semana y los rankings del día."
      >
        <Segmented
          id="np"
          value={tab}
          onChange={setTab}
          options={[
            { id: "releases", label: "Estrenos" },
            { id: "trending", label: "Lo más visto" },
            { id: "top-series", label: "Top 10 series" },
            { id: "top-movies", label: "Top 10 películas" },
          ]}
        />
      </PageHeader>
      <div className={cx("space-y-14 sm:space-y-16", GUTTER)}>
        {loading && !items.length
          ? Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton aspect-[21/9] max-w-5xl rounded-2xl" />
            ))
          : items.map((item, i) => (
              <FeedRow key={`${tab}-${item.id}`} item={item} index={i} ranked={ranked} />
            ))}
      </div>
    </div>
  );
}

function FeedRow({ item, index, ranked }: { item: MediaItem; index: number; ranked: boolean }) {
  const data = useProfileData();
  const inList = data.list.includes(item.id);
  const reminded = data.reminders.includes(item.id);
  const date = shortDate(item.released);
  const upcoming = date ? date.date.getTime() > Date.now() : false;

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="grid max-w-6xl grid-cols-[3.25rem_1fr] gap-4 sm:grid-cols-[5.5rem_1fr] sm:gap-8"
    >
      <div className="pt-2 text-center">
        {ranked ? (
          <span className="numeric block text-6xl leading-none font-black tracking-[-0.06em] text-transparent [-webkit-text-stroke:2px_color-mix(in_oklab,var(--color-fg)_55%,transparent)] sm:text-8xl">
            {index + 1}
          </span>
        ) : date ? (
          <>
            <div className="text-xs font-bold tracking-[0.2em] text-muted sm:text-sm">
              {date.month}
            </div>
            <div className="display text-4xl leading-none sm:text-6xl">{date.day}</div>
          </>
        ) : null}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr] xl:gap-8">
        <button
          onClick={() => ui.openDetails(item)}
          className="group/feed relative aspect-video overflow-hidden rounded-2xl bg-surface text-left refract transition duration-500 hover:ring-white/25"
        >
          <SmartImage
            src={item.background}
            alt=""
            className="absolute inset-0 size-full object-cover transition-transform duration-[2s] ease-out-expo group-hover/feed:scale-[1.07]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-5 h-[32%] w-[55%]">
            <TitleLogo item={item} className="size-full" textClassName="text-3xl" />
          </div>
          <span className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full border border-white/40 bg-black/40 opacity-0 backdrop-blur-md transition duration-500 group-hover/feed:scale-100 group-hover/feed:opacity-100">
            <Info className="size-7" />
          </span>
          {upcoming && (
            <span className="absolute top-4 left-4 rounded-md bg-accent px-2 py-1 text-[11px] font-extrabold tracking-wider text-accent-ink uppercase">
              Próximamente
            </span>
          )}
        </button>
        <div className="flex flex-col justify-center">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {upcoming ? (
              <ActionPill
                active={reminded}
                onClick={() =>
                  ui.toast(
                    actions.toggleReminder(item)
                      ? "Te avisaremos del estreno"
                      : "Recordatorio eliminado",
                    "accent",
                  )
                }
                icon={reminded ? <BellRing className="size-4" /> : <Bell className="size-4" />}
              >
                {reminded ? "Recordatorio activo" : "Recordarme"}
              </ActionPill>
            ) : (
              <ActionPill
                primary
                onClick={() => ui.play(item)}
                icon={<Play className="size-4 fill-ink" />}
              >
                Reproducir
              </ActionPill>
            )}
            <ActionPill
              active={inList}
              onClick={() =>
                ui.toast(
                  actions.toggleList(item) ? "Agregado a Mi lista" : "Eliminado de Mi lista",
                  "success",
                )
              }
              icon={inList ? <Check className="size-4" /> : <Plus className="size-4" />}
            >
              Mi lista
            </ActionPill>
          </div>
          <p className="mb-1 text-sm font-semibold text-muted">
            {upcoming
              ? `Disponible el ${longDate(item.released)}`
              : item.released
                ? `Estrenado el ${longDate(item.released)}`
                : item.releaseInfo}
          </p>
          <h3 className="mb-2 text-2xl font-bold tracking-tight">{item.title}</h3>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 text-sm text-fg/75">
            <span>{item.type === "series" ? "Serie" : "Película"}</span>
            {durationLabel(item) && <span>{durationLabel(item)}</span>}
            {item.imdbRating > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-accent text-accent" /> {item.imdbRating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mb-3 line-clamp-4 leading-relaxed text-fg/80">{item.synopsis}</p>
          <div className="flex flex-wrap gap-1.5 text-sm text-muted">
            {item.genres.slice(0, 4).map((g, i) => (
              <span key={g} className="flex items-center gap-1.5">
                {i > 0 && <span className="size-1 rounded-full bg-dim" />}
                {genreLabel(g)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function ActionPill({
  children,
  icon,
  onClick,
  active,
  primary,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  primary?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
        primary
          ? "bg-fg text-ink hover:bg-white"
          : active
            ? "bg-accent/20 text-accent ring-1 ring-accent/50"
            : "bg-white/10 text-fg hover:bg-white/20",
      )}
    >
      {icon}
      {children}
    </motion.button>
  );
}
