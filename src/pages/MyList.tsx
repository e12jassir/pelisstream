import { motion } from "motion/react";
import { Bell, Bookmark, Clock, Heart, Play, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cx } from "../lib/format";
import { useKidsFilter } from "../lib/hooks";
import { navigate } from "../lib/router";
import { actions, useProfileData } from "../lib/store";
import { ui } from "../lib/ui";
import type { MediaItem } from "../lib/types";
import { ProgressBar } from "../components/Cards";
import { DoubleThumbs } from "../components/RateButton";
import { EmptyState, MediaGrid, PageHeader, Segmented } from "../components/PageParts";
import { GUTTER } from "../components/Rail";
import { SmartImage } from "../components/SmartImage";

type Tab = "list" | "continue" | "liked" | "reminders" | "history";
type Sort = "recent" | "az" | "rating";

export function MyList() {
  const data = useProfileData();
  const filter = useKidsFilter();
  const [tab, setTab] = useState<Tab>("list");
  const [sort, setSort] = useState<Sort>("recent");
  const [type, setType] = useState<"all" | "movie" | "series">("all");

  const resolve = (ids: string[]) =>
    filter(ids.map((id) => data.meta[id]).filter((x): x is MediaItem => Boolean(x)));

  const items = useMemo(() => {
    let ids: string[];
    switch (tab) {
      case "list":
        ids = data.list;
        break;
      case "continue":
        ids = Object.entries(data.progress)
          .filter(([, p]) => !p.completed)
          .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
          .map(([id]) => id);
        break;
      case "liked":
        ids = Object.entries(data.ratings)
          .filter(([, r]) => r !== "down")
          .sort((a, b) => (a[1] === "love" ? -1 : 0) - (b[1] === "love" ? -1 : 0))
          .map(([id]) => id);
        break;
      case "reminders":
        ids = data.reminders;
        break;
      case "history":
        ids = Object.entries(data.history)
          .sort((a, b) => b[1] - a[1])
          .map(([id]) => id);
        break;
    }
    let list = resolve(ids);
    if (type !== "all") list = list.filter((i) => i.type === type);
    if (tab === "list" && sort === "az")
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, "es"));
    if (tab === "list" && sort === "rating")
      list = [...list].sort((a, b) => b.imdbRating - a.imdbRating);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sort, type, data, filter]);

  const counts = {
    list: data.list.length,
    continue: Object.values(data.progress).filter((p) => !p.completed).length,
    liked: Object.values(data.ratings).filter((r) => r !== "down").length,
    reminders: data.reminders.length,
    history: Object.keys(data.history).length,
  };

  const tabLabel = (label: string, n: number) => (
    <span className="flex items-center gap-1.5">
      {label}
      {n > 0 && <span className="text-[11px] opacity-60">{n}</span>}
    </span>
  );

  const empties: Record<Tab, { icon: React.ReactNode; title: string; message: string }> = {
    list: {
      icon: <Bookmark className="size-9" />,
      title: "Tu lista está vacía",
      message: "Agrega películas y series con el botón + para verlas cuando quieras.",
    },
    continue: {
      icon: <Play className="size-9" />,
      title: "Nada en curso",
      message: "Lo que empieces a ver aparecerá aquí para retomarlo.",
    },
    liked: {
      icon: <Heart className="size-9" />,
      title: "Aún no calificas títulos",
      message: "Califica con el pulgar para mejorar tus recomendaciones.",
    },
    reminders: {
      icon: <Bell className="size-9" />,
      title: "Sin recordatorios",
      message: 'Activa "Recordarme" en los próximos estrenos desde Novedades.',
    },
    history: {
      icon: <Clock className="size-9" />,
      title: "Sin historial",
      message: "Tu historial de reproducción aparecerá aquí.",
    },
  };

  return (
    <div className="pb-28">
      <PageHeader
        eyebrow="Mis cosas"
        title="Mi lista"
        subtitle="Todo lo que guardaste, empezaste y te encantó, en un solo lugar."
      >
        <div className="flex flex-col gap-4">
          <Segmented
            id="mylist"
            value={tab}
            onChange={setTab}
            options={[
              { id: "list", label: tabLabel("Mi lista", counts.list) },
              { id: "continue", label: tabLabel("Continuar viendo", counts.continue) },
              { id: "liked", label: tabLabel("Me gustaron", counts.liked) },
              { id: "reminders", label: tabLabel("Recordatorios", counts.reminders) },
              { id: "history", label: tabLabel("Historial", counts.history) },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "movie", "series"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cx(
                  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                  type === t ? "bg-white/15 text-fg" : "text-muted hover:text-fg",
                )}
              >
                {t === "all" ? "Todo" : t === "movie" ? "Películas" : "Series"}
              </button>
            ))}
            {tab === "list" && (
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Ordenar"
                className="ml-auto rounded-full bg-white/[0.06] refract px-4 py-1.5 text-sm font-semibold text-fg outline-none"
              >
                <option value="recent">Agregados recientemente</option>
                <option value="az">A–Z</option>
                <option value="rating">Mejor valorados</option>
              </select>
            )}
            {tab === "history" && counts.history > 0 && (
              <button
                onClick={() => actions.clearHistory()}
                className="ml-auto text-sm font-semibold text-muted hover:text-danger"
              >
                Borrar historial
              </button>
            )}
          </div>
        </div>
      </PageHeader>

      {tab === "continue" ? (
        <div
          className={cx("grid gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", GUTTER)}
        >
          {items.map((item, i) => {
            const p = data.progress[item.id];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group/c relative"
              >
                <button
                  onClick={() => ui.play(item)}
                  className="relative block aspect-video w-full overflow-hidden rounded-xl bg-surface refract"
                >
                  <SmartImage
                    src={item.background}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover/c:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="absolute inset-x-3.5 bottom-3 text-left">
                    <div className="truncate font-bold">{item.title}</div>
                    <div className="text-xs text-muted">
                      {p.season ? `T${p.season}:E${p.episode} · ` : ""}
                      {Math.max(1, Math.round((p.duration - p.position) / 60))} min restantes
                    </div>
                    <ProgressBar
                      value={p.duration ? (p.position / p.duration) * 100 : 0}
                      className="mt-2"
                    />
                  </div>
                </button>
                <RemoveButton onClick={() => actions.removeProgress(item.id)} label="Quitar" />
              </motion.div>
            );
          })}
          {!items.length && (
            <div className="col-span-full">
              <EmptyState {...empties.continue} />
            </div>
          )}
        </div>
      ) : (
        <MediaGrid
          items={items}
          variant="poster"
          empty={
            <EmptyState
              {...empties[tab]}
              action={
                <button
                  onClick={() => navigate({ name: "home" })}
                  className="rounded-full bg-fg px-6 py-3 font-bold text-ink"
                >
                  Explorar el catálogo
                </button>
              }
            />
          }
          renderExtra={(item) =>
            tab === "list" ? (
              <RemoveButton onClick={() => actions.toggleList(item)} label="Quitar de Mi lista" />
            ) : tab === "reminders" ? (
              <RemoveButton
                onClick={() => actions.toggleReminder(item)}
                label="Quitar recordatorio"
              />
            ) : tab === "liked" && data.ratings[item.id] === "love" ? (
              <span className="pointer-events-none absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink">
                <DoubleThumbs className="size-3.5" />
              </span>
            ) : null
          }
        />
      )}
    </div>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute top-2.5 right-2.5 z-10 flex size-8 items-center justify-center rounded-full bg-black/65 text-fg opacity-0 backdrop-blur-md transition group-hover/c:opacity-100 hover:bg-black/90 [div:hover>&]:opacity-100 max-md:opacity-100"
    >
      <X className="size-4" />
    </button>
  );
}
