import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useUi } from "../lib/ui";

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-8">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className="glass flex items-center gap-3 rounded-full refract py-3 pr-6 pl-4 text-sm font-semibold shadow-2xl shadow-black/60"
            role="status"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="size-5 text-match" />
            ) : t.tone === "accent" ? (
              <Sparkles className="size-5 text-accent" />
            ) : (
              <span className="size-2 rounded-full bg-accent" />
            )}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
