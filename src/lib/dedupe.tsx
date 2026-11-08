import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { createStore, useStore, type Store } from "./createStore";
import type { MediaItem } from "./types";

type Claims = Record<number, string[]>;
const Ctx = createContext<Store<Claims> | null>(null);

/**
 * Page-level registry that keeps titles from repeating across rails: each rail
 * (by `order`) skips anything an earlier rail already shows.
 */
export function DedupeScope({ children }: { children: ReactNode }) {
  const store = useMemo(() => createStore<Claims>({}), []);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

const EMPTY: Claims = {};
const noopStore = createStore<Claims>(EMPTY);

export function useDedupe(
  order: number | undefined,
  items: MediaItem[],
  limit: number,
  minItems = 0,
) {
  const scoped = useContext(Ctx);
  const store = scoped ?? noopStore;
  const claims = useStore(store, (s) => s);
  const active = scoped !== null && order !== undefined;

  const shown = useMemo(() => {
    if (!active) return items.slice(0, limit);
    const excluded = new Set<string>();
    for (const [k, ids] of Object.entries(claims))
      if (Number(k) < order!) ids.forEach((id) => excluded.add(id));
    return items.filter((i) => !excluded.has(i.id)).slice(0, limit);
  }, [active, claims, items, limit, order]);

  const ids = shown.length >= minItems ? shown.map((i) => i.id).join(",") : "";
  useEffect(() => {
    if (!active) return;
    store.set((prev) =>
      prev[order!]?.join(",") === ids ? prev : { ...prev, [order!]: ids ? ids.split(",") : [] },
    );
  }, [active, ids, order, store]);

  useEffect(() => {
    if (!active) return;
    return () =>
      store.set((prev) => {
        const next = { ...prev };
        delete next[order!];
        return next;
      });
  }, [active, order, store]);

  return shown;
}
