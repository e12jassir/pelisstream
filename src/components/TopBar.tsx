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
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-4 pt-4 md:pl-[84px]">
      <form
        onSubmit={submit}
        className={cx(
          "glass pointer-events-auto flex h-12 items-center gap-3 rounded-full px-5 transition-all duration-300",
          focused
            ? "w-full max-w-lg shadow-[0_20px_60px_-10px_rgba(0,0,0,0.85)]"
            : "w-full max-w-sm sm:max-w-md",
        )}
      >
        <Search className={cx("size-4 shrink-0 transition", focused ? "text-accent" : "text-muted")} />
        <input
          ref={inputRef}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setValue(e.target.value)}
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
