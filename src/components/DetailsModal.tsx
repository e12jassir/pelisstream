import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  BellRing,
  Check,
  ChevronDown,
  CircleCheck,
  Film,
  Play,
  Plus,
  Share2,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { genreLabel } from "../lib/cinemeta";
import { cx, durationLabel, longDate, yearLabel } from "../lib/format";
import { useBodyLock, useCatalog, useMeta } from "../lib/hooks";
import { hover } from "../lib/hover";
import { maturity, MATURITY_HINT } from "../lib/maturity";
import { PLATFORMS } from "../lib/platforms";
import { navigate } from "../lib/router";
import { actions, useProfileData } from "../lib/store";
import { matchScore, useAffinities } from "../lib/taste";
import { ui, useUi } from "../lib/ui";
import { episodeKey, type Episode, type MediaItem } from "../lib/types";
import { Bezel } from "./Bezel";
import { GlassButton, IconButton, PrimaryButton } from "./Buttons";
import { RateButton } from "./RateButton";
import { SmartImage, TitleLogo } from "./SmartImage";
import { YouTubeBackdrop } from "./YouTubeBackdrop";

export function DetailsModal() {
  const item = useUi((s) => s.details);
  const playerOpen = useUi((s) => Boolean(s.player));
  useBodyLock(Boolean(item));

  useEffect(() => {
    if (!item) return;
    hover.close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !playerOpen) ui.closeDetails();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, playerOpen]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="details"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.05 } }}
          className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && ui.closeDetails()}
          role="dialog"
          aria-modal="true"
          aria-label={item.title}
        >
          <div
            className="flex min-h-full justify-center px-0 sm:px-4 sm:py-8 md:py-10"
            onClick={(e) => e.target === e.currentTarget && ui.closeDetails()}
          >
            <Content key={item.id} item={item} paused={playerOpen} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type Tab = "episodes" | "similar" | "about";

