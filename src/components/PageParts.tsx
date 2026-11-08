import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { genreLabel } from "../lib/cinemeta";
import { cx } from "../lib/format";
import { useCatalog, useInView } from "../lib/hooks";
import { navigate } from "../lib/router";
import type { MediaItem, MediaType } from "../lib/types";
import { LandscapeCard, PosterCard } from "./Cards";
import { GUTTER } from "./Rail";
import { Bezel } from "./Bezel";
import { SmartImage } from "./SmartImage";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={cx("pt-32 pb-8 md:pt-16", GUTTER)}>
      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="eyebrow mb-4 text-accent"
        >
          {eyebrow}
        </motion.div>
      )}
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="display text-[2.6rem] sm:text-[3.6rem] lg:text-[4.4rem]"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.15 } }}
          className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted sm:text-[17px]"
        >
          {subtitle}
        </motion.p>
      )}
      {children && <div className="mt-7">{children}</div>}
    </header>
  );
}

export function MediaGrid({
  items,
  loading,
  done = true,
  onMore,
  variant = "landscape",
  empty,
  renderExtra,
}: {
  items: MediaItem[];
  loading?: boolean;
  done?: boolean;
  onMore?: () => void;
  variant?: "landscape" | "poster";
  empty?: ReactNode;
  renderExtra?: (item: MediaItem) => ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const near = useInView(sentinel, "800px", false);
  useEffect(() => {
    if (near && !loading && !done) onMore?.();
  }, [near, loading, done, onMore]);

  if (!loading && items.length === 0) return <div className={GUTTER}>{empty}</div>;
  return (
    <div className={GUTTER}>
      <div
        className={cx(
          "grid gap-x-3 gap-y-6 sm:gap-x-4",
          variant === "landscape"
            ? "grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            : "grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
        )}
      >
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: (i % 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {variant === "landscape" ? (
              <LandscapeCard item={item} className="w-full" />
            ) : (
              <PosterCard item={item} className="w-full" />
            )}
            {renderExtra?.(item)}
          </motion.div>
        ))}
        {loading &&
          Array.from({ length: variant === "landscape" ? 8 : 12 }, (_, i) => (
            <div
              key={`s${i}`}
              className={cx(
                "skeleton rounded-xl",
                variant === "landscape" ? "aspect-video" : "aspect-[2/3]",
              )}
            />
          ))}
      </div>
      <div ref={sentinel} className="h-10" />
    </div>
  );
}

export const HUBS: Array<{ genre: string; from: string; to: string; type: MediaType }> = [
  { genre: "Action", from: "#f97316", to: "#7c2d12", type: "movie" },
  { genre: "Animation", from: "#38bdf8", to: "#1e3a8a", type: "movie" },
  { genre: "Sci-Fi", from: "#a78bfa", to: "#312e81", type: "series" },
  { genre: "Crime", from: "#f43f5e", to: "#4c0519", type: "series" },
  { genre: "Documentary", from: "#34d399", to: "#064e3b", type: "movie" },
  { genre: "Horror", from: "#dc2626", to: "#1c0505", type: "movie" },
  { genre: "Comedy", from: "#facc15", to: "#854d0e", type: "movie" },
  { genre: "Drama", from: "#fb923c", to: "#431407", type: "series" },
  { genre: "Romance", from: "#f472b6", to: "#500724", type: "movie" },
  { genre: "Fantasy", from: "#2dd4bf", to: "#134e4a", type: "series" },
  { genre: "Thriller", from: "#94a3b8", to: "#0f172a", type: "movie" },
  { genre: "Adventure", from: "#84cc16", to: "#1a2e05", type: "movie" },
  { genre: "Family", from: "#fde047", to: "#a16207", type: "movie" },
  { genre: "Mystery", from: "#818cf8", to: "#1e1b4b", type: "series" },
  { genre: "History", from: "#d6a36b", to: "#3b2412", type: "movie" },
  { genre: "War", from: "#a3a37a", to: "#1f2410", type: "movie" },
  { genre: "Biography", from: "#e9d5ff", to: "#4c1d95", type: "movie" },
  { genre: "Sport", from: "#4ade80", to: "#14532d", type: "movie" },
  { genre: "Western", from: "#f59e0b", to: "#451a03", type: "movie" },
];

export function HubTile({
  hub,
  className,
  index = 0,
}: {
  hub: (typeof HUBS)[number];
  className?: string;
  index?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const visible = useInView(ref, "400px");
  const { items } = useCatalog({ type: hub.type, genre: hub.genre }, visible);
  const cover = items.find((i) => i.background);
  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay: (index % 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate({ name: "genre", genre: hub.genre })}
      className={cx(
        "group/hub lift relative block shrink-0 snap-start rounded-[20px] text-left",
        className,
      )}
    >
      <Bezel radius={20} pad={4}>
        <div className="relative aspect-[16/9] overflow-hidden bg-surface">
          {cover && (
            <SmartImage
              src={cover.background}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-spring)] group-hover/hub:scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          <span
            className="absolute bottom-3.5 left-4 h-[3px] w-6 origin-left rounded-full transition-transform duration-500 ease-[var(--ease-spring)] group-hover/hub:scale-x-[2.2]"
            style={{ background: hub.from }}
          />
          <span className="absolute bottom-6 left-4 text-[1.35rem] font-semibold tracking-[-0.02em] drop-shadow-lg sm:text-[1.5rem]">
            {genreLabel(hub.genre)}
          </span>
        </div>
      </Bezel>
    </motion.button>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-md flex-col items-center py-20 text-center"
    >
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-white/[0.05] text-accent refract">
        {icon}
      </div>
      <h3 className="mb-2 text-2xl font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mb-6 text-muted">{message}</p>
      {action}
    </motion.div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: Array<{ id: T; label: ReactNode }>;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/[0.05] p-1 refract">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "relative h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap",
            value === o.id ? "text-ink" : "text-muted hover:text-fg",
          )}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${id}`}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 rounded-full bg-fg"
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
