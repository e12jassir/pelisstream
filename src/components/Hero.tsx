import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { genreLabel } from "../lib/cinemeta";
import { cx, durationLabel, yearLabel } from "../lib/format";
import { useInView, useMeta } from "../lib/hooks";
import { maturity, MATURITY_HINT } from "../lib/maturity";
import { EASE_GLIDE, EASE_SPRING } from "../lib/motion";
import { actions, useProfileData } from "../lib/store";
import { matchScore, useAffinities } from "../lib/taste";
import { ui, useUi } from "../lib/ui";
import type { MediaItem } from "../lib/types";
import { GlassButton, IconButton, PrimaryButton } from "./Buttons";
import { GUTTER } from "./Rail";
import { SmartImage, TitleLogo } from "./SmartImage";
import { PlatformWordmark } from "./Wordmarks";
import { YouTubeBackdrop } from "./YouTubeBackdrop";

const SLIDE_MS = 9000;
const TRAILER_DELAY_MS = 2200;
const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_GLIDE } },
};

/** Default eyebrow: platform wordmark + format, in tracked small caps. */
export function SourceEyebrow({ item, fallback }: { item: MediaItem; fallback?: ReactNode }) {
  const kind = item.type === "series" ? "Serie" : "Película";
  if (!item.source) return <span className="eyebrow text-fg/80">{fallback ?? kind}</span>;
  return (
    <span className="flex items-center gap-3">
      <span className="h-[18px] text-fg">
        <PlatformWordmark id={item.source} mono />
      </span>
      <span className="eyebrow text-fg/70">{kind}</span>
    </span>
  );
}