function Content({ item: base, paused }: { item: MediaItem; paused: boolean }) {
  const { details, loading } = useMeta(base);
  const item = details?.item
    ? { ...base, ...details.item, logo: base.logo || details.item.logo }
    : base;
  const episodes = details?.episodes ?? [];
  const data = useProfileData();
  const aff = useAffinities(data);
  const inList = data.list.includes(item.id);
  const reminded = data.reminders.includes(item.id);
  const progress = data.progress[item.id];
  const upcoming = item.released ? new Date(item.released).getTime() > Date.now() : false;
  const { autoplayPreviews, previewSound } = data.settings;
  const isSeries = item.type === "series";

  const [tab, setTab] = useState<Tab>(isSeries ? "episodes" : "similar");
  const [videoOn, setVideoOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(!previewSound);
  const trailer = item.trailers[0];

  useEffect(() => {
    if (!autoplayPreviews || !trailer || paused) {
      setVideoOn(false);
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setVideoOn(true), 1200);
    return () => window.clearTimeout(t);
  }, [autoplayPreviews, trailer, paused]);

  const resumeLabel = (() => {
    if (!progress || progress.completed) return "Reproducir";
    if (isSeries && progress.season && progress.episode)
      return `Continuar T${progress.season}:E${progress.episode}`;
    return progress.position > 20 ? "Continuar" : "Reproducir";
  })();

  const share = async () => {
    const url = `https://www.imdb.com/title/${item.id}/`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else {
        await navigator.clipboard.writeText(url);
        ui.toast("Enlace copiado al portapapeles", "success");
      }
    } catch {
      /* share dismissed */
    }
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    ...(isSeries ? [{ id: "episodes" as const, label: "Episodios" }] : []),
    { id: "similar", label: "Más títulos similares" },
    { id: "about", label: "Detalles" },
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 60, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
      className="relative w-full max-w-[1012px] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
    >
      <Bezel
        radius={30}
        pad={6}
        className="max-sm:rounded-none max-sm:border-0 max-sm:p-0"
        coreClassName="max-sm:rounded-none"
      >
        {/* Media header */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink sm:aspect-[16/8.4]">
          <div
            className={cx(
              "absolute inset-0 transition-opacity duration-1000",
              playing && "opacity-0",
            )}
          >
            <SmartImage
              src={item.background}
              alt=""
              loading="eager"
              className="animate-kenburns absolute inset-0 size-full object-cover"
            />
          </div>
          {videoOn && trailer && (
            <div
              className={cx(
                "absolute inset-0 transition-opacity duration-1000",
                playing ? "opacity-100" : "opacity-0",
              )}
            >
              <YouTubeBackdrop
                videoId={trailer}
                muted={muted}
                onPlaying={() => setPlaying(true)}
                onEnded={() => {
                  setPlaying(false);
                  setVideoOn(false);
                }}
                onError={() => setVideoOn(false)}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-raised via-raised/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-raised/70 via-transparent to-transparent" />

          <button
            onClick={() => ui.closeDetails()}
            aria-label="Cerrar"
            className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/55 text-fg backdrop-blur-xl transition-transform duration-500 ease-[var(--ease-spring)] refract hover:scale-110"
          >
            <X className="size-5" />
          </button>

          <div className="absolute inset-x-5 bottom-5 sm:inset-x-10 sm:bottom-9">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, scale: playing ? 0.85 : 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              style={{ transformOrigin: "left bottom" }}
              className="mb-5 h-20 w-[min(380px,70vw)] sm:h-28"
            >
              <TitleLogo item={item} className="size-full" textClassName="text-4xl sm:text-5xl" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="flex flex-wrap items-center gap-2.5"
            >
              {upcoming ? (
                <PrimaryButton
                  onClick={() =>
                    ui.toast(
                      actions.toggleReminder(item)
                        ? "Te avisaremos cuando se estrene"
                        : "Recordatorio eliminado",
                      "accent",
                    )
                  }
                >
                  {reminded ? <BellRing className="size-5" /> : <Bell className="size-5" />}
                  {reminded ? "Recordatorio activo" : "Recordarme"}
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  onClick={() =>
                    ui.play(
                      item,
                      progress?.season && progress.episode
                        ? { season: progress.season, episode: progress.episode }
                        : undefined,
                      "stream",
                    )
                  }
                >
                  <Play className="size-5 fill-ink" />
                  {resumeLabel}
                </PrimaryButton>
              )}
              {trailer && (
                <GlassButton
                  onClick={() =>
                    ui.play(
                      item,
                      progress?.season && progress.episode
                        ? { season: progress.season, episode: progress.episode }
                        : undefined,
                      "trailer",
                    )
                  }
                >
                  <Film className="size-5" />
                  Ver tráiler
                </GlassButton>
              )}
              <IconButton
                size="lg"
                label={inList ? "Quitar de Mi lista" : "Agregar a Mi lista"}
                onClick={() =>
                  ui.toast(
                    actions.toggleList(item) ? "Agregado a Mi lista" : "Eliminado de Mi lista",
                    "success",
                  )
                }
              >
                {inList ? <Check className="size-5" /> : <Plus className="size-5" />}
              </IconButton>
              <RateButton item={item} size="lg" />
              <IconButton size="lg" label="Compartir" onClick={share}>
                <Share2 className="size-[18px]" />
              </IconButton>
              {playing && (
                <IconButton
                  size="lg"
                  className="ml-auto"
                  label={muted ? "Activar sonido" : "Silenciar"}
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </IconButton>
              )}
            </motion.div>
            {progress && !progress.completed && progress.duration > 0 && (
              <div className="mt-4 flex max-w-sm items-center gap-3 text-xs text-muted">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full w-full origin-left bg-accent"
                    style={{ transform: `scaleX(${progress.position / progress.duration})` }}
                  />
                </div>
                {Math.max(1, Math.round((progress.duration - progress.position) / 60))} min
                restantes
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-8 px-5 pt-2 pb-8 sm:px-10 md:grid-cols-[1.7fr_1fr]">
          <div>
            <p className="eyebrow mb-3 text-muted">
              {upcoming && item.released ? (
                <span className="text-accent">Estreno · {longDate(item.released)}</span>
              ) : (
                <>
                  {item.source ? `${PLATFORMS[item.source].name} · ` : ""}
                  {isSeries ? "Serie" : "Película"}
                </>
              )}
            </p>
            <p className="numeric mb-4 flex flex-wrap items-center gap-x-2 text-[15px] font-medium text-fg/85">
              <span className="font-semibold text-match">{matchScore(item, aff)}% para ti</span>
              {[
                yearLabel(item),
                durationLabel(item),
                item.imdbRating > 0 ? `IMDb ${item.imdbRating.toFixed(1)}` : "",
                maturity(item),
              ]
                .filter(Boolean)
                .map((m) => (
                  <span key={m} className="flex items-center gap-2">
                    <span className="text-fg/35">·</span>
                    <span title={m === maturity(item) ? MATURITY_HINT : undefined}>{m}</span>
                  </span>
                ))}
            </p>
            {item.awards && (
              <div className="mb-4 flex items-start gap-2 text-sm font-semibold text-fg/90">
                <Trophy className="mt-0.5 size-4 shrink-0 text-accent" />
                {item.awards}
              </div>
            )}
            <p className="text-[15px] leading-relaxed text-fg/85 sm:text-base">
              {item.synopsis || (loading ? "Cargando sinopsis…" : "Sin sinopsis disponible.")}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            {item.cast.length > 0 && (
              <Meta label="Reparto" value={item.cast.slice(0, 4).join(", ")} />
            )}
            {item.director.length > 0 && (
              <Meta label="Dirección" value={item.director.join(", ")} />
            )}
            {item.genres.length > 0 && (
              <div>
                <span className="text-dim">Géneros: </span>
                {item.genres.map((g, i) => (
                  <span key={g}>
                    {i > 0 && ", "}
                    <button
                      className="text-fg/90 underline-offset-4 hover:text-accent hover:underline"
                      onClick={() => {
                        ui.closeDetails();
                        navigate({ name: "genre", genre: g });
                      }}
                    >
                      {genreLabel(g)}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 border-b border-line bg-raised/95 px-5 backdrop-blur-xl sm:px-10">
          <div className="flex gap-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cx(
                  "relative py-4 text-[15px] font-bold transition-colors",
                  tab === t.id ? "text-fg" : "text-dim hover:text-muted",
                )}
              >
                {t.label}
                {tab === t.id && (
                  <motion.span
                    layoutId="details-tab"
                    className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-accent"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[300px] px-5 py-7 sm:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === "episodes" && <Episodes item={item} episodes={episodes} loading={loading} />}
              {tab === "similar" && <Similar item={item} />}
              {tab === "about" && <About item={item} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </Bezel>
    </motion.article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-dim">{label}: </span>
      <span className="text-fg/90">{value}</span>
    </div>
  );
}

function Episodes({
  item,
  episodes,
  loading,
}: {
  item: MediaItem;
  episodes: Episode[];
  loading: boolean;
}) {
  const data = useProfileData();
  const progress = data.progress[item.id];
  const seasons = useMemo(() => {
    const set = [...new Set(episodes.map((e) => e.season))];
    return set.length > 1 ? set.filter((s) => s > 0) : set;
  }, [episodes]);
  const [season, setSeason] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const current =
    season ??
    (progress?.season && seasons.includes(progress.season) ? progress.season : seasons[0]);
  const list = episodes.filter((e) => e.season === current);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  if (!episodes.length) return <p className="text-muted">No hay episodios disponibles.</p>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold">Episodios</h3>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-3 rounded-lg bg-white/[0.06] refract px-4 py-2.5 text-sm font-bold transition hover:border-white/40"
          >
            Temporada {current}
            <span className="text-xs font-semibold text-dim">({list.length} ep.)</span>
            <ChevronDown className={cx("size-4 transition-transform", open && "rotate-180")} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 z-20 mt-2 max-h-72 w-52 overflow-y-auto rounded-xl bg-white/[0.06] refract-hi p-1.5 shadow-2xl"
              >
                {seasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSeason(s);
                      setOpen(false);
                    }}
                    className={cx(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-white/[0.07]",
                      s === current ? "text-fg" : "text-muted",
                    )}
                  >
                    {s === 0 ? "Especiales" : `Temporada ${s}`}
                    {s === current && <Check className="size-4 text-accent" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="divide-y divide-line">
        {list.map((ep, i) => {
          const watched = data.watchedEpisodes[episodeKey(item.id, ep.season, ep.episode)];
          const isCurrent =
            progress?.season === ep.season &&
            progress?.episode === ep.episode &&
            !progress.completed;
          const future = ep.released ? new Date(ep.released).getTime() > Date.now() : false;
          return (
            <motion.div
              key={ep.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.035, duration: 0.4 }}
              className={cx(
                "group/ep flex items-center gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-white/[0.04] sm:gap-5 sm:px-3",
                isCurrent && "bg-white/[0.05]",
              )}
            >
              <span className="hidden w-6 shrink-0 text-center text-2xl font-semibold text-dim sm:block">
                {ep.episode}
              </span>
              <button
                disabled={future}
                onClick={() => ui.play(item, { season: ep.season, episode: ep.episode })}
                className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-surface sm:w-40"
                aria-label={`Reproducir episodio ${ep.episode}`}
              >
                {ep.thumbnail && (
                  <SmartImage
                    src={ep.thumbnail}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
                {!future && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover/ep:opacity-100">
                    <span className="flex size-10 items-center justify-center rounded-full border border-white/60 bg-black/50">
                      <Play className="ml-0.5 size-4 fill-fg" />
                    </span>
                  </span>
                )}
                {(isCurrent || watched) && (
                  <span className="absolute inset-x-1.5 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-white/30">
                    <span
                      className="block h-full bg-accent"
                      style={{
                        width: watched
                          ? "100%"
                          : `${progress && progress.duration ? (progress.position / progress.duration) * 100 : 5}%`,
                      }}
                    />
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <h4 className="text-[15px] font-bold">
                    <span className="mr-1.5 text-dim sm:hidden">{ep.episode}.</span>
                    {ep.title}
                  </h4>
                  <span className="shrink-0 text-xs font-semibold text-dim">
                    {future
                      ? `Estreno ${longDate(ep.released)}`
                      : item.runtimeMinutes
                        ? `${item.runtimeMinutes} min`
                        : ""}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                  {ep.overview ?? longDate(ep.released)}
                </p>
              </div>
              <button
                onClick={() => actions.setEpisodeWatched(item.id, ep.season, ep.episode, !watched)}
                aria-label={watched ? "Marcar como no visto" : "Marcar como visto"}
                title={watched ? "Marcar como no visto" : "Marcar como visto"}
                className={cx(
                  "hidden shrink-0 transition sm:block",
                  watched
                    ? "text-accent"
                    : "text-dim opacity-0 group-hover/ep:opacity-100 hover:text-fg",
                )}
              >
                <CircleCheck className="size-6" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Similar({ item }: { item: MediaItem }) {
  const genre = item.genres[0];
  const { items, loading } = useCatalog(genre ? { type: item.type, genre } : { type: item.type });
  const data = useProfileData();
  const aff = useAffinities(data);
  const list = items.filter((i) => i.id !== item.id).slice(0, 12);

  return (
    <div>
      <h3 className="mb-5 text-xl font-bold">Más títulos similares</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {loading && !list.length
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton aspect-[4/5] rounded-xl" />
            ))
          : list.map((s, i) => {
              const inList = data.list.includes(s.id);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.45 }}
                  className="group/sim overflow-hidden rounded-xl bg-surface refract transition hover:ring-white/20"
                >
                  <button
                    className="relative block aspect-video w-full overflow-hidden"
                    onClick={() => ui.openDetails(s)}
                  >
                    <SmartImage
                      src={s.background}
                      alt=""
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover/sim:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-3 h-[40%] w-[60%]">
                      <TitleLogo item={s} className="size-full" textClassName="text-lg" />
                    </div>
                    <span className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-bold">
                      {s.year}
                    </span>
                  </button>
                  <div className="p-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-match">{matchScore(s, aff)}%</span>
                      <IconButton
                        size="sm"
                        label={inList ? "Quitar de Mi lista" : "Agregar a Mi lista"}
                        onClick={() =>
                          ui.toast(
                            actions.toggleList(s) ? "Agregado a Mi lista" : "Eliminado de Mi lista",
                            "success",
                          )
                        }
                      >
                        {inList ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </IconButton>
                    </div>
                    <p className="line-clamp-3 text-[13px] leading-relaxed text-muted">
                      {s.synopsis}
                    </p>
                  </div>
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}

function About({ item }: { item: MediaItem }) {
  const rows: Array<[string, string]> = [
    ["Dirección", item.director.join(", ")],
    ["Reparto", item.cast.join(", ")],
    ["Guion", item.writer.join(", ")],
    ["Géneros", item.genres.map(genreLabel).join(", ")],
    ["País", item.country ?? ""],
    ["Estreno", longDate(item.released) || item.releaseInfo],
    ["Duración", durationLabel(item)],
    ["Premios", item.awards ?? ""],
    ["Puntuación IMDb", item.imdbRating ? `${item.imdbRating.toFixed(1)} / 10` : ""],
  ];
  return (
    <div>
      <h3 className="mb-5 text-xl">
        Acerca de <span className="font-bold">{item.title}</span>
      </h3>
      <dl className="grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="border-b border-line pb-4">
              <dt className="mb-1 text-dim">{k}</dt>
              <dd className="text-fg/90">{v}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
