import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { cloudActions } from "../lib/cloud";
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
        ui.toast(`Cuenta @${cleanUser} creada`, "success");
      } else {
        await cloudActions.login(cleanUser, password);
        ui.toast(`Bienvenido, @${cleanUser}`, "success");
      }
      onSuccess?.(cleanUser, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted uppercase">
          Usuario
        </span>
        <input
          autoFocus
          autoComplete="username"
          value={username}
          maxLength={24}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nombre de usuario"
          className="w-full rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3.5 text-base font-medium text-fg placeholder:text-dim outline-none transition focus:border-white/50 focus:bg-white/[0.11]"
        />
        {username.length > 0 && !userValid && (
          <span className="mt-1.5 block text-xs text-muted">
            3 a 24 caracteres: letras, números, punto, guion o guion bajo.
          </span>
        )}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted uppercase">
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
            className="w-full rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3.5 pr-12 text-base font-medium text-fg placeholder:text-dim outline-none transition focus:border-white/50 focus:bg-white/[0.11]"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Ocultar contraseña" : "Ver contraseña"}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-muted transition hover:text-fg"
          >
            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </label>

      {error && (
        <div className="rounded-xl border border-danger/35 bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-6 py-3.5 text-base font-bold text-ink transition hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isBusy && <Loader2 className="size-4 animate-spin" />}
        {submitLabel ?? (mode === "login" ? "Iniciar sesión" : "Crear cuenta")}
      </button>

      <p className="pt-2 text-center text-sm text-muted">
        {mode === "login" ? "¿Primera vez en PelisStream?" : "¿Ya tienes cuenta?"}{" "}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            onModeChange(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="font-bold text-fg underline-offset-4 transition hover:text-white hover:underline"
        >
          {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </p>
    </form>
  );
}
