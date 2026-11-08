import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { genreLabel } from "../lib/cinemeta";
import { durationLabel } from "../lib/format";
import { hover, useHover } from "../lib/hover";
import { useMeta } from "../lib/hooks";
import { maturity } from "../lib/maturity";
import { EASE_GLIDE } from "../lib/motion";
import { actions, useProfileData } from "../lib/store";
import { matchScore, useAffinities } from "../lib/taste";
import { ui } from "../lib/ui";
import type { MediaItem } from "../lib/types";
import { Bezel } from "./Bezel";
import { IconButton } from "./Buttons";
import { RateButton } from "./RateButton";
import { SmartImage, TitleLogo } from "./SmartImage";
import { PlatformWordmark } from "./Wordmarks";
import { YouTubeBackdrop } from "./YouTubeBackdrop";

export function HoverPreview() {
  const { item, rect } = useHover();

  useEffect(() => {
    if (!item) return;
    const close = () => hover.close();
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [item]);

  return createPortal(
    <AnimatePresence>
      {item && rect && <Panel key={item.id} item={item} rect={rect} />}
    </AnimatePresence>,
    document.body,
  );
}

function Panel({ item: baseItem, rect }: { item: MediaItem; rect: DOMRect }) {
  const { details } = useMeta(
    baseItem && (!baseItem.trailers || !baseItem.trailers.length) ? baseItem : null,
  );
  const item = details?.item ? { ...baseItem, ...details.item } : baseItem;
  const data = useProfileData();
  const aff = useAffinities(data);
  const inList = data.list.includes(item.id);
  const progress = data.progress[item.id];
  const { autoplayPreviews, previewSound } = data.settings;
  const [videoOn, setVideoOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(!previewSound);
  const trailer = item.trailers[0];

  useEffect(() => {
    if (!autoplayPreviews || !trailer) return;
    const t = window.setTimeout(() => setVideoOn(true), 900);
    return () => window.clearTimeout(t);
  }, [autoplayPreviews, trailer]);

  const width = Math.max(rect.width * 1.55, 340);
  const imageH = (width * 9) / 16;
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - 12,
  );
  const top = Math.max(
    12,
    Math.min(rect.top + rect.height / 2 - imageH / 2 - 10, window.innerHeight - imageH - 196),
  );
  const scaleFrom = rect.width / width;
  const resumable = progress && !progress.completed && progress.duration > 0;
  const meta = [item.year, durationLabel(item), maturity(item)].filter(Boolean);

  return (
    <motion.div
      onMouseEnter={() => hover.keep()}
      onMouseLeave={() => hover.cancel()}
      initial={{ opacity: 0, scale: scaleFrom, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: scaleFrom * 1.04,
        transition: { duration: 0.22, ease: EASE_GLIDE },
      }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      style={{ left, top, width, transformOrigin: "center 32%" }}
      className="fixed z-[60] shadow-[0_40px_90px_-24px_rgba(0,0,0,0.95)]"
    >
      <Bezel radius={22} pad={4} className="glass">
        <button
          className="relative block aspect-video w-full overflow-hidden bg-surface"
          onClick={() => {
            hover.close();
            ui.openDetails(item);
          }}
          aria-label={`Más información de ${item.title}`}
        >
          <SmartImage
            src={item.background}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          {videoOn && trailer && (
            <div
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: playing ? 1 : 0 }}
            >
              <YouTubeBackdrop
                videoId={trailer}
                muted={muted}
                start={8}
                onPlaying={() => setPlaying(true)}
                onEnded={() => setPlaying(false)}
                onError={() => setVideoOn(false)}
              />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-raised via-raised/40 to-transparent" />
          {item.source && (
            <span className="absolute top-3.5 left-4 h-4 text-white/90">
              <PlatformWordmark id={item.source} mono />
            </span>
          )}
          <div className="absolute bottom-3 left-4 h-[34%] w-[58%]">
            <TitleLogo item={item} className="size-full" textClassName="text-2xl" />
          </div>
        </button>
        {playing && (
          <div className="absolute top-3 right-3">
            <IconButton
              size="sm"
              label={muted ? "Activar sonido" : "Silenciar"}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </IconButton>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { delay: 0.12, duration: 0.45, ease: EASE_GLIDE },
          }}
          className="space-y-3 px-4 pt-3 pb-4"
        >
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                hover.close();
                ui.play(item);
              }}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-fg pr-4 pl-3.5 text-sm font-semibold whitespace-nowrap text-ink transition-transform duration-500 ease-[var(--ease-spring)] hover:scale-[1.04]"
            >
              <Play className="size-4 fill-ink" />
              {resumable ? "Reanudar" : "Reproducir ahora"}
            </motion.button>
            <IconButton
              label={inList ? "Quitar de Mi lista" : "Agregar a Mi lista"}
              active={inList}
              onClick={() =>
                ui.toast(
                  actions.toggleList(item) ? "Agregado a Mi lista" : "Eliminado de Mi lista",
                  "success",
                )
              }
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={inList ? "c" : "p"}
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.22, ease: EASE_GLIDE }}
                >
                  {inList ? <Check className="size-[18px]" /> : <Plus className="size-[18px]" />}
                </motion.span>
              </AnimatePresence>
            </IconButton>
            <RateButton item={item} />
            <IconButton
              className="ml-auto"
              label="Más información"
              onClick={() => {
                hover.close();
                ui.openDetails(item);
              }}
            >
              <ChevronDown className="size-[18px]" />
            </IconButton>
          </div>
          <p className="numeric flex flex-wrap items-center gap-x-1.5 text-[13px] font-medium text-fg/80">
            <span className="font-semibold text-match">{matchScore(item, aff)}% para ti</span>
            {meta.map((m) => (
              <span key={m} className="flex items-center gap-1.5">
                <span className="text-dim">·</span>
                {m}
              </span>
            ))}
          </p>
          {resumable && (
            <div className="flex items-center gap-2.5 text-xs text-muted">
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full w-full origin-left bg-accent"
                  style={{ transform: `scaleX(${progress.position / progress.duration})` }}
                />
              </div>
              <span className="numeric">
                {Math.max(1, Math.round((progress.duration - progress.position) / 60))} min
              </span>
            </div>
          )}
          <p className="text-[13px] text-muted">
            {item.genres.slice(0, 3).map(genreLabel).join("  ·  ")}
          </p>
        </motion.div>
      </Bezel>
    </motion.div>
  );
}
