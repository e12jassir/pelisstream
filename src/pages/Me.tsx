import { motion, useInView, animate } from "motion/react";
import { Bookmark, Clapperboard, Clock, Heart, ListVideo, Pencil, Plus, Repeat, Tv } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { genreLabel } from "../lib/cinemeta";
import { cx } from "../lib/format";
import { navigate } from "../lib/router";
import { actions, useActiveProfile, useProfileData } from "../lib/store";
import { statistics } from "../lib/taste";
import { ui } from "../lib/ui";
import type { MediaItem } from "../lib/types";
import { Avatar } from "../components/Avatar";
import { ContinueRail } from "../components/HomeRails";
import { ItemsRail, GUTTER } from "../components/Rail";

export function Me() {
  const profile = useActiveProfile();
  const data = useProfileData();
  const stats = statistics(data);
  if (!profile) return null;
  const hours = Math.floor(stats.watchedMinutes / 60);
  const resolve = (ids: string[]) =>
    ids.map((id) => data.meta[id]).filter((x): x is MediaItem => Boolean(x));
  const loved = resolve(
    Object.entries(data.ratings)
      .filter(([, r]) => r !== "down")
      .map(([id]) => id),
  );
  const reminders = resolve(data.reminders);
  const maxGenre = stats.topGenres[0]?.weight ?? 1;

  return (
    <div className="pb-28">
      <section className="relative pt-28 pb-12 md:pt-16">
        <div className="pointer-events-none absolute -top-40 -left-20 size-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(240,166,64,0.18),transparent)]" />
        <div className={cx("relative flex flex-col gap-8 sm:flex-row sm:items-end", GUTTER)}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          >
            <Avatar
              index={profile.avatar}
              className="size-32 shadow-2xl shadow-black/60 sm:size-40"
            />
          </motion.div>
          <div className="flex-1">
            <div className="mb-2 text-xs font-bold tracking-[0.18em] text-accent uppercase">
              Mi espacio
            </div>
            <h1 className="mb-3 display text-5xl tracking-tight sm:text-7xl">{profile.name}</h1>
            <p className="text-muted">
              {profile.kids ? "Perfil infantil · " : ""}
              {stats.watched} títulos vistos · {stats.list} en tu lista · {stats.rated} calificados
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => ui.editProfile(null)}
              className="inline-flex items-center gap-2 rounded-full bg-fg px-5 py-2.5 text-sm font-bold text-ink transition hover:scale-105"
            >
              <Plus className="size-4" /> Crear perfil
            </button>
            <button
              onClick={() => ui.editProfile(profile.id)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold transition hover:bg-white/20"
            >
              <Pencil className="size-4" /> Editar
            </button>
            <button
              onClick={() => actions.signOut()}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold transition hover:bg-white/20"
            >
              <Repeat className="size-4" /> Cambiar
            </button>
          </div>
        </div>
      </section>

      <section className={cx("mb-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", GUTTER)}>
        <Stat
          icon={<Clock className="size-5" />}
          label="Tiempo viendo"
          value={hours}
          suffix={hours === 1 ? " hora" : " horas"}
          extra={`${stats.watchedMinutes % 60} min`}
        />
        <Stat
          icon={<Clapperboard className="size-5" />}
          label="Películas vistas"
          value={stats.movies}
        />
        <Stat
          icon={<Tv className="size-5" />}
          label="Series empezadas"
          value={stats.series}
          extra={`${stats.episodes} episodios`}
        />
        <Stat
          icon={<Heart className="size-5" />}
          label="Te encantaron"
          value={stats.loved}
          extra={`${stats.rated} calificados`}
        />
      </section>

      <section className={cx("mb-14 grid gap-6 lg:grid-cols-[1.2fr_1fr]", GUTTER)}>
        <div className="rounded-3xl bg-white/[0.03] refract p-6 sm:p-8">
          <h2 className="mb-1 text-xl font-bold">Tu ADN de géneros</h2>
          <p className="mb-6 text-sm text-muted">
            Calculado a partir de tus calificaciones, tu lista y lo que ves.
          </p>
          {stats.topGenres.length ? (
            <div className="space-y-4">
              {stats.topGenres.map((g, i) => (
                <button
                  key={g.genre}
                  onClick={() => navigate({ name: "genre", genre: g.genre })}
                  className="group/g block w-full text-left"
                >
                  <div className="mb-1.5 flex justify-between text-sm font-semibold">
                    <span className="group-hover/g:text-accent">{genreLabel(g.genre)}</span>
                    <span className="text-dim">{Math.round((g.weight / maxGenre) * 100)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      style={{ originX: 0 }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: g.weight / maxGenre }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full w-full rounded-full bg-accent"
                    />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted">
              Califica o agrega títulos a tu lista para descubrir tu perfil de gustos.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Shortcut
            icon={<Bookmark className="size-6" />}
            title="Mi lista"
            value={`${stats.list} títulos`}
            onClick={() => navigate({ name: "list" })}
          />
          <Shortcut
            icon={<ListVideo className="size-6" />}
            title="Historial"
            value={`${stats.watched} vistos`}
            onClick={() => navigate({ name: "list" })}
          />
          <Shortcut
            icon={<Heart className="size-6" />}
            title="Recordatorios"
            value={`${reminders.length} activos`}
            onClick={() => navigate({ name: "new" })}
          />
          <Shortcut
            icon={<Pencil className="size-6" />}
            title="Ajustes"
            value="Reproducción y perfil"
            onClick={() => navigate({ name: "settings" })}
          />
        </div>
      </section>

      <div className="space-y-12">
        <ContinueRail />
        {loved.length > 0 && (
          <ItemsRail title="Títulos que te gustaron" items={loved} variant="poster" />
        )}
        {reminders.length > 0 && <ItemsRail title="Tus recordatorios" items={reminders} />}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix = "",
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  extra?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      className="rounded-3xl bg-white/[0.04] refract p-5 sm:p-6"
    >
      <div className="mb-6 flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
        {icon}
      </div>
      <div className="display text-4xl tabular-nums sm:text-5xl">
        {shown}
        <span className="font-sans text-base font-semibold text-muted">{suffix}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-muted">{label}</div>
      {extra && <div className="mt-0.5 text-xs text-dim">{extra}</div>}
    </motion.div>
  );
}

function Shortcut({
  icon,
  title,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="flex flex-col justify-between rounded-3xl bg-white/[0.03] refract p-5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span className="mb-8 text-accent">{icon}</span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className="text-sm text-muted">{value}</span>
      </span>
    </motion.button>
  );
}
