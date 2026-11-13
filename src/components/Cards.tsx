import { motion } from "motion/react";
import { Play, X } from "lucide-react";
import { useId, useRef } from "react";
import { cx } from "../lib/format";
import { canHover } from "../lib/hooks";
import { hover } from "../lib/hover";
import { ui } from "../lib/ui";
import type { MediaItem } from "../lib/types";
import { SmartImage, TitleLogo } from "./SmartImage";
import { PlatformWordmark } from "./Wordmarks";

export const CARD_W = {
  landscape: "w-[74vw] sm:w-[44vw] md:w-[31vw] lg:w-[24vw] xl:w-[20vw] 2xl:w-[17vw]",
  poster: "w-[40vw] sm:w-[27vw] md:w-[20vw] lg:w-[15vw] xl:w-[12.5vw] 2xl:w-[11vw]",
};

function useCardHandlers(item: MediaItem, variant: "landscape" | "poster") {
  const ref = useRef<HTMLDivElement>(null);
  return {
    ref,
    onMouseEnter: () => canHover() && ref.current && hover.intent(item, ref.current, variant),
    onMouseLeave: () => hover.cancel(),
    onClick: () => {
      hover.close();
      ui.openDetails(item);
    },
  };
}

function SourceMark({ item }: { item: MediaItem }) {
  if (!item.source) return null;
  return (
    <span className="absolute top-3 left-3 h-3.5 text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
      <PlatformWordmark id={item.source} mono />
    </span>
  );
}

export function LandscapeCard({
  item,
  progress,
  className,
  showSource,
}: {
  item: MediaItem;
  progress?: number;
  className?: string;
  showSource?: boolean;
}) {
  const { ref, ...handlers } = useCardHandlers(item, "landscape");
  return (
    <div ref={ref} className={cx("lift relative shrink-0 snap-start rounded-[14px]", className)}>
      <button
        {...handlers}
        className="group/card relative block aspect-video w-full overflow-hidden rounded-[14px] bg-surface text-left refract"
        aria-label={item.title}
      >
        <SmartImage
          src={item.background}
          alt=""
          className="absolute inset-0 size-full object-cover"
          fallback={
            <SmartImage
              src={item.poster}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          }
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex h-[44%] items-end p-3.5 sm:p-4">
          <TitleLogo
            item={item}
            className="max-h-full max-w-[70%]"
            textClassName="text-xl sm:text-2xl"
          />
        </div>
        {showSource && <SourceMark item={item} />}
        {progress !== undefined && (
          <ProgressBar value={progress} className="absolute inset-x-3.5 bottom-2.5" />
        )}
      </button>
    </div>
  );
}

export function PosterCard({
  item,
  className,
  showSource,
}: {
  item: MediaItem;
  className?: string;
  showSource?: boolean;
}) {
  const { ref, ...handlers } = useCardHandlers(item, "poster");
  return (
    <div ref={ref} className={cx("lift relative shrink-0 snap-start rounded-[14px]", className)}>
      <button
        {...handlers}
        className="relative block aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-surface text-left refract"
        aria-label={item.title}
      >
        <SmartImage
          src={item.poster}
          fallbackSrc={item.posterFallback}
          alt=""
          className="absolute inset-0 size-full object-cover"
          fallback={
            <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-br from-surface-hi via-surface to-ink p-4">
              <span className="text-[10px] font-bold tracking-wider text-dim uppercase">
                {item.type === "movie" ? "Película" : "Serie"}
                {item.year ? ` · ${item.year}` : ""}
              </span>
              <span className="line-clamp-3 font-title text-lg leading-tight text-fg/90">
                {item.title}
              </span>
            </div>
          }
        />
        {showSource && <SourceMark item={item} />}
      </button>
    </div>
  );
}

