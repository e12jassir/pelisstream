import { motion } from "motion/react";
import {
  Cloud,
  CloudOff,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCatalog } from "../lib/cinemeta";
import { cloudActions, useCloud } from "../lib/cloud";
import { cx } from "../lib/format";
import { actions, useProfiles } from "../lib/store";
import { ui } from "../lib/ui";
import type { Profile } from "../lib/types";
import { Avatar } from "./Avatar";
import { BrandMark, Wordmark } from "./Brand";
import { CloudAuthForm } from "./CloudAuthForm";

const MAX_PROFILES = 5;

export function ProfileGate() {
  const profiles = useProfiles();
  const cloud = useCloud();
  const [manage, setManage] = useState(false);
  const [entering, setEntering] = useState<string | null>(null);

  const showAuthWelcome = !cloud.token && !cloud.guestMode && profiles.length === 0;

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

  if (showAuthWelcome) {
    return <AuthWelcome />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-ink"
    >
      <header className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-12">
        <div className="flex items-center gap-3">
          <BrandMark className="size-9" />
          <Wordmark className="text-2xl" />
        </div>

        {cloud.username ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-fg refract">
              {cloud.syncing ? (
                <RefreshCw className="size-3.5 animate-spin text-accent" />
              ) : cloud.error ? (
                <CloudOff className="size-3.5 text-danger" />
              ) : (
                <Cloud className="size-3.5 text-accent" />
              )}
              <span>@{cloud.username}</span>
            </span>
            <button
              onClick={() => {
                cloudActions.logout();
                setManage(false);
                ui.toast("Sesión cerrada en este dispositivo");
              }}
              title="Cerrar sesión de cuenta"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-muted refract transition hover:text-fg"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => ui.openAccountModal("login")}
            className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-4 py-2 text-xs font-bold text-fg refract transition hover:bg-white/[0.12]"
          >
            <Cloud className="size-3.5 text-accent" />
            <span>Iniciar sesión / Crear cuenta</span>
          </button>
        )}
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="display mb-4 text-center text-[2.6rem] sm:text-[4rem]"
        >
          {profiles.length === 0
            ? "Crea tu primer perfil"
            : manage
              ? "Administrar perfiles"
              : "¿Quién está viendo?"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          className="mb-12 max-w-lg text-center text-muted"
        >
          {profiles.length === 0
            ? cloud.username
              ? `Tu cuenta @${cloud.username} está lista. Crea tu primer perfil para empezar.`
              : "Crea un perfil nuevo o inicia sesión con tu cuenta para traer tu progreso y temas."
            : manage
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

        {profiles.length > 0 && (
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
        )}
      </div>
    </motion.div>
  );
}

function AuthWelcome() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    getCatalog({ type: "movie", catalog: "top" })
      .then((items) => {
        if (!alive) return;
        setPosters(items.map((x) => x.poster).filter(Boolean).slice(0, 24));
      })
      .catch(() => {
        /* fallback to ambient gradient if offline */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-[#060609]"
    >
      {/* Cinematic Netflix/Max-style tilted poster mosaic backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none">
        {posters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 1.18 }}
            animate={{ opacity: 0.42, scale: 1.12 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="grid h-full w-full -rotate-6 grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8"
          >
            {posters.map((src, i) => (
              <div
                key={i}
                className="aspect-[2/3] overflow-hidden rounded-xl bg-white/[0.04]"
              >
                <img
                  src={src}
                  alt=""
                  loading="eager"
                  className="h-full w-full object-cover opacity-85"
                />
              </div>
            ))}
          </motion.div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,6,9,0.52)_0%,rgba(6,6,9,0.9)_70%,#060609_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/45 to-[#060609]" />
      </div>

      <header className="relative flex items-center justify-between px-6 py-6 sm:px-12">
        <div className="flex items-center gap-3">
          <BrandMark className="size-9" />
          <Wordmark className="text-2xl" />
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            cloudActions.enterGuest();
            ui.toast("Modo invitado");
          }}
          className="rounded-full border border-white/15 bg-black/50 px-5 py-2 text-xs font-bold text-fg backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
        >
          Mirar como invitado
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[430px] rounded-3xl border border-white/[0.1] bg-black/75 p-7 shadow-[0_40px_120px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-10"
        >
          <h1 className="mb-7 display text-3xl tracking-tight sm:text-4xl">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>

          <CloudAuthForm
            mode={mode}
            onModeChange={setMode}
            loading={loading}
            onLoadingChange={setLoading}
            submitLabel={mode === "login" ? "Entrar" : "Crear cuenta"}
          />

          <div className="mt-6 border-t border-white/10 pt-5">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                cloudActions.enterGuest();
                ui.toast("Modo invitado");
              }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center text-sm font-semibold text-muted transition hover:border-white/20 hover:bg-white/[0.08] hover:text-fg"
            >
              Mirar como invitado
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
