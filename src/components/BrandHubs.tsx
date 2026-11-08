import { motion } from "motion/react";
import { useRef } from "react";
import { cx } from "../lib/format";
import { useInView } from "../lib/hooks";
import { navigate } from "../lib/router";
import { PLATFORM_ORDER, PLATFORMS } from "../lib/platforms";
import { useSource } from "../lib/sources";
import type { PlatformId } from "../lib/types";
import { Bezel } from "./Bezel";
import { GUTTER, RailHeader } from "./Rail";
import { SmartImage } from "./SmartImage";
import { PlatformWordmark } from "./Wordmarks";

export function BrandHubs({ title = "Tus plataformas" }: { title?: string }) {
  return (
    <section>
      <RailHeader eyebrow="Estudios y canales" title={title} />
      <div
        className={cx(
          "no-scrollbar rail-track flex snap-x gap-3 overflow-x-auto sm:gap-4 lg:grid lg:grid-cols-5 lg:overflow-visible",
          GUTTER,
        )}
      >
        {PLATFORM_ORDER.map((id, i) => (
          <BrandHubCard key={id} id={id} index={i} />
        ))}
      </div>
    </section>
  );
}

function BrandHubCard({ id, index }: { id: PlatformId; index: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const visible = useInView(ref, "400px");
  const { items } = useSource({ kind: "platform", platform: id, type: "series" }, visible);
  const covers = items.filter((i) => i.background).slice(0, 1);
  const p = PLATFORMS[id];

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate({ name: "brand", platform: id })}
      aria-label={`Explorar ${p.name}`}
      className="group/hub lift relative w-[64vw] shrink-0 snap-start rounded-[22px] text-left sm:w-[38vw] md:w-[28vw] lg:w-auto"
    >
      <Bezel radius={22} pad={4}>
        <div
          className="relative aspect-[16/9] overflow-hidden"
          style={{ background: p.palette.raised }}
        >
          {covers[0] && (
            <div className="absolute inset-0 opacity-25 transition-opacity duration-700 ease-[var(--ease-spring)] group-hover/hub:opacity-100">
              <SmartImage
                src={covers[0].background}
                alt=""
                className="absolute inset-0 size-full scale-110 object-cover group-hover/hub:animate-[drift_14s_cubic-bezier(0.32,0.72,0,1)_infinite_alternate]"
              />
            </div>
          )}
          {/* Glass veil */}
          <div className="absolute inset-0 bg-black/55 transition-opacity duration-700 group-hover/hub:opacity-60" />
          {/* Ambient edge light in the platform color */}
          <div
            className="absolute inset-0 opacity-40 transition-opacity duration-700 ease-[var(--ease-spring)] group-hover/hub:opacity-100"
            style={{
              boxShadow: `inset 0 0 0 1px ${p.palette.accent}55, inset 0 -40px 60px -30px ${p.palette.accent}66`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-[24%] transition-transform duration-700 ease-[var(--ease-spring)] group-hover/hub:scale-[1.08]">
              <PlatformWordmark id={id} />
            </div>
          </div>
        </div>
      </Bezel>
    </motion.button>
  );
}
