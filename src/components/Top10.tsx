import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cx } from "../lib/format";
import { PLATFORM_ORDER, PLATFORMS } from "../lib/platforms";
import { useSource, type RailSource } from "../lib/sources";
import type { MediaType, PlatformId } from "../lib/types";
import { CardSkeleton, Top10Card } from "./Cards";
import { Rail } from "./Rail";
import { PlatformWordmark } from "./Wordmarks";

type Tab = "global" | PlatformId;

export function Top10Module({
  fixedPlatform,
  kids,
}: {
  fixedPlatform?: PlatformId;
  kids?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(fixedPlatform ?? "global");
  const [type, setType] = useState<MediaType>(fixedPlatform ? "series" : "movie");
  const source: RailSource =
    tab === "global"
      ? { kind: "catalog", query: kids ? { type, genre: "Animation" } : { type } }
      : { kind: "platform", platform: tab, type };
  const { items, loading } = useSource(source);
  const top = items.slice(0, 10);
  const where = tab === "global" ? "PelisStream" : PLATFORMS[tab].name;
  const tabs: Tab[] = fixedPlatform ? [] : ["global", ...PLATFORM_ORDER];

  return (
    <Rail
      eyebrow="Hoy"
      title={`Top 10 ${type === "movie" ? "películas" : "series"} en ${where}`}
      aside={
        <div className="no-scrollbar flex items-center gap-2 max-md:-mx-5 max-md:w-[calc(100%+2.5rem)] max-md:flex-nowrap max-md:overflow-x-auto max-md:px-5 md:flex-wrap">
          {tabs.length > 0 && (
            <div className="glass order-2 flex shrink-0 items-center gap-0.5 rounded-full p-1 md:order-1 md:max-w-full md:overflow-x-auto md:no-scrollbar">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  aria-label={t === "global" ? "Global" : PLATFORMS[t].name}
                  className={cx(
                    "relative flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold transition-opacity duration-300 md:px-3.5 md:text-[13px]",
                    tab === t ? "text-ink" : "text-fg opacity-60 hover:opacity-100",
                  )}
                >
                  {tab === t && (
                    <motion.span
                      layoutId="top10-tab"
                      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                      className="absolute inset-0 rounded-full bg-fg"
                    />
                  )}
                  <span className="relative flex h-3.5 items-center">
                    {t === "global" ? "Global" : <PlatformWordmark id={t} mono />}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="glass order-1 flex shrink-0 items-center gap-0.5 rounded-full p-1 md:order-2">
            {(["movie", "series"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cx(
                  "relative h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold md:px-3.5 md:text-[13px]",
                  type === t ? "text-ink" : "text-muted hover:text-fg",
                )}
              >
                {type === t && (
                  <motion.span
                    layoutId={`top10-type-${fixedPlatform ?? "all"}`}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute inset-0 rounded-full bg-fg"
                  />
                )}
                <span className="relative">{t === "movie" ? "Películas" : "Series"}</span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {loading && !top.length
          ? Array.from({ length: 7 }, (_, i) => <CardSkeleton key={`sk${i}`} variant="poster" />)
          : top.map((item, i) => (
              <Top10Card key={`${tab}-${type}-${item.id}`} item={item} rank={i + 1} index={i} />
            ))}
      </AnimatePresence>
    </Rail>
  );
}
