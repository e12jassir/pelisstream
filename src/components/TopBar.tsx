import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "../lib/format";
import { navigate, useRoute } from "../lib/router";

export function TopBar() {
  const route = useRoute();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (route.name !== "search") setValue("");
  }, [route.name]);

  if (route.name === "search") return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    navigate({ name: "search", q: q || undefined });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-end px-4 pt-4 md:pr-8 md:pl-[104px]">
      <form
        onSubmit={submit}
        className={cx(
          "glass pointer-events-auto flex h-11 items-center gap-2.5 rounded-full px-4 transition-all duration-300",
          focused ? "w-full max-w-sm border-white/25 sm:w-80" : "w-52 sm:w-64 hover:border-white/20",
        )}
      >
        <Search className={cx("size-4 shrink-0 transition", focused ? "text-accent" : "text-muted")} />
        <input
          ref={inputRef}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            if (next.trim().length >= 2) {
              navigate({ name: "search", q: next.trim() });
            }
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
    </div>
  );
}
