import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  ChevronDown,
  Clapperboard,
  Flame,
  House,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Settings,
  Tv,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "../lib/format";
import { EASE_GLIDE, EASE_SPRING } from "../lib/motion";
import { navigate, routeHref, useRoute, type Route, type RouteName } from "../lib/router";
import { actions, useActiveProfile, useProfileData, useProfiles } from "../lib/store";
import type { Profile } from "../lib/types";
import { ui } from "../lib/ui";
import { Avatar } from "./Avatar";
import { Bezel } from "./Bezel";
import { BrandMark, Wordmark } from "./Brand";

interface NavItem {
  route: Route;
  label: string;
  icon: LucideIcon;
  match: RouteName[];
}

export const PRIMARY_NAV: NavItem[] = [
  { route: { name: "search" }, label: "Buscar", icon: Search, match: ["search"] },
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
  { route: { name: "me" }, label: "Mi espacio", icon: UserRound, match: ["me"] },
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

/** One nav row. The collapsed rail and the expanded panel share geometry so icons never move. */
function Row({
  item,
  active,
  expanded,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  badge?: number;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <a
      href={routeHref(item.route)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cx(
        "group/item relative flex h-12 items-center rounded-[18px] pl-[13px]",
        active ? "text-fg" : "text-muted hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId={expanded ? "nav-pill-x" : "nav-pill"}
          transition={{ duration: 0.5, ease: EASE_SPRING }}
          className="absolute inset-0 rounded-[18px] bg-white/[0.09] refract"
        />
      )}
      <Icon
        className={cx(
          "relative size-[22px] shrink-0 transition-transform duration-500 ease-[var(--ease-spring)] group-hover/item:scale-110",
          active && "text-accent",
        )}
        strokeWidth={active ? 2.3 : 1.85}
      />
      {expanded && (
        <span className="relative ml-4 flex flex-1 items-center justify-between pr-4 text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap">
          {item.label}
          {!!badge && (
            <span className="numeric rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-muted">
              {badge}
            </span>
          )}
        </span>
      )}
    </a>
  );
}

export function Sidebar() {
  const route = useRoute();
  const profile = useActiveProfile();
  const profiles = useProfiles();
  const listCount = useProfileData().list.length;
  const [open, setOpen] = useState(false);
  const [switcher, setSwitcher] = useState(false);

  useEffect(() => {
    if (!open) setSwitcher(false);
  }, [open]);

  if (!profile) return null;
  const isActive = (item: NavItem) => item.match.includes(route.name);

  const body = (expanded: boolean) => (
    <div className="flex h-full flex-col py-5">
      <a
        href="#/"
        className="mb-6 flex h-10 items-center pl-[14px]"
        aria-label="PelisStream, inicio"
        onClick={() => setOpen(false)}
      >
        <BrandMark className="size-7" />
        {expanded && <Wordmark className="ml-3" />}
      </a>

      <button
        onClick={() => expanded && setSwitcher((s) => !s)}
        aria-expanded={expanded ? switcher : undefined}
        aria-label={`Perfil: ${profile.name}`}
        className="group/prof mb-3 flex items-center rounded-[18px] p-[6px] pl-[10px] text-left"
      >
        <Avatar index={profile.avatar} className="size-9 shrink-0" />
        {expanded && (
          <span className="ml-3 flex min-w-0 flex-1 items-center justify-between pr-2">
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{profile.name}</span>
              <span className="block text-xs text-muted">
                {profile.kids ? "Perfil infantil" : "Cambiar perfil"}
              </span>
            </span>
            <ChevronDown
              className={cx(
                "size-4 text-muted transition-transform duration-500 ease-[var(--ease-spring)]",
                switcher && "rotate-180",
              )}
            />
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && switcher && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.4, ease: EASE_GLIDE }}
            className="mx-1 mb-3 space-y-0.5 rounded-2xl bg-white/[0.04] p-1.5 refract"
          >
            {profiles
              .filter((p) => p.id !== profile.id)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setOpen(false);
                    switchToProfile(p);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-semibold text-muted hover:bg-white/[0.06] hover:text-fg"
                >
                  <Avatar index={p.avatar} className="size-7" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            <button
              onClick={() => {
                setOpen(false);
                ui.editProfile(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-semibold text-accent hover:bg-white/[0.06]"
            >
              <span className="flex size-7 items-center justify-center">
                <Plus className="size-4" />
              </span>
              Crear nuevo perfil
            </button>
            <button
              onClick={() => {
                setOpen(false);
                ui.editProfile(profile.id);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-semibold text-muted hover:bg-white/[0.06] hover:text-fg"
            >
              <span className="flex size-7 items-center justify-center">
                <Pencil className="size-4" />
              </span>
              Editar este perfil
            </button>
            <button
              onClick={() => {
                setOpen(false);
                actions.signOut();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-semibold text-muted hover:bg-white/[0.06] hover:text-fg"
            >
              <span className="flex size-7 items-center justify-center">
                <Users className="size-4" />
              </span>
              Cambiar de perfil
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout="position"
        transition={{ duration: 0.45, ease: EASE_SPRING }}
        className="flex flex-1 flex-col justify-between"
      >
        <div className="flex flex-col gap-1 px-1">
          {PRIMARY_NAV.map((item) => (
            <Row
              key={item.label}
              item={item}
              active={isActive(item)}
              expanded={expanded}
              badge={item.route.name === "list" ? listCount : undefined}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </div>
        <div className="mx-1 flex flex-col gap-1 pt-4">
          <div className="mx-3 mb-2 h-px bg-white/[0.07]" />
          {SECONDARY_NAV.map((item) => (
            <Row
              key={item.label}
              item={item}
              active={isActive(item)}
              expanded={expanded}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_GLIDE }}
            className="pointer-events-none fixed inset-0 z-40 hidden bg-gradient-to-r from-ink via-ink/80 to-ink/10 md:block"
          />
        )}
      </AnimatePresence>
      <nav
        aria-label="Navegación principal"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
        className="fixed inset-y-0 left-0 z-50 hidden w-[84px] md:block"
      >
        <Bezel
          radius={28}
          pad={4}
          className="glass absolute top-3 bottom-3 left-3 w-[66px]"
          coreClassName="h-full !bg-transparent"
        >
          <div className={cx("h-full transition-opacity duration-200", open && "opacity-0")}>
            {body(false)}
          </div>
        </Bezel>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{
                opacity: 0,
                x: -10,
                scale: 0.985,
                transition: { duration: 0.2, ease: EASE_GLIDE },
              }}
              transition={{ duration: 0.45, ease: EASE_SPRING }}
              style={{ transformOrigin: "left center" }}
              className="absolute top-3 bottom-3 left-3 w-[288px]"
            >
              <Bezel
                radius={28}
                pad={4}
                className="glass h-full"
                coreClassName="h-full !bg-transparent"
              >
                {body(true)}
              </Bezel>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

const MOBILE_TABS: NavItem[] = [
  PRIMARY_NAV[1],
  PRIMARY_NAV[0],
  PRIMARY_NAV[4],
  PRIMARY_NAV[6],
  SECONDARY_NAV[0],
];

export function MobileNav() {
  const route = useRoute();
  const profile = useActiveProfile();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!profile) return null;
  const chips: Array<{ route: Route; label: string; match: RouteName[] }> = [
    { route: { name: "movies" }, label: "Películas", match: ["movies"] },
    { route: { name: "series" }, label: "Series", match: ["series"] },
    { route: { name: "categories" }, label: "Categorías", match: ["categories", "genre"] },
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-3 pb-2.5 md:hidden">
        <div
          className={cx(
            "glass absolute inset-0 transition-opacity duration-500 refract",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cx(
            "absolute inset-0 bg-gradient-to-b from-ink/90 to-transparent transition-opacity duration-500",
            scrolled ? "opacity-0" : "opacity-100",
          )}
        />
        <div className="relative flex items-center justify-between">
          <a href="#/" className="flex items-center gap-2.5">
            <BrandMark className="size-7" />
            <Wordmark className="text-lg" />
          </a>
          <button onClick={() => actions.signOut()} aria-label="Cambiar perfil">
            <Avatar index={profile.avatar} className="size-8" />
          </button>
        </div>
        <div className="no-scrollbar relative mt-3 flex gap-2 overflow-x-auto">
          {chips.map((c) => {
            const active = c.match.includes(route.name);
            return (
              <a
                key={c.label}
                href={routeHref(c.route)}
                className={cx(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                  active ? "bg-fg text-ink" : "bg-white/[0.08] text-fg refract",
                )}
              >
                {c.label}
              </a>
            );
          })}
        </div>
      </header>
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] refract md:hidden">
        {MOBILE_TABS.map((item) => {
          const active = item.match.includes(route.name);
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={routeHref(item.route)}
              className={cx(
                "relative flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-semibold",
                active ? "text-fg" : "text-dim",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mnav"
                  transition={{ duration: 0.45, ease: EASE_SPRING }}
                  className="absolute -top-2 h-[3px] w-8 rounded-full bg-accent"
                />
              )}
              <Icon
                className={cx("size-[22px]", active && "text-accent")}
                strokeWidth={active ? 2.3 : 1.85}
              />
              {item.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
