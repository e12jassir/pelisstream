import { motion } from "motion/react";
import { Lock, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { cx } from "../lib/format";
import { actions, useProfiles } from "../lib/store";
import { ui } from "../lib/ui";
import type { Profile } from "../lib/types";
import { Avatar } from "./Avatar";
import { BrandMark, Wordmark } from "./Brand";

const MAX_PROFILES = 5;

export function ProfileGate() {
  const profiles = useProfiles();
  const [manage, setManage] = useState(false);
  const [entering, setEntering] = useState<string | null>(null);

  const enter = (p: Profile) => {
    setEntering(p.id);
    window.setTimeout(() => {
      actions.selectProfile(p.id);
      window.scrollTo(0, 0);
    }, 650);
  };

  const pick = (p: Profile) => {
    if (manage) return ui.editProfile(p.id);
    if (p.pin) return ui.requestPin(p.id, () => enter(p));
    enter(p);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-ink"
    >
      <header className="relative flex items-center gap-3 px-6 py-6 sm:px-12">
        <BrandMark className="size-9" />
        <Wordmark className="text-2xl" />
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="display mb-4 text-center text-[2.6rem] sm:text-[4rem]"
        >
          {manage ? "Administrar perfiles" : "¿Quién está viendo?"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          className="mb-12 text-center text-muted"
        >
          {manage
            ? "Elige un perfil para editarlo."
            : "Cada perfil tiene su propia lista, historial y recomendaciones."}
        </motion.p>

        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
          }}
          className="flex max-w-5xl flex-wrap justify-center gap-6 sm:gap-9"
        >
          {profiles.map((p) => (
            <motion.li
              key={p.id}
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.9 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            >
              <motion.button
                onClick={() => pick(p)}
                animate={
                  entering === p.id
                    ? { scale: 1.25, y: -10 }
                    : entering
                      ? { opacity: 0, scale: 0.9 }
                      : { opacity: 1, scale: 1, y: 0 }
                }
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="group/p flex w-28 flex-col items-center gap-3.5 sm:w-36"
              >
                <span className="relative block transition-transform duration-500 ease-[var(--ease-spring)] group-hover/p:scale-[1.05]">
                  {/* Focus ring as its own layer so only opacity animates */}
                  <span className="absolute -inset-[7px] rounded-[28%] opacity-0 ring-[3px] ring-fg transition-opacity duration-300 group-hover/p:opacity-100" />
                  <Avatar index={p.avatar} className="size-28 sm:size-36" />
                  {manage && <span className="absolute inset-0 rounded-[24%] bg-black/55" />}
                  {manage && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex size-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md refract">
                        <Pencil className="size-5" />
                      </span>
                    </span>
                  )}
                  {p.kids && (
                    <span className="eyebrow absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-fg px-2.5 py-1.5 text-[10px] text-ink">
                      Niños
                    </span>
                  )}
                  {p.pin && !manage && (
                    <span className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-surface-hi refract">
                      <Lock className="size-3.5" />
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate text-base font-medium text-muted group-hover/p:text-fg sm:text-lg">
                  {p.name}
                </span>
              </motion.button>
            </motion.li>
          ))}
          {profiles.length < MAX_PROFILES && !entering && (
            <motion.li variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}>
              <button
                onClick={() => ui.editProfile(null)}
                className="group/p flex w-28 flex-col items-center gap-3.5 sm:w-36"
              >
                <span className="flex size-28 items-center justify-center rounded-[24%] bg-white/[0.04] text-dim transition-transform duration-500 ease-[var(--ease-spring)] refract group-hover/p:scale-[1.05] group-hover/p:text-fg sm:size-36">
                  <Plus className="size-12" strokeWidth={1.5} />
                </span>
                <span className="text-base font-semibold text-muted group-hover/p:text-fg sm:text-lg">
                  Agregar perfil
                </span>
              </button>
            </motion.li>
          )}
        </motion.ul>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: entering ? 0 : 1, transition: { delay: entering ? 0 : 0.5 } }}
          onClick={() => setManage((m) => !m)}
          className={cx(
            "eyebrow mt-14 rounded-full px-7 py-3.5 transition-transform duration-500 ease-[var(--ease-spring)] hover:scale-[1.04]",
            manage ? "bg-fg text-ink" : "bg-white/[0.06] text-muted refract hover:text-fg",
          )}
        >
          {manage ? "Listo" : "Administrar perfiles"}
        </motion.button>
      </div>
    </motion.div>
  );
}
