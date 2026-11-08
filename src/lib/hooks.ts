import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { catalogKey, getCatalog, getMeta, isKidsSafe, type CatalogQuery } from "./cinemeta";
import { useActiveProfile } from "./store";
import type { MediaItem, MetaDetails } from "./types";

export function useKidsFilter() {
  const profile = useActiveProfile();
  const kids = profile?.kids ?? false;
  return useCallback((items: MediaItem[]) => (kids ? items.filter(isKidsSafe) : items), [kids]);
}

export function useCatalog(query: CatalogQuery | null, enabled = true) {
  const filter = useKidsFilter();
  const key = query ? catalogKey(query) : "";
  const [state, setState] = useState<{
    key: string;
    items: MediaItem[];
    loading: boolean;
    error: boolean;
  }>({
    key: "",
    items: [],
    loading: Boolean(query),
    error: false,
  });

  useEffect(() => {
    if (!query || !enabled) return;
    let alive = true;
    setState((s) => ({ ...s, key, loading: true, error: false }));
    getCatalog(query)
      .then((items) => alive && setState({ key, items, loading: false, error: false }))
      .catch(() => alive && setState({ key, items: [], loading: false, error: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const items = state.key === key ? filter(state.items) : [];
  return { items, loading: state.key !== key ? Boolean(query) : state.loading, error: state.error };
}

/** Paginated catalog for grid views (infinite scroll). */
export function usePagedCatalog(
  query: CatalogQuery | null,
  clientFilter?: (i: MediaItem) => boolean,
) {
  const filter = useKidsFilter();
  const key = query ? catalogKey(query) : "";
  const [state, setState] = useState<{
    key: string;
    items: MediaItem[];
    done: boolean;
    loading: boolean;
  }>({
    key: "",
    items: [],
    done: false,
    loading: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const queryRef = useRef(query);
  queryRef.current = query;
  const inflight = useRef<string | null>(null);

  const fetchPage = useCallback(
    (reset: boolean) => {
      const q = queryRef.current;
      if (!q) return;
      const s = stateRef.current;
      const fresh = reset || s.key !== key;
      if (!fresh && (s.done || inflight.current === key)) return;
      const base = fresh ? [] : s.items;
      inflight.current = key;
      const next = { key, items: base, done: false, loading: true };
      stateRef.current = next;
      setState(next);
      getCatalog({ ...q, skip: base.length || undefined })
        .then((page) => {
          if (stateRef.current.key !== key) return;
          const ids = new Set(base.map((i) => i.id));
          const merged = [...base, ...page.filter((i) => !ids.has(i.id))];
          setState({ key, items: merged, done: merged.length === base.length, loading: false });
        })
        .catch(() => {
          if (stateRef.current.key === key)
            setState({ key, items: base, done: true, loading: false });
        })
        .finally(() => {
          if (inflight.current === key) inflight.current = null;
        });
    },
    [key],
  );

  useEffect(() => {
    fetchPage(true);
  }, [fetchPage]);

  let items = state.key === key ? filter(state.items) : [];
  if (clientFilter) items = items.filter(clientFilter);
  return {
    items,
    loading: state.loading || state.key !== key,
    done: state.key === key && state.done,
    loadMore: () => fetchPage(false),
  };
}

export function useMeta(item: MediaItem | null) {
  const [state, setState] = useState<{ id: string; details: MetaDetails | null; loading: boolean }>(
    {
      id: "",
      details: null,
      loading: false,
    },
  );
  useEffect(() => {
    if (!item) return;
    let alive = true;
    setState({ id: item.id, details: null, loading: true });
    getMeta(item.type, item.id)
      .catch(() => getMeta(item.type === "movie" ? "series" : "movie", item.id))
      .then((details) => alive && setState({ id: item.id, details, loading: false }))
      .catch(() => alive && setState({ id: item.id, details: null, loading: false }));
    return () => {
      alive = false;
    };
  }, [item?.id, item?.type]);
  return state.id === item?.id ? state : { id: "", details: null, loading: true };
}

export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "300px",
  once = true,
) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}

export function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

export const canHover = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
