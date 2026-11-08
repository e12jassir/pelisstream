import { AnimatePresence, motion } from "motion/react";
import { Delete } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cx } from "../lib/format";
import { EASE_GLIDE } from "../lib/motion";
import { useProfiles } from "../lib/store";
import { ui, useUi } from "../lib/ui";
import { Avatar } from "./Avatar";
import { Bezel } from "./Bezel";

/** Global PIN gate with a tvOS-style numeric keypad (also accepts keyboard digits). */
export function PinPrompt() {
  const request = useUi((s) => s.pinRequest);
  return (
    <AnimatePresence>
      {request && <Pad key={request.profileId} profileId={request.profileId} />}
    </AnimatePresence>
  );
}

function Pad({ profileId }: { profileId: string }) {
  const profile = useProfiles().find((p) => p.id === profileId);
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(0);

  const press = useCallback((d: string) => setValue((v) => (v.length < 4 ? v + d : v)), []);
  const back = useCallback(() => setValue((v) => v.slice(0, -1)), []);

  useEffect(() => {
    if (value.length !== 4 || !profile) return;
    if (value === profile.pin) {
      ui.resolvePin(true);
      return;
    }
    setWrong((w) => w + 1);
    const t = window.setTimeout(() => setValue(""), 420);
    return () => window.clearTimeout(t);
  }, [value, profile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Escape") ui.resolvePin(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back]);

  if (!profile) return null;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE_GLIDE }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/80 px-5 backdrop-blur-2xl"
      onClick={(e) => e.target === e.currentTarget && ui.resolvePin(false)}
      role="dialog"
      aria-modal="true"
      aria-label={`PIN de ${profile.name}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
      >
        <Bezel radius={32} pad={6} className="glass">
          <div className="flex w-[min(360px,88vw)] flex-col items-center px-7 pt-8 pb-7">
            <Avatar index={profile.avatar} className="mb-5 size-16" />
            <p className="eyebrow mb-2 text-muted">Perfil bloqueado</p>
            <h2 className="mb-7 text-center text-xl font-semibold tracking-[-0.02em]">
              Ingresa el PIN de {profile.name}
            </h2>
            <motion.div
              key={wrong}
              animate={wrong ? { x: [0, -14, 12, -8, 5, 0] } : {}}
              transition={{ duration: 0.42, ease: EASE_GLIDE }}
              className="mb-2 flex gap-4"
            >
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="relative flex size-3.5 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-white/15" />
                  <span
                    className={cx(
                      "absolute inset-0 rounded-full transition-transform duration-300 ease-[var(--ease-spring)]",
                      wrong && value.length === 0 ? "bg-danger" : "bg-fg",
                    )}
                    style={{ transform: `scale(${i < value.length ? 1 : 0})` }}
                  />
                </span>
              ))}
            </motion.div>
            <p
              className={cx(
                "mb-6 h-5 text-sm transition-opacity",
                wrong ? "text-danger opacity-100" : "opacity-0",
              )}
            >
              PIN incorrecto
            </p>
            <div className="grid grid-cols-3 gap-3">
              {keys.map((k, i) =>
                k === "" ? (
                  <span key={i} />
                ) : (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    onClick={() => (k === "del" ? back() : press(k))}
                    aria-label={k === "del" ? "Borrar" : k}
                    className="numeric flex size-[68px] items-center justify-center rounded-full bg-white/[0.08] text-2xl font-medium refract hover:bg-white/[0.14]"
                  >
                    {k === "del" ? <Delete className="size-6 text-muted" /> : k}
                  </motion.button>
                ),
              )}
            </div>
            <button
              onClick={() => ui.resolvePin(false)}
              className="mt-6 text-sm font-semibold text-muted hover:text-fg"
            >
              Cancelar
            </button>
          </div>
        </Bezel>
      </motion.div>
    </motion.div>
  );
}
