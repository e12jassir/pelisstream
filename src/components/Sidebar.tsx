import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  Clapperboard,
  Flame,
  House,
  LayoutGrid,
  Pencil,
  Plus,
  Settings,
  Tv,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "../lib/format";
import { EASE_SPRING } from "../lib/motion";
import { navigate, routeHref, useRoute, type Route } from "../lib/router";
import { actions, useActiveProfile, useProfileData, useProfiles } from "../lib/store";
import type { Profile } from "../lib/types";
import { ui } from "../lib/ui";
import { Avatar } from "./Avatar";

export interface NavItem {
  route: Route;
  label: string;
  icon: LucideIcon;
  match: Route["name"][];
}

export const PRIMARY_NAV: NavItem[] = [
  { route: { name: "home" }, label: "Inicio", icon: House, match: ["home", "brand"] },
  { route: { name: "movies" }, label: "Películas", icon: Clapperboard, match: ["movies"] },
  { route: { name: "series" }, label: "Series", icon: Tv, match: ["series"] },
  { route: { name: "new" }, label: "Novedades", icon: Flame, match: ["new"] },
  {
    route: { name: "categories" },
    label: "Categorías",
    icon: LayoutGrid,
    match: ["categories", "genre"],
  },
  { route: { name: "list" }, label: "Mi lista", icon: Bookmark, match: ["list"] },
];

const SECONDARY_NAV: NavItem[] = [
  { route: { name: "me" }, label: "Mi cuenta", icon: UserRound, match: ["me"] },
  { route: { name: "settings" }, label: "Ajustes", icon: Settings, match: ["settings"] },
];

export function switchToProfile(p: Profile) {
  const go = () => {
    actions.selectProfile(p.id);
    navigate({ name: "home" });
    ui.toast(`Hola, ${p.name}`);
  };
  if (p.pin) ui.requestPin(p.id, go);
  else go();
}

function RailItem({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <a
      href={routeHref(item.route)}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cx(
        "group/item relative flex size-12 items-center justify-center rounded-2xl transition-colors",
        active ? "text-fg" : "text-muted hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          transition={{ duration: 0.45, ease: EASE_SPRING }}
          className="absolute inset-0 rounded-2xl bg-white/[0.12] refract"
        />
      )}
      <Icon
        className={cx(
          "relative size-[21px] shrink-0 transition-transform duration-300 ease-[var(--ease-spring)] group-hover/item:scale-110",
          active && "text-accent",
        )}
        strokeWidth={active ? 2.3 : 1.85}
      />
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-extrabold text-ink">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="glass pointer-events-none absolute left-[64px] z-50 -translate-x-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold text-fg opacity-0 transition duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100">
        {item.label}
      </span>
    </a>
  );
}

export function Sidebar() {
  const route = useRoute();
  const profile = useActiveProfile();
  const profiles = useProfiles();
  const listCount = useProfileData().list.length;
  const [switcher, setSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!switcher) return;
    const onPointer = (e: MouseEvent) => {
      if (!switcherRef.current?.contains(e.target as Node)) setSwitcher(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSwitcher(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [switcher]);

  if (!profile) return null;
  const isActive = (item: NavItem) => item.match.includes(route.name);

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-y-0 left-3 z-50 hidden w-[60px] flex-col justify-between py-4 md:flex"
    >
      {/* Esquina superior izquierda: Perfil (solo imagen, sin mini panel) */}
      <div ref={switcherRef} className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setSwitcher((s) => !s)}
          aria-expanded={switcher}
          aria-label={`Perfil: ${profile.name}`}
          className="group/prof relative flex size-11 items-center justify-center rounded-[24%] transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-105 active:scale-95"
        >
          <Avatar index={profile.avatar} className="size-10 shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.65)]" />
          {!switcher && (
            <span className="glass pointer-events-none absolute left-[56px] z-50 -translate-x-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold text-fg opacity-0 transition duration-200 group-hover/prof:translate-x-0 group-hover/prof:opacity-100">
              {profile.name}
            </span>
          )}
        </button>

        <AnimatePresence>
          {switcher && (
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.96 }}
              transition={{ duration: 0.25, ease: EASE_SPRING }}
              className="glass absolute top-0 left-[60px] z-50 w-60 space-y-1 rounded-2xl p-2"
            >
              <div className="px-2.5 py-1.5 text-xs font-bold tracking-wider text-dim uppercase">
                {profile.name}
              </div>
              {profiles
                .filter((p) => p.id !== profile.id)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSwitcher(false);
                      switchToProfile(p);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold text-muted transition hover:bg-white/[0.08] hover:text-fg"
                  >
                    <Avatar index={p.avatar} className="size-6" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              <div className="my-1 h-px bg-white/10" />
              <button
                onClick={() => {
                  setSwitcher(false);
                  ui.editProfile(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold text-accent transition hover:bg-white/[0.08]"
              >
                <Plus className="size-4" />
                Crear nuevo perfil
              </button>
              <button
                onClick={() => {
                  setSwitcher(false);
                  ui.editProfile(profile.id);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold text-muted transition hover:bg-white/[0.08] hover:text-fg"
              >
                <Pencil className="size-4" />
                Editar este perfil
              </button>
              <button
                onClick={() => {
                  setSwitcher(false);
                  actions.signOut();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-semibold text-muted transition hover:bg-white/[0.08] hover:text-fg"
              >
                <Users className="size-4" />
                Cambiar de perfil
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Isla central: Navegación (centrada verticalmente) */}
      <div className="glass pointer-events-auto absolute top-1/2 left-0 flex -translate-y-1/2 flex-col items-center gap-1 rounded-[24px] p-1.5">
        {PRIMARY_NAV.map((item) => (
          <RailItem
            key={item.label}
            item={item}
            active={isActive(item)}
            badge={item.route.name === "list" ? listCount : undefined}
          />
        ))}
      </div>

      {/* Isla inferior: Cuenta y Ajustes */}
      <div className="glass pointer-events-auto flex flex-col items-center gap-1 rounded-[24px] p-1.5">
        {SECONDARY_NAV.map((item) => (
          <RailItem key={item.label} item={item} active={isActive(item)} />
        ))}
      </div>
    </nav>
  );
}

const MOBILE_TABS: NavItem[] = [
  PRIMARY_NAV[0],
  PRIMARY_NAV[1],
  PRIMARY_NAV[3],
  PRIMARY_NAV[5],
  SECONDARY_NAV[0],
];

export function MobileNav() {
  const route = useRoute();
  const profile = useActiveProfile();

  if (!profile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => actions.signOut()}
        aria-label={`Perfil: ${profile.name} (cambiar)`}
        className="fixed top-4 right-4 z-40 flex size-12 items-center justify-center transition active:scale-95 md:hidden"
      >
        <Avatar index={profile.avatar} className="size-9 shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.55)]" />
      </button>

      <nav className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl px-2 py-2 md:hidden">
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          const active = item.match.includes(route.name);
          return (
            <a
              key={item.label}
              href={routeHref(item.route)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition",
                active ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.75} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
