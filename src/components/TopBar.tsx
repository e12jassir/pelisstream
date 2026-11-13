import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Film, Search, Star, Tv, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchAll } from "../lib/cinemeta";
import { cx } from "../lib/format";
import { useDebounced, useKidsFilter } from "../lib/hooks";
import { EASE_SPRING } from "../lib/motion";
import { navigate, useRoute } from "../lib/router";
import type { MediaItem } from "../lib/types";
import { ui } from "../lib/ui";
import { SmartImage } from "./SmartImage";

export function TopBar() {
  const route = useRoute();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MediaItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(value.trim(), 220);
  const kidsFilter = useKidsFilter();

  useEffect(() => {
    if (route.name !== "search") {
      setValue("");
      setOpen(false);
      setResults([]);
    }
  }, [route.name]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    searchAll(debounced)
      .catch(() => [] as MediaItem[])
      .then((items) => {
        if (!alive) return;
        setResults(kidsFilter(items).slice(0, 6));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced, kidsFilter]);

  if (
    route.name === "search" ||
    route.name === "list" ||
    route.name === "me" ||
    route.name === "settings"
  ) {
    return null;
  }

  const showDropdown = open && value.trim().length >= 2;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    setOpen(false);
    inputRef.current?.blur();
    navigate({ name: "search", q: q || undefined });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pr-[72px] pl-4 pt-4 md:z-30 md:pr-4 md:pl-[84px]">
      <div
        ref={containerRef}
        className={cx(
          "pointer-events-auto relative w-full transition-all duration-300",
          focused || showDropdown ? "max-w-lg" : "max-w-sm sm:max-w-md",
        )}
      >
        <form
          onSubmit={submit}
          className={cx(
            "glass flex h-12 w-full items-center gap-3 rounded-full px-5 transition-all duration-300",
            (focused || showDropdown) && "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.85)]",
          )}
        >
          <Search
            className={cx(
              "size-4 shrink-0 transition",
              focused || showDropdown ? "text-accent" : "text-muted",
            )}
          />
          <input
            ref={inputRef}
            value={value}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            placeholder="Buscar películas, series..."
            aria-label="Buscar películas o series"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-fg placeholder:text-dim outline-none"
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setResults([]);
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="rounded-full p-1 text-muted hover:text-fg"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="hidden rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-dim sm:inline-block">
              /
            </kbd>
          )}
        </form>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE_SPRING }}
              className="glass absolute inset-x-0 top-14 z-40 overflow-hidden rounded-3xl p-2"
            >
              {loading && results.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs font-medium text-muted">
                  Buscando...
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs font-medium text-muted">
                  Sin resultados para «{value.trim()}»
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        ui.openDetails(item);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl p-1.5 text-left transition hover:bg-white/[0.08]"
                    >
                      <SmartImage
                        src={item.poster}
                        fallbackSrc={item.posterFallback}
                        alt={item.title}
                        className="h-14 w-10 shrink-0 rounded-xl bg-surface object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-fg">{item.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            {item.type === "movie" ? (
                              <Film className="size-3 text-accent" />
                            ) : (
                              <Tv className="size-3 text-accent" />
                            )}
                            {item.type === "movie" ? "Película" : "Serie"}
                          </span>
                          {item.year && <span>· {item.year}</span>}
                          {item.imdbRating ? (
                            <span className="inline-flex items-center gap-0.5 text-accent">
                              · <Star className="size-3 fill-accent" /> {item.imdbRating.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}

                  <div className="my-1 h-px bg-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      const q = value.trim();
                      setOpen(false);
                      navigate({ name: "search", q });
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-xs font-bold text-accent transition hover:bg-white/[0.08]"
                  >
                    <span>Ver todos los resultados para «{value.trim()}»</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