/** Netflix-style ranked tile: an outlined SVG numeral tucked behind the poster. */
export function Top10Card({
  item,
  rank,
  index = 0,
}: {
  item: MediaItem;
  rank: number;
  index?: number;
}) {
  const { ref, ...handlers } = useCardHandlers(item, "poster");
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const wide = rank >= 10;
  return (
    <motion.div
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.75, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
      className="group/top relative flex shrink-0 snap-start items-end"
    >
      <svg
        viewBox={wide ? "0 0 250 220" : "0 0 150 220"}
        className={cx(
          "relative z-0 h-[150px] w-auto shrink-0 sm:h-[190px] lg:h-[220px]",
          wide ? "-mr-7" : "-mr-5 sm:-mr-6",
        )}
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-fg)" stopOpacity=".75" />
            <stop offset="1" stopColor="var(--color-fg)" stopOpacity=".12" />
          </linearGradient>
          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent-hi)" />
            <stop offset="1" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
        <text
          x={wide ? 250 : 150}
          y="212"
          textAnchor="end"
          fontFamily="'Hanken Grotesk', sans-serif"
          fontWeight="900"
          fontSize="250"
          letterSpacing={wide ? -26 : 0}
          fill="var(--color-ink)"
          stroke={`url(#${uid}s)`}
          strokeWidth="4"
          paintOrder="stroke"
        >
          {rank}
        </text>
        <text
          x={wide ? 250 : 150}
          y="212"
          textAnchor="end"
          fontFamily="'Hanken Grotesk', sans-serif"
          fontWeight="900"
          fontSize="250"
          letterSpacing={wide ? -26 : 0}
          fill={`url(#${uid}f)`}
          className="opacity-0 transition-opacity duration-500 ease-[var(--ease-spring)] group-hover/top:opacity-100"
        >
          {rank}
        </text>
      </svg>
      <div ref={ref} className="lift relative z-10 rounded-[12px]">
        <button
          {...handlers}
          className="relative block aspect-[2/3] w-[28vw] overflow-hidden rounded-[12px] bg-surface refract sm:w-[19vw] md:w-[14vw] lg:w-[10.5vw] xl:w-[9.2vw] 2xl:w-[8vw]"
          aria-label={`${rank}. ${item.title}`}
        >
          <SmartImage
            src={item.poster}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        </button>
      </div>
    </motion.div>
  );
}

export function ContinueCard({
  item,
  progress,
  label,
  onResume,
  onRemove,
}: {
  item: MediaItem;
  progress: number;
  label: string;
  onResume: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cx(
        "group/cont lift relative shrink-0 snap-start rounded-[14px]",
        CARD_W.landscape,
      )}
    >
      <div className="relative overflow-hidden rounded-[14px] bg-surface refract">
        <button
          onClick={onResume}
          className="relative block aspect-video w-full"
          aria-label={`Reanudar ${item.title}`}
        >
          <SmartImage
            src={item.background}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
          <span className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 opacity-0 backdrop-blur-md transition-[opacity,transform] duration-500 ease-[var(--ease-spring)] group-hover/cont:opacity-100 refract">
            <Play className="ml-0.5 size-6 fill-fg" />
          </span>
          <div className="absolute inset-x-3.5 bottom-3 text-left">
            <div className="truncate text-[15px] font-semibold tracking-tight">{item.title}</div>
            <div className="numeric mt-0.5 truncate text-xs text-white/70">{label}</div>
            <ProgressBar value={progress} className="mt-2.5" />
          </div>
        </button>
      </div>
      <button
        onClick={onRemove}
        aria-label="Quitar de Continuar viendo"
        title="Quitar de Continuar viendo"
        className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-black/60 text-fg opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover/cont:opacity-100 hover:bg-black/80 max-md:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0.03, Math.min(1, value / 100));
  return (
    <div className={cx("h-[3px] overflow-hidden rounded-full bg-white/25", className)}>
      <div
        className="h-full w-full origin-left rounded-full bg-accent"
        style={{ transform: `scaleX(${v})` }}
      />
    </div>
  );
}

export function CardSkeleton({ variant }: { variant: "landscape" | "poster" }) {
  return (
    <div
      className={cx(
        "skeleton shrink-0 rounded-[14px]",
        variant === "landscape"
          ? `aspect-video ${CARD_W.landscape}`
          : `aspect-[2/3] ${CARD_W.poster}`,
      )}
    />
  );
}
