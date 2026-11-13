import { motion } from "motion/react";
import { Check, Cloud, Keyboard, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { cloudActions, useCloud } from "../lib/cloud";
import { cx } from "../lib/format";
import { actions, useActiveProfile, useProfiles, useSettings } from "../lib/store";
import { ui } from "../lib/ui";
import type { ProfileSettings } from "../lib/types";
import { Avatar } from "../components/Avatar";
import { Bezel } from "../components/Bezel";
import { THEMES, type ThemeId } from "../lib/themes";
import { PageHeader } from "../components/PageParts";
import { Toggle } from "../components/ProfileEditor";
import { GUTTER } from "../components/Rail";

export function Settings() {
  const s = useSettings();
  const profile = useActiveProfile();
  const profiles = useProfiles();
  const cloud = useCloud();
  const set = (patch: Partial<ProfileSettings>) => actions.updateSettings(patch);
  if (!profile) return null;

  return (
    <div className="pb-28">
      <PageHeader
        eyebrow="Ajustes"
        title="Preferencias"
        subtitle={`Configuración del perfil de ${profile.name}. Cada perfil guarda sus propios ajustes.`}
      />
      <div className={cx("grid max-w-6xl items-start gap-6 lg:grid-cols-2", GUTTER)}>
        <Card title="Tema" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-6">
            {(Object.keys(THEMES) as ThemeId[]).map((id) => {
              const t = THEMES[id];
              const active = s.theme === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    set({ theme: id });
                    ui.toast(`Tema ${t.name} aplicado`, "accent");
                  }}
                  aria-pressed={active}
                  className="group/theme lift relative rounded-[20px] text-left"
                >
                  <Bezel radius={20} pad={4}>
                    <div
                      className="relative aspect-[4/3] overflow-hidden"
                      style={{ background: t.palette.ink }}
                    >
                      <div
                        className="absolute inset-x-3 top-3 h-[46%] rounded-lg"
                        style={{ background: t.palette.surface }}
                      >
                        <span
                          className="absolute bottom-2 left-2 h-1.5 w-1/2 rounded-full"
                          style={{ background: t.palette.fg, opacity: 0.85 }}
                        />
                        <span
                          className="absolute bottom-5 left-2 h-1 w-1/3 rounded-full"
                          style={{ background: t.palette.muted, opacity: 0.6 }}
                        />
                      </div>
                      <span
                        className="absolute bottom-3 left-3 h-5 w-12 rounded-full"
                        style={{ background: t.palette.accent }}
                      />
                      <span
                        className="absolute right-3 bottom-3 h-5 w-5 rounded-full"
                        style={{ background: t.palette.surfaceHi }}
                      />
                      <span
                        className={cx(
                          "absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-fg text-ink transition-[opacity,transform] duration-500 ease-[var(--ease-spring)]",
                          active ? "scale-100 opacity-100" : "scale-50 opacity-0",
                        )}
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                    </div>
                  </Bezel>
                  <div className="px-1.5 pt-2.5">
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs leading-snug text-muted">{t.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <Card title="Perfiles">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
            <div className="flex items-center gap-4">
              <Avatar index={profile.avatar} className="size-14" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{profile.name}</span>
                  <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-bold text-accent">
                    Activo
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {profile.kids ? "Perfil infantil" : "Perfil estándar"}
                  {profile.pin ? " · Protegido con PIN" : " · Sin contraseña"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => ui.editProfile(profile.id)}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
              >
                Editar
              </button>
              <button
                onClick={() => ui.editProfile(null)}
                className="rounded-full bg-fg px-4 py-2 text-sm font-bold text-ink transition hover:scale-105"
              >
                + Crear perfil
              </button>
            </div>
          </div>
          {profiles.length > 1 && (
            <div className="border-t border-line px-5 py-4">
              <div className="mb-3 text-xs font-bold tracking-wider text-dim uppercase">
                Cambiar a otro perfil local
              </div>
              <div className="flex flex-wrap gap-2.5">
                {profiles
                  .filter((p) => p.id !== profile.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (p.pin) ui.requestPin(p.id, () => actions.selectProfile(p.id));
                        else actions.selectProfile(p.id);
                      }}
                      className="flex items-center gap-2.5 rounded-full bg-white/[0.05] py-1.5 pr-3.5 pl-1.5 text-xs font-bold text-muted transition hover:bg-white/10 hover:text-fg"
                    >
                      <Avatar index={p.avatar} className="size-6" />
                      <span>{p.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Cuenta y sincronización">
          {cloud.username ? (
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
              <div className="flex items-center gap-3.5">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <Cloud className="size-5" />
                </span>
                <div>
                  <div className="font-bold">@{cloud.username}</div>
                  <div className="text-sm text-muted">
                    {cloud.syncing
                      ? "Sincronizando..."
                      : cloud.error
                        ? cloud.error
                        : "Progreso, perfiles y temas sincronizados."}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void cloudActions.syncNow()}
                  disabled={cloud.syncing}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20 disabled:opacity-50"
                >
                  <RefreshCw className={cx("size-3.5", cloud.syncing && "animate-spin")} />
                  Sincronizar
                </button>
                <button
                  onClick={() => {
                    cloudActions.logout();
                    ui.toast("Sesión cerrada");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 px-4 py-2 text-sm font-bold text-danger hover:bg-danger/25"
                >
                  <LogOut className="size-3.5" />
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
              <div>
                <div className="font-bold">Solo en este dispositivo</div>
                <div className="text-sm text-muted">
                  Crea una cuenta con usuario y contraseña para llevar tus perfiles, progreso y tema a cualquier dispositivo.
                </div>
              </div>
              <button
                onClick={() => ui.openAccountModal("register")}
                className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-white"
              >
                <Cloud className="size-4" />
                Conectar cuenta
              </button>
            </div>
          )}
        </Card>

        <Card title="Reproducción">
          <Toggle
            label="Reproducir avances automáticamente"
            hint="Tráileres en el destacado, en las vistas previas y en los detalles."
            checked={s.autoplayPreviews}
            onChange={(v) => set({ autoplayPreviews: v })}
          />
          <Toggle
            label="Avances con sonido"
            hint="Los avances empiezan con el audio activado."
            checked={s.previewSound}
            onChange={(v) => set({ previewSound: v })}
          />
          <Toggle
            label="Reproducir el siguiente episodio"
            hint="Cuenta regresiva al terminar un episodio."
            checked={s.autoplayNext}
            onChange={(v) => set({ autoplayNext: v })}
          />
          <Row label="Opción de reproducción predeterminada">
            <Options
              value={s.preferredProvider}
              onChange={(v) => set({ preferredProvider: v })}
              options={[
                { id: "vidsrc_pm", label: "Opción 1 (Ultra Rápida)" },
                { id: "vidsrc_me", label: "Opción 2 (Directo HD)" },
                { id: "multiembed", label: "Opción 3 (Multi-Servidor)" },
                { id: "playlatin", label: "Opción 4 (Latino / ES)" },
                { id: "twoembed", label: "Opción 5 (Alternativa)" },
                { id: "vidsrc_to", label: "Opción 6 (Espejo)" },
              ]}
            />
          </Row>
          <Row label="Velocidad predeterminada">
            <Options
              value={s.playbackRate}
              onChange={(v) => set({ playbackRate: v })}
              options={[0.75, 1, 1.25, 1.5].map((v) => ({ id: v, label: `${v}x` }))}
            />
          </Row>
          <Row label="Subtítulos">
            <Options
              value={s.subtitles}
              onChange={(v) => set({ subtitles: v })}
              options={[
                { id: "off", label: "No" },
                { id: "es", label: "Español" },
                { id: "en", label: "English" },
              ]}
            />
          </Row>
        </Card>

        <Card title="Interfaz">
          <Toggle
            label="Avanzar destacados automáticamente"
            hint="El carrusel principal cambia de título cada pocos segundos."
            checked={s.heroAutoAdvance}
            onChange={(v) => set({ heroAutoAdvance: v })}
          />
          <Toggle
            label="Reducir movimiento"
            hint="Minimiza animaciones y transiciones."
            checked={s.reduceMotion}
            onChange={(v) => set({ reduceMotion: v })}
          />
        </Card>

        <Card title="Privacidad y datos">
          <DangerRow
            label="Borrar historial de reproducción"
            hint="Elimina Continuar viendo, historial y episodios vistos."
            onConfirm={() => (actions.clearHistory(), ui.toast("Historial borrado"))}
          />
          <DangerRow
            label="Borrar calificaciones"
            hint="Tus recomendaciones se reiniciarán."
            onConfirm={() => (actions.clearRatings(), ui.toast("Calificaciones borradas"))}
          />
          <DangerRow
            label="Restablecer perfil"
            hint="Borra lista, historial, calificaciones y recordatorios."
            onConfirm={() => (actions.resetProfile(), ui.toast("Perfil restablecido"))}
          />
        </Card>

        <Card
          title="Atajos de teclado"
          icon={<Keyboard className="size-4" />}
          className="lg:col-span-2"
        >
          <div className="grid gap-x-10 gap-y-3 px-5 py-5 text-sm sm:grid-cols-2">
            {[
              ["/", "Buscar"],
              ["Esc", "Cerrar ventana o reproductor"],
              ["Espacio / K", "Reproducir o pausar"],
              ["← / →", "Retroceder o adelantar 10 s"],
              ["↑ / ↓", "Subir o bajar volumen"],
              ["M", "Silenciar"],
              ["F", "Pantalla completa"],
              ["C", "Activar subtítulos"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 border-b border-line pb-3"
              >
                <span className="text-muted">{v}</span>
                <kbd className="rounded-md bg-white/[0.06] refract px-2 py-1 font-sans text-xs font-bold">
                  {k}
                </kbd>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  icon,
  className,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cx("overflow-hidden rounded-3xl bg-white/[0.03] refract", className)}
    >
      <h2 className="flex items-center gap-2 border-b border-line px-5 py-4 text-xs font-bold tracking-[0.16em] text-dim uppercase">
        {icon}
        {title}
      </h2>
      <div className="divide-y divide-line">{children}</div>
    </motion.section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <span className="font-semibold">{label}</span>
      {children}
    </div>
  );
}

function Options<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-white/[0.06] p-1">
      {options.map((o) => (
        <button
          key={String(o.id)}
          onClick={() => onChange(o.id)}
          className={cx(
            "rounded-full px-3 py-1.5 text-sm font-semibold transition",
            value === o.id ? "bg-fg text-ink" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DangerRow({
  label,
  hint,
  onConfirm,
}: {
  label: string;
  hint: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-muted">{hint}</span>
      </span>
      <button
        onClick={() => {
          if (!armed) {
            setArmed(true);
            window.setTimeout(() => setArmed(false), 3500);
            return;
          }
          setArmed(false);
          onConfirm();
        }}
        className={cx(
          "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
          armed ? "bg-danger text-ink" : "bg-white/10 text-danger hover:bg-danger/15",
        )}
      >
        <Trash2 className="size-4" />
        {armed ? "Confirmar" : "Borrar"}
      </button>
    </div>
  );
}
