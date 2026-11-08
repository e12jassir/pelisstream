import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { CatalogQuery } from "../lib/cinemeta";
import { useDedupe } from "../lib/dedupe";
import { cx } from "../lib/format";
import { useInView } from "../lib/hooks";
import { useSource, type RailSource } from "../lib/sources";
import type { MediaItem } from "../lib/types";
import { CARD_W, CardSkeleton, LandscapeCard, PosterCard, Top10Card } from "./Cards";

export const GUTTER = "px-5 sm:px-8 lg:px-12 xl:px-14";
const SCROLL_PAD = "scroll-px-5 sm:scroll-px-8 lg:scroll-px-12 xl:scroll-px-14";

export function RailHeader({
  title,
  eyebrow,
  onSeeAll,
  aside,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  onSeeAll?: () => void;
  aside?: ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative z-[1] flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        GUTTER,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2 text-accent">{eyebrow}</div>}
        <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em] sm:text-[1.3rem] lg:text-[1.45rem]">
          {onSeeAll ? (
            <button onClick={onSeeAll} className="group/title flex items-center gap-1.5 text-left">
              <span className="truncate">{title}</span>
              <ChevronRight className="size-5 translate-x-0 text-muted transition-transform duration-500 ease-[var(--ease-spring)] group-hover/title:translate-x-1" />
            </button>
          ) : (
            <span className="truncate">{title}</span>
          )}
        </h2>
      </div>
      {aside}
    </div>
  );
}

export function Rail({
  title,
  eyebrow,
  onSeeAll,
  children,
  className,
  aside,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  onSeeAll?: () => void;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [pages, setPages] = useState({ count: 1, index: 0 });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8 });
    const count = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth));
    setPages({
      count,
      index: Math.min(count - 1, Math.round((el.scrollLeft / Math.max(1, max)) * (count - 1))),
    });
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.86, behavior: "smooth" });
  };

  return (
    <section className={cx("group/rail relative", className)}>
      <RailHeader
        title={title}
        eyebrow={eyebrow}
        onSeeAll={onSeeAll}
        aside={
          aside ??
          (pages.count > 1 && (
            <div
              className="hidden items-center gap-1 opacity-0 transition-opacity duration-500 group-hover/rail:opacity-100 md:flex"
              aria-hidden
            >
              {Array.from({ length: pages.count }, (_, i) => (
                <span key={i} className="h-[3px] w-5 overflow-hidden rounded-full bg-white/20">
                  <span
                    className="block h-full w-full origin-left rounded-full bg-fg transition-transform duration-500 ease-[var(--ease-spring)]"
                    style={{ transform: `scaleX(${i === pages.index ? 1 : 0})` }}
                  />
                </span>
              ))}
            </div>
          ))
        }
      />
      <div className="relative">
        <div
          ref={scroller}
          onScroll={measure}
          className={cx(
            "rail-track no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth sm:gap-3",
            GUTTER,
            SCROLL_PAD,
          )}
        >
          {children}
        </div>
        <AnimatePresence>
          {!edges.start && <Arrow dir={-1} onClick={() => page(-1)} key="l" />}
          {!edges.end && <Arrow dir={1} onClick={() => page(1)} key="r" />}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Arrow({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      aria-label={dir === 1 ? "Siguiente" : "Anterior"}
      className={cx(
        "absolute top-[1.2rem] bottom-[1.6rem] z-10 hidden w-14 items-center justify-center text-fg opacity-0 transition-opacity duration-500 group-hover/rail:!opacity-100 md:flex",
        dir === 1
          ? "right-0 bg-gradient-to-l from-ink via-ink/70 to-transparent"
          : "left-0 bg-gradient-to-r from-ink via-ink/70 to-transparent",
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl transition-transform duration-500 ease-[var(--ease-spring)] hover:scale-110 refract">
        {dir === 1 ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
      </span>
    </motion.button>
  );
}

export function ItemsRail({
  title,
  eyebrow,
  items,
  loading,
  variant = "landscape",
  ranked,
  onSeeAll,
  showSource,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  items: MediaItem[];
  loading?: boolean;
  variant?: "landscape" | "poster";
  ranked?: boolean;
  onSeeAll?: () => void;
  showSource?: boolean;
}) {
  if (!loading && items.length === 0) return null;
  return (
    <Rail title={title} eyebrow={eyebrow} onSeeAll={onSeeAll}>
      {loading && items.length === 0
        ? Array.from({ length: 8 }, (_, i) => (
            <CardSkeleton key={i} variant={ranked ? "poster" : variant} />
          ))
        : items.map((item, i) =>
            ranked ? (
              <Top10Card key={item.id} item={item} rank={i + 1} index={i} />
            ) : variant === "poster" ? (
              <PosterCard
                key={item.id}
                item={item}
                className={CARD_W.poster}
                showSource={showSource}
              />
            ) : (
              <LandscapeCard
                key={item.id}
                item={item}
                className={CARD_W.landscape}
                showSource={showSource}
              />
            ),
          )}
    </Rail>
  );
}

/**
 * Lazily-loaded rail. With `order` inside a DedupeScope it never repeats titles
 * already shown by earlier rails, and hides itself when too few remain.
 */
export function SourceRail({
  source,
  order,
  limit = 20,
  minItems = 6,
  exclude,
  ...rest
}: Omit<Parameters<typeof ItemsRail>[0], "items" | "loading"> & {
  source: RailSource;
  order?: number;
  limit?: number;
  minItems?: number;
  exclude?: (item: MediaItem) => boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, "700px");
  const { items, loading, error } = useSource(source, visible);
  const pool = exclude ? items.filter((i) => !exclude(i)) : items;
  const shown = useDedupe(
    rest.ranked ? undefined : order,
    pool,
    rest.ranked ? 10 : limit,
    minItems,
  );
  const tooFew = !loading && shown.length < (rest.ranked ? 1 : minItems);
  return (
    <div ref={ref} className="min-h-[1px]">
      {!error && !tooFew && (visible || shown.length > 0) && (
        <ItemsRail {...rest} items={shown} loading={loading || !visible} />
      )}
      {!visible && <div className="h-56" />}
    </div>
  );
}

/** Back-compat helper for Cinemeta catalog queries. */
export function CatalogRail({
  query,
  ...rest
}: Omit<Parameters<typeof SourceRail>[0], "source"> & { query: CatalogQuery }) {
  return <SourceRail source={{ kind: "catalog", query }} {...rest} />;
}
