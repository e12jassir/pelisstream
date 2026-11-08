import { useId } from "react";
import { cx } from "../lib/format";

export function BrandMark({ className }: { className?: string }) {
  const id = `brand${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" className={cx("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc372" />
          <stop offset="1" stopColor="#e2852a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path
        d="M12.5 9.8v12.4a.9.9 0 0 0 1.37.77l9.9-6.2a.9.9 0 0 0 0-1.54l-9.9-6.2a.9.9 0 0 0-1.37.77z"
        fill="#1a0f02"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "display text-[1.35rem] leading-none tracking-tight whitespace-nowrap",
        className,
      )}
    >
      Pelis<span className="text-accent">Stream</span>
    </span>
  );
}