export function Hero({
  items,
  eyebrowFor,
  loading,
}: {
  items: MediaItem[];
  eyebrowFor?: (item: MediaItem, index: number) => ReactNode;
  loading?: boolean;
}) {
  const data = useProfileData();
  const aff = useAffinities(data);
  const { autoplayPreviews, heroAutoAdvance, previewSound } = data.settings;
  const overlayOpen = useUi((s) => Boolean(s.details || s.player));
  const root = useRef<HTMLElement>(null);
  const onScreen = useInView(root, "-35% 0px", false);

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [videoOn, setVideoOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(!previewSound);
  const [hovered, setHovered] = useState(false);
  const baseItem = items[index % Math.max(1, items.length)];
  const { details } = useMeta(
    baseItem && (!baseItem.trailers || !baseItem.trailers.length) ? baseItem : null,
  );
  const item = details?.item ? { ...baseItem, ...details.item } : baseItem;
  const trailer = item?.trailers[0];
  const canPlayVideo = autoplayPreviews && !overlayOpen && onScreen && Boolean(trailer);

  const go = (next: number) => {
    if (!items.length) return;
    setDir(next > index ? 1 : -1);
    setIndex((next + items.length) % items.length);
  };

  useEffect(() => {
    setVideoOn(false);
    setPlaying(false);
    setEnded(false);
  }, [item?.id]);

  useEffect(() => {
    if (!canPlayVideo || ended) {
      setVideoOn(false);
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setVideoOn(true), TRAILER_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [canPlayVideo, ended, item?.id]);

  const autoAdvancing =
    heroAutoAdvance &&
    items.length > 1 &&
    !hovered &&
    !playing &&
    !overlayOpen &&
    !(canPlayVideo && !ended);

  useEffect(() => {
    if (!autoAdvancing) return;
    const t = window.setTimeout(() => go(index + 1), SLIDE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, autoAdvancing]);

  const frame =
    "relative h-[82vh] max-h-[980px] min-h-[560px] w-full overflow-hidden bg-ink sm:h-[88vh] md:-ml-[84px] md:w-[calc(100%+84px)]";

  if (!item) {
    return (
      <section className={frame}>
        <div className="skeleton absolute inset-0 opacity-50" />
        <div className={cx("absolute bottom-[22%] left-0 space-y-5 md:left-[84px]", GUTTER)}>
          <div className="skeleton h-3 w-40 rounded" />
          <div className="skeleton h-28 w-[min(420px,70vw)] rounded-2xl" />
          <div className="skeleton h-3.5 w-72 rounded" />
          <div className="skeleton h-12 w-64 rounded-full" />
        </div>
        {!loading && (
          <div className="absolute inset-0 grid place-items-center text-muted">
            No se pudo cargar el contenido destacado.
          </div>
        )}
      </section>
    );
  }

  const inList = data.list.includes(item.id);
  const progress = data.progress[item.id];
  const resumable = progress && !progress.completed && progress.position > 20;
  const meta = [
    yearLabel(item),
    durationLabel(item),
    ...item.genres.slice(0, 2).map(genreLabel),
  ].filter(Boolean);

  return (
    <section
      ref={root}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cx("group/hero", frame)}
      aria-roledescription="carrusel"
      aria-label="Destacados"
    >
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={item.id}
          custom={dir}
          initial={{ opacity: 0, x: `${dir * 4}%` }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: `${dir * -3}%` }}
          transition={{ duration: 1.2, ease: EASE_SPRING }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: playing ? 0 : 1 }}
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
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: playing ? 1 : 0 }}
            >
              <YouTubeBackdrop
                videoId={trailer}
                muted={muted}
                onPlaying={() => setPlaying(true)}
                onEnded={() => {
                  setPlaying(false);
                  setEnded(true);
                  setVideoOn(false);
                }}
                onError={() => {
                  setEnded(true);
                  setVideoOn(false);
                }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Legibility scrims (tinted by the active palette's ink) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/35 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/60 to-transparent" />

      <div className={cx("absolute inset-x-0 bottom-[19%] sm:bottom-[21%] md:left-[84px]", GUTTER)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
            }}
            className="max-w-[min(620px,90vw)]"
          >
            <motion.div variants={rise} className="mb-5">
              {eyebrowFor ? eyebrowFor(item, index) : <SourceEyebrow item={item} />}
            </motion.div>
            <motion.div variants={rise}>
              <motion.div
                animate={{ scale: playing ? 0.8 : 1, y: playing ? 18 : 0 }}
                transition={{ duration: 1.2, ease: EASE_SPRING }}
                style={{ transformOrigin: "left bottom" }}
                className="mb-6 h-[104px] w-[min(460px,80vw)] sm:h-[148px]"
              >
                <TitleLogo
                  item={item}
                  className="size-full"
                  textClassName="text-[3.2rem] sm:text-[4.4rem] lg:text-[5.2rem]"
                />
              </motion.div>
            </motion.div>
            <motion.p
              variants={rise}
              className="numeric mb-4 flex flex-wrap items-center gap-x-2 text-[15px] font-medium text-fg/85"
            >
              <span className="font-semibold text-match">{matchScore(item, aff)}% para ti</span>
              {meta.map((m) => (
                <span key={m} className="flex items-center gap-2">
                  <span className="text-fg/35">·</span>
                  {m}
                </span>
              ))}
            </motion.p>
            <motion.div variants={rise}>
              <motion.p
                animate={{ opacity: playing ? 0 : 1, y: playing ? 10 : 0 }}
                transition={{ duration: 0.8, ease: EASE_SPRING }}
                className="mb-7 line-clamp-3 max-w-[56ch] text-[15px] leading-[1.6] text-fg/75 sm:text-base"
              >
                {item.synopsis}
              </motion.p>
            </motion.div>
            <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={() => ui.play(item)}>
                <Play className="size-5 fill-ink" />
                {resumable ? "Reanudar" : "Reproducir"}
              </PrimaryButton>
              <GlassButton onClick={() => ui.openDetails(item)}>
                <Info className="size-5" />
                Más información
              </GlassButton>
              <IconButton
                size="lg"
                active={inList}
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
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right edge: audio control + flush maturity rating (Netflix / Max) */}
      <div className="absolute right-5 bottom-[19%] flex items-center gap-4 sm:right-0 sm:bottom-[21%]">
        <AnimatePresence>
          {(playing || ended) && trailer && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.4, ease: EASE_GLIDE }}
            >
              {playing ? (
                <IconButton
                  size="lg"
                  label={muted ? "Activar sonido" : "Silenciar"}
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </IconButton>
              ) : (
                <IconButton size="lg" label="Ver tráiler de nuevo" onClick={() => setEnded(false)}>
                  <RotateCcw className="size-5" />
                </IconButton>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <span
          title={MATURITY_HINT}
          className="numeric hidden h-10 items-center border-l-[3px] sm:flex border-fg/70 bg-ink/45 pr-8 pl-3.5 text-[15px] font-semibold text-fg backdrop-blur-md sm:pr-12 lg:pr-16"
        >
          {maturity(item)}
        </span>
      </div>

      {items.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-[12%] flex justify-center gap-1.5 sm:bottom-[13.5%] md:left-[84px]">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => go(i)}
                aria-label={`Ir a ${it.title}`}
                className="group/dot flex h-5 items-center px-0.5"
              >
                <span className="relative block h-[3px] w-7 overflow-hidden rounded-full bg-white/20 transition-opacity group-hover/dot:bg-white/35">
                  {i === index && (
                    <motion.span
                      key={`${it.id}-${autoAdvancing}`}
                      className="absolute inset-0 origin-left rounded-full bg-fg"
                      initial={{ scaleX: autoAdvancing ? 0 : 1 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: autoAdvancing ? SLIDE_MS / 1000 : 0, ease: "linear" }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              onClick={() => go(index + d)}
              aria-label={d === 1 ? "Siguiente" : "Anterior"}
              className={cx(
                "absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-fg opacity-0 backdrop-blur-xl transition-opacity duration-500 group-hover/hero:opacity-100 refract lg:flex",
                d === 1 ? "right-4" : "left-[100px]",
              )}
            >
              {d === 1 ? <ChevronRight className="size-6" /> : <ChevronLeft className="size-6" />}
            </button>
          ))}
        </>
      )}
    </section>
  );
}
