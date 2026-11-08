import { useSyncExternalStore } from "react";
import { isPlatformId } from "./platforms";
import type { PlatformId } from "./types";

export type Route =
  | { name: "home" }
  | { name: "movies" }
  | { name: "series" }
  | { name: "new" }
  | { name: "search"; q?: string }
  | { name: "list" }
  | { name: "categories" }
  | { name: "genre"; genre: string }
  | { name: "brand"; platform: PlatformId }
  | { name: "me" }
  | { name: "settings" };

export type RouteName = Route["name"];

const parse = (hash: string): Route => {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [head, arg] = path.split("/");
  const params = new URLSearchParams(query);
  switch (head) {
    case "movies":
    case "series":
    case "new":
    case "list":
    case "categories":
    case "me":
    case "settings":
      return { name: head };
    case "search":
      return { name: "search", q: params.get("q") ?? undefined };
    case "genre":
      return arg ? { name: "genre", genre: decodeURIComponent(arg) } : { name: "categories" };
    case "brand":
      return arg && isPlatformId(arg) ? { name: "brand", platform: arg } : { name: "home" };
    default:
      return { name: "home" };
  }
};

export const routeHref = (route: Route): string => {
  switch (route.name) {
    case "home":
      return "#/";
    case "search":
      return route.q ? `#/search?q=${encodeURIComponent(route.q)}` : "#/search";
    case "genre":
      return `#/genre/${encodeURIComponent(route.genre)}`;
    case "brand":
      return `#/brand/${route.platform}`;
    default:
      return `#/${route.name}`;
  }
};

let current = parse(window.location.hash);
const listeners = new Set<() => void>();
window.addEventListener("hashchange", () => {
  current = parse(window.location.hash);
  listeners.forEach((l) => l());
});

export const navigate = (route: Route, opts: { replace?: boolean } = {}) => {
  const href = routeHref(route);
  if (opts.replace) {
    history.replaceState(null, "", href);
    current = parse(href);
    listeners.forEach((l) => l());
  } else if (window.location.hash !== href) {
    window.location.hash = href;
  }
};

export const useRoute = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
