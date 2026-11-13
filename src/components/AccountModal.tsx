import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
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
        <Bezel radius={32} pad={6} coreClassName="p-7 sm:p-10">
          <button
            type="button"
            onClick={() => !loading && ui.closeAccountModal()}
            aria-label="Cerrar"
            className="absolute top-5 right-5 rounded-full p-2 text-muted hover:bg-white/10 hover:text-fg"
          >
            <X className="size-5" />
          </button>

          <h2 className="mb-6 display text-center text-3xl tracking-tight">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>

          <CloudAuthForm
            mode={mode}
            onModeChange={setMode}
            loading={loading}
            onLoadingChange={setLoading}
            submitLabel={mode === "login" ? "Entrar" : "Crear cuenta"}
            onSuccess={() => ui.closeAccountModal()}
          />
        </Bezel>
      </motion.div>
    </motion.div>
  );
}
