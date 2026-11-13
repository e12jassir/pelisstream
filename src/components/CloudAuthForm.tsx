import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { cloudActions } from "../lib/cloud";
import { cx } from "../lib/format";
import { ui } from "../lib/ui";

export function CloudAuthForm({
  mode,
  onModeChange,
  onSuccess,
  submitLabel,
  loading,
  onLoadingChange,
}: {
  mode: "login" | "register";
  onModeChange: (next: "login" | "register") => void;
  onSuccess?: (username: string, mode: "login" | "register") => void;
  submitLabel?: string;
  loading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = loading ?? internalLoading;
  const setBusy = (next: boolean) => {
    setInternalLoading(next);
    onLoadingChange?.(next);
  };

  const cleanUser = username.trim().toLowerCase();
  const userValid = /^[a-z0-9._-]{3,24}$/.test(cleanUser);
  const passValid = password.length >= 6;
  const canSubmit = userValid && passValid && !isBusy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") {
        await cloudActions.register(cleanUser, password);
        ui.toast(`Cuenta @${cleanUser} creada y sincronizada`, "success");
      } else {
        await cloudActions.login(cleanUser, password);
        ui.toast(`Sesión iniciada como @${cleanUser}`, "success");
      }
      onSuccess?.(cleanUser, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-full bg-white/[0.05] p-1 refract">
        {(["login", "register"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            disabled={isBusy}
            onClick={() => {
              onModeChange(tab);
              setError(null);
            }}
            className={cx(
              "rounded-full py-2 text-sm font-bold transition",
              mode === tab ? "bg-fg text-ink" : "text-muted hover:text-fg",
            )}
          >
            {tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold tracking-wider text-dim uppercase">
            Usuario
          </span>
          <input
            autoFocus
            autoComplete="username"
            value={username}
            maxLength={24}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nombre de usuario"
            className="w-full rounded-xl bg-white/[0.06] refract px-4 py-3 text-base font-semibold outline-none transition focus:border-accent"
          />
          {username.length > 0 && !userValid && (
            <span className="mt-1.5 block text-xs text-muted">
              3 a 24 caracteres: letras, números, punto, guion o guion bajo.
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold tracking-wider text-dim uppercase">
            Contraseña
          </span>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-xl bg-white/[0.06] refract px-4 py-3 pr-12 text-base font-semibold outline-none transition focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Ocultar contraseña" : "Ver contraseña"}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-fg"
            >
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        {error && (
          <div className="rounded-xl border border-danger/35 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-fg px-6 py-3.5 font-bold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isBusy && <Loader2 className="size-4 animate-spin" />}
          {submitLabel ?? (mode === "login" ? "Iniciar sesión" : "Crear cuenta")}
        </button>
      </form>
    </>
  );
}
