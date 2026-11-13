import { AnimatePresence, motion } from "motion/react";
import { Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "../lib/format";
import { actions, useProfiles } from "../lib/store";
import { ui, useUi } from "../lib/ui";
import { Avatar, AVATAR_COUNT, avatarName } from "./Avatar";
import { Bezel } from "./Bezel";

export function ProfileEditor() {
  const editor = useUi((s) => s.profileEditor);
  return (
    <AnimatePresence>
      {editor && <Editor key={editor.profileId ?? "new"} profileId={editor.profileId} />}
    </AnimatePresence>
  );
}

function Editor({ profileId }: { profileId: string | null }) {
  const profiles = useProfiles();
  const existing = profiles.find((p) => p.id === profileId);
  const [name, setName] = useState(existing?.name ?? "");
  const [avatar, setAvatar] = useState(existing?.avatar ?? profiles.length % AVATAR_COUNT);
  const [kids, setKids] = useState(existing?.kids ?? false);
  const [lock, setLock] = useState(Boolean(existing?.pin));
  const [pin, setPin] = useState(existing?.pin ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && ui.closeProfileEditor();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const valid = name.trim().length > 0 && (!lock || /^\d{4}$/.test(pin));

  const save = () => {
    if (!valid) return;
    const payload = { name: name.trim().slice(0, 20), avatar, kids, pin: lock ? pin : undefined };
    if (existing) {
      actions.updateProfile(existing.id, payload);
      ui.toast("Perfil actualizado", "success");
    } else {
      actions.addProfile(payload);
      ui.toast(`Perfil "${payload.name}" creado`, "success");
    }
    ui.closeProfileEditor();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && ui.closeProfileEditor()}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-xl shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
        role="dialog"
        aria-modal="true"
        aria-label={existing ? "Editar perfil" : "Agregar perfil"}
      >
        <Bezel radius={32} pad={6} coreClassName="p-6 sm:p-9">
          <button
            onClick={() => ui.closeProfileEditor()}
            aria-label="Cerrar"
            className="absolute top-5 right-5 rounded-full p-2 text-muted hover:bg-white/10 hover:text-fg"
          >
            <X className="size-5" />
          </button>
          <h2 className="mb-1 display text-3xl">
            {existing ? "Editar perfil" : "Crear nuevo perfil"}
          </h2>
          <p className="mb-7 text-sm text-muted">
            {existing
              ? "Personaliza el nombre, avatar y seguridad de este perfil."
              : "Cada perfil guarda su propio progreso, lista y tema."}
          </p>

          <div className="mb-7 flex items-center gap-5">
            <motion.div
              key={avatar}
              initial={{ scale: 0.85, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            >
              <Avatar index={avatar} className="size-24" />
            </motion.div>
            <label className="flex-1">
              <span className="mb-2 block text-xs font-bold tracking-wider text-dim uppercase">
                Nombre
              </span>
              <input
                autoFocus
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="Nombre del perfil"
                className="w-full rounded-xl bg-white/[0.06] refract px-4 py-3 text-lg font-semibold outline-none transition focus:border-accent"
              />
            </label>
          </div>

          <div className="mb-7">
            <span className="mb-3 block text-xs font-bold tracking-wider text-dim uppercase">
              Avatar
            </span>
            <div className="grid grid-cols-6 gap-2.5">
              {Array.from({ length: AVATAR_COUNT }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setAvatar(i)}
                  aria-label={avatarName(i)}
                  title={avatarName(i)}
                  aria-pressed={avatar === i}
                  className="group/av relative rounded-[24%] transition-transform duration-500 ease-[var(--ease-spring)] hover:scale-[1.06]"
                >
                  <span
                    className={cx(
                      "absolute -inset-[4px] rounded-[28%] ring-2 ring-fg transition-opacity duration-300",
                      avatar === i ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <Avatar index={i} className="w-full" />
                  {avatar === i && (
                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-fg text-ink">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8 divide-y divide-line rounded-2xl bg-white/[0.03] refract">
            <Toggle
              label="Perfil infantil"
              hint="Solo títulos de animación y familia, sin terror ni suspenso."
              checked={kids}
              onChange={setKids}
            />
            <div>
              <Toggle
                label="Proteger con PIN (opcional)"
                hint="¿Poner contraseña? Actívalo para exigir un PIN de 4 dígitos al ingresar a este perfil."
                checked={lock}
                onChange={setLock}
              />
              <AnimatePresence>
                {lock && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      <input
                        inputMode="numeric"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="0000"
                        aria-label="PIN de 4 dígitos"
                        className="w-40 rounded-xl bg-white/[0.06] refract px-4 py-2.5 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-accent"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={!valid}
              onClick={save}
              className="rounded-full bg-fg px-7 py-3 font-bold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Guardar
            </button>
            <button
              onClick={() => ui.closeProfileEditor()}
              className="rounded-full border border-white/25 px-7 py-3 font-bold text-muted transition hover:border-fg hover:text-fg"
            >
              Cancelar
            </button>
            {existing && profiles.length > 1 && (
              <button
                onClick={() => {
                  if (!confirmDelete) return setConfirmDelete(true);
                  actions.deleteProfile(existing.id);
                  ui.toast("Perfil eliminado");
                  ui.closeProfileEditor();
                }}
                className={cx(
                  "ml-auto inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition",
                  confirmDelete ? "bg-danger text-ink" : "text-danger hover:bg-danger/10",
                )}
              >
                <Trash2 className="size-4" />
                {confirmDelete ? "Confirmar eliminación" : "Eliminar perfil"}
              </button>
            )}
          </div>
        </Bezel>
      </motion.div>
    </motion.div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 px-5 py-4">
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300",
          checked ? "bg-accent" : "bg-white/15",
        )}
      >
        <motion.span
          layout
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          className={cx(
            "absolute top-1 size-5 rounded-full bg-fg shadow",
            checked ? "right-1" : "left-1",
          )}
        />
      </button>
    </label>
  );
}
