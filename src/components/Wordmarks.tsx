import { useId } from "react";
import { cx } from "../lib/format";
import type { PlatformId } from "../lib/types";

const APPLE =
  "M17.6 12.9c0-2.6 2.1-3.9 2.2-3.9-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4zM15.1 5.3c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z";

/**
 * Stylized vector wordmarks used to identify each streaming catalog.
 * Heights are normalised so marks sit on a shared optical baseline.
 */
export function PlatformWordmark({
  id,
  className,
  mono,
}: {
  id: PlatformId;
  className?: string;
  /** Render in currentColor (for small inline eyebrows). */
  mono?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const common = cx("block h-full w-auto overflow-visible", className);
  switch (id) {
    case "nfx":
      return (
        <svg viewBox="0 0 200 54" className={common} role="img" aria-label="Netflix">
          <defs>
            <linearGradient id={`${uid}n`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff1f2b" />
              <stop offset="1" stopColor="#b20710" />
            </linearGradient>
          </defs>
          <text
            x="100"
            y="50"
            textAnchor="middle"
            fontFamily="'Bebas Neue', Impact, sans-serif"
            fontSize="64"
            letterSpacing="3"
            fill={mono ? "currentColor" : `url(#${uid}n)`}
          >
            NETFLIX
          </text>
        </svg>
      );
    case "hbm":
      return (
        <svg viewBox="0 0 200 54" className={common} role="img" aria-label="HBO Max">
          <g fill={mono ? "currentColor" : "#fff"}>
            <text
              x="0"
              y="44"
              fontFamily="'Hanken Grotesk', sans-serif"
              fontWeight="900"
              fontSize="46"
              letterSpacing="-1"
            >
              HBO
            </text>
            <text
              x="106"
              y="44"
              fontFamily="'Hanken Grotesk', sans-serif"
              fontWeight="600"
              fontSize="46"
              letterSpacing="-2"
            >
              max
            </text>
          </g>
        </svg>
      );
    case "dnp":
      return (
        <svg viewBox="0 0 200 62" className={common} role="img" aria-label="Disney+">
          <defs>
            <linearGradient id={`${uid}d`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset=".45" stopColor="#bdf3ff" />
              <stop offset="1" stopColor="#ffffff" />
            </linearGradient>
          </defs>
          {!mono && (
            <path
              d="M40 26 C 80 -6, 160 -8, 196 30"
              fill="none"
              stroke={`url(#${uid}d)`}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          )}
          <text
            x="0"
            y="54"
            fontFamily="Satisfy, cursive"
            fontSize="58"
            fill={mono ? "currentColor" : "#fff"}
          >
            Disney
          </text>
          <text
            x="160"
            y="50"
            fontFamily="'Hanken Grotesk', sans-serif"
            fontWeight="400"
            fontSize="44"
            fill={mono ? "currentColor" : "#fff"}
          >
            +
          </text>
        </svg>
      );
    case "atp":
      return (
        <svg viewBox="0 0 150 54" className={common} role="img" aria-label="Apple TV+">
          <g fill={mono ? "currentColor" : "#f5f5f7"}>
            <path d={APPLE} transform="translate(0 6) scale(1.85)" />
            <text
              x="46"
              y="44"
              fontFamily="'Hanken Grotesk', -apple-system, sans-serif"
              fontWeight="600"
              fontSize="46"
              letterSpacing="-2"
            >
              tv+
            </text>
          </g>
        </svg>
      );
    case "amp":
      return (
        <svg viewBox="0 0 200 60" className={common} role="img" aria-label="Prime Video">
          <g fill={mono ? "currentColor" : "#fff"} fontFamily="'Hanken Grotesk', sans-serif">
            <text x="0" y="36" fontWeight="800" fontSize="38" letterSpacing="-1">
              prime
            </text>
            <text x="110" y="36" fontWeight="500" fontSize="38" letterSpacing="-1">
              video
            </text>
          </g>
          <g
            fill="none"
            stroke={mono ? "currentColor" : "#1a98ff"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 46 Q 52 62 98 44" />
            <path d="M88 40 L 99 44 L 92 53" />
          </g>
        </svg>
      );
  }
}
