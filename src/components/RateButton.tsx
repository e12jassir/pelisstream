import { AnimatePresence, motion } from "motion/react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useRef, useState } from "react";
import { actions, useProfileData } from "../lib/store";
import { ui } from "../lib/ui";
import type { MediaItem, Rating } from "../lib/types";
import { cx } from "../lib/format";

export function DoubleThumbs({ className }: { className?: string }) {
  return (
    <span className={cx("relative inline-flex", className)}>
      <ThumbsUp className="size-full" strokeWidth={2} />
      <ThumbsUp className="absolute top-[-22%] left-[30%] size-full" strokeWidth={2} />
    </span>
  );
}

const OPTIONS: Array<{ id: Rating; label: string; toast: string }> = [
  { id: "down", label: "No es para mí", toast: "Gracias. Te mostraremos menos títulos así." },
  { id: "up", label: "Me gusta", toast: "Calificado: Me gusta" },
  { id: "love", label: "¡Me encanta!", toast: "¡Te encanta! Afinaremos tus recomendaciones." },
];

function RatingIcon({ rating, className }: { rating?: Rating; className?: string }) {
  if (rating === "down") return <ThumbsDown className={className} />;
  if (rating === "love") return <DoubleThumbs className={className} />;
  return <ThumbsUp className={className} />;
}

export function RateButton({ item, size = "md" }: { item: MediaItem; size?: "sm" | "md" | "lg" }) {
  const rating = useProfileData().ratings[item.id];
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const dim = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  const icon = size === "sm" ? "size-3.5" : "size-[18px]";

  const choose = (r: Rating) => {
    const removing = rating === r;
    actions.rate(item, r);
    ui.toast(
      removing ? "Calificación eliminada" : OPTIONS.find((o) => o.id === r)!.toast,
      removing ? "default" : "accent",
    );
    setOpen(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setOpen(true), 220);
      }}
      onMouseLeave={() => {
        window.clearTimeout(timer.current);
        setOpen(false);
      }}
    >
      <button
        aria-label="Calificar"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cx(
          "flex items-center justify-center rounded-full transition-transform duration-500 ease-[var(--ease-spring)]",
          dim,
          rating
            ? "bg-fg text-ink"
            : "bg-white/[0.12] text-fg backdrop-blur-xl refract hover:scale-[1.08]",
        )}
      >
        <RatingIcon rating={rating} className={icon} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className="absolute top-1/2 left-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-surface-hi p-1.5 shadow-2xl shadow-black/60 refract refract"
          >
            {OPTIONS.map((o, i) => (
              <motion.button
                key={o.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.03 * i } }}
                whileHover={{ scale: 1.18 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  choose(o.id);
                }}
                title={o.label}
                aria-label={o.label}
                className={cx(
                  "flex items-center justify-center rounded-full transition-colors",
                  dim,
                  rating === o.id ? "bg-fg text-ink" : "text-fg hover:bg-white/10",
                )}
              >
                <RatingIcon rating={o.id} className={icon} />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
