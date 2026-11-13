import { AnimatePresence, motion } from "motion/react";
import { Cloud, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfiles } from "../lib/store";
import { ui, useUi } from "../lib/ui";
import { Bezel } from "./Bezel";
import { CloudAuthForm } from "./CloudAuthForm";

export function AccountModal() {
  const modal = useUi((s) => s.accountModal);
  return (
    <AnimatePresence>
      {modal && <AccountDialog key={modal.mode} initialMode={modal.mode} />}
    </AnimatePresence>
  );
}

function AccountDialog({ initialMode }: { initialMode: "login" | "register" }) {
  const profiles = useProfiles();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !loading && ui.closeAccountModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && !loading && ui.closeAccountModal()}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-md shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      >
        <Bezel radius={32} pad={6} coreClassName="p-6 sm:p-8">
          <button
            type="button"
            onClick={() => !loading && ui.closeAccountModal()}
            aria-label="Cerrar"
            className="absolute top-5 right-5 rounded-full p-2 text-muted hover:bg-white/10 hover:text-fg"
          >
            <X className="size-5" />
          </button>

          <div className="mb-5 flex items-center gap-2.5 text-accent">
            <Cloud className="size-5" />
            <span className="eyebrow text-xs">Sincronización entre dispositivos</span>
          </div>

          <h2 className="mb-1.5 display text-3xl">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p className="mb-6 text-sm text-muted">
            {mode === "login"
              ? "Usa tu usuario y contraseña para recuperar tus perfiles, progreso y temas en este dispositivo."
              : profiles.length > 0
                ? "Solo usuario y contraseña. Tus perfiles y progreso actuales se subirán a esta cuenta."
                : "Solo usuario y contraseña, sin correos. Tu progreso y temas viajarán contigo a cualquier dispositivo."}
          </p>

          <CloudAuthForm
            mode={mode}
            onModeChange={setMode}
            loading={loading}
            onLoadingChange={setLoading}
            submitLabel={mode === "login" ? "Entrar y sincronizar" : "Crear cuenta"}
            onSuccess={() => ui.closeAccountModal()}
          />
        </Bezel>
      </motion.div>
    </motion.div>
  );
}
