import { useId, type ReactNode } from "react";
import { cx } from "../lib/format";

/** Original illustrated avatar characters. Each is drawn on a 100×100 stage. */
interface AvatarArt {
  name: string;
  bg: [string, string];
  draw: (id: string) => ReactNode;
}

const ART: AvatarArt[] = [
  {
    name: "Astronauta",
    bg: ["#1e3a8a", "#0b1026"],
    draw: (id) => (
      <>
        <circle cx="18" cy="20" r="1.2" fill="#fff" opacity=".8" />
        <circle cx="82" cy="14" r="1" fill="#fff" opacity=".6" />
        <circle cx="76" cy="34" r=".8" fill="#fff" opacity=".7" />
        <path d="M22 100c2-18 14-26 28-26s26 8 28 26z" fill="#e5e7eb" />
        <circle cx="50" cy="48" r="27" fill="#f3f4f6" />
        <circle cx="50" cy="48" r="27" fill={`url(#${id}shade)`} />
        <rect x="29" y="34" width="42" height="28" rx="14" fill="#0f172a" />
        <path
          d="M35 40c6-4 14-5 22-2"
          stroke="#7dd3fc"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity=".9"
        />
        <circle cx="62" cy="52" r="3" fill="#38bdf8" opacity=".7" />
        <rect x="44" y="80" width="12" height="7" rx="2" fill="#f0a640" />
      </>
    ),
  },
  {
    name: "Robot",
    bg: ["#0f766e", "#042f2e"],
    draw: () => (
      <>
        <line x1="50" y1="12" x2="50" y2="24" stroke="#cbd5e1" strokeWidth="3" />
        <circle cx="50" cy="11" r="4" fill="#f87171" />
        <rect x="22" y="24" width="56" height="46" rx="14" fill="#e2e8f0" />
        <rect x="29" y="33" width="42" height="24" rx="9" fill="#0f172a" />
        <circle cx="40" cy="45" r="5" fill="#5eead4" />
        <circle cx="60" cy="45" r="5" fill="#5eead4" />
        <rect x="40" y="61" width="20" height="3" rx="1.5" fill="#94a3b8" />
        <rect x="16" y="40" width="6" height="14" rx="3" fill="#94a3b8" />
        <rect x="78" y="40" width="6" height="14" rx="3" fill="#94a3b8" />
        <path d="M28 100c0-14 10-22 22-22s22 8 22 22z" fill="#cbd5e1" />
      </>
    ),
  },
  {
    name: "Zorro",
    bg: ["#f97316", "#7c2d12"],
    draw: () => (
      <>
        <path d="M20 22l14 22-18 6zM80 22L66 44l18 6z" fill="#fb923c" />
        <path d="M24 30l8 13-9 3zM76 30l-8 13 9 3z" fill="#fde68a" />
        <path
          d="M50 86c-20 0-34-14-34-32 0-6 3-11 8-14 8-5 17-6 26-6s18 1 26 6c5 3 8 8 8 14 0 18-14 32-34 32z"
          fill="#fb923c"
        />
        <path
          d="M50 86c-12 0-22-8-24-18 8 2 16-2 24-12 8 10 16 14 24 12-2 10-12 18-24 18z"
          fill="#fff7ed"
        />
        <ellipse cx="38" cy="52" rx="3.5" ry="4.5" fill="#1c1917" />
        <ellipse cx="62" cy="52" rx="3.5" ry="4.5" fill="#1c1917" />
        <path d="M46 66h8l-4 5z" fill="#1c1917" />
      </>
    ),
  },
  {
    name: "Gato",
    bg: ["#a78bfa", "#3b0764"],
    draw: () => (
      <>
        <path d="M22 30l6 24 16-12zM78 30l-6 24-16-12z" fill="#334155" />
        <path d="M26 36l3 12 8-6zM74 36l-3 12-8-6z" fill="#f9a8d4" />
        <ellipse cx="50" cy="60" rx="30" ry="27" fill="#475569" />
        <ellipse cx="39" cy="56" rx="6" ry="7" fill="#fde047" />
        <ellipse cx="61" cy="56" rx="6" ry="7" fill="#fde047" />
        <ellipse cx="39" cy="57" rx="2" ry="5" fill="#111827" />
        <ellipse cx="61" cy="57" rx="2" ry="5" fill="#111827" />
        <path d="M47 67h6l-3 3z" fill="#f9a8d4" />
        <g stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round">
          <path d="M30 68l-12-2M30 72l-12 2M70 68l12-2M70 72l12 2" />
        </g>
      </>
    ),
  },
  {
    name: "Panda",
    bg: ["#4ade80", "#14532d"],
    draw: () => (
      <>
        <circle cx="26" cy="30" r="11" fill="#111827" />
        <circle cx="74" cy="30" r="11" fill="#111827" />
        <circle cx="50" cy="56" r="31" fill="#f8fafc" />
        <ellipse cx="38" cy="52" rx="8" ry="10" fill="#111827" transform="rotate(-18 38 52)" />
        <ellipse cx="62" cy="52" rx="8" ry="10" fill="#111827" transform="rotate(18 62 52)" />
        <circle cx="39" cy="51" r="2.6" fill="#fff" />
        <circle cx="61" cy="51" r="2.6" fill="#fff" />
        <ellipse cx="50" cy="66" rx="5" ry="3.5" fill="#111827" />
        <path
          d="M44 74c4 3 8 3 12 0"
          stroke="#111827"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    name: "Fantasma",
    bg: ["#6366f1", "#1e1b4b"],
    draw: () => (
      <>
        <path d="M24 92V48c0-16 12-28 26-28s26 12 26 28v44l-8-6-9 6-9-6-9 6-9-6z" fill="#f8fafc" />
        <ellipse cx="41" cy="50" rx="5" ry="7" fill="#1e1b4b" />
        <ellipse cx="59" cy="50" rx="5" ry="7" fill="#1e1b4b" />
        <ellipse cx="50" cy="66" rx="5" ry="6" fill="#1e1b4b" />
        <ellipse cx="33" cy="62" rx="4" ry="2.5" fill="#f9a8d4" opacity=".7" />
        <ellipse cx="67" cy="62" rx="4" ry="2.5" fill="#f9a8d4" opacity=".7" />
      </>
    ),
  },
  {
    name: "Alien",
    bg: ["#22d3ee", "#083344"],
    draw: () => (
      <>
        <line
          x1="34"
          y1="24"
          x2="28"
          y2="10"
          stroke="#86efac"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="66"
          y1="24"
          x2="72"
          y2="10"
          stroke="#86efac"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="28" cy="10" r="4" fill="#bbf7d0" />
        <circle cx="72" cy="10" r="4" fill="#bbf7d0" />
        <path
          d="M50 88c-18 0-30-18-30-38 0-18 13-28 30-28s30 10 30 28c0 20-12 38-30 38z"
          fill="#4ade80"
        />
        <ellipse cx="38" cy="50" rx="9" ry="12" fill="#052e16" transform="rotate(-20 38 50)" />
        <ellipse cx="62" cy="50" rx="9" ry="12" fill="#052e16" transform="rotate(20 62 50)" />
        <circle cx="36" cy="46" r="2.5" fill="#fff" />
        <circle cx="60" cy="46" r="2.5" fill="#fff" />
        <path
          d="M44 74c4 2 8 2 12 0"
          stroke="#052e16"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    name: "Búho",
    bg: ["#d6a36b", "#3b2412"],
    draw: () => (
      <>
        <path d="M26 24l10 10M74 24L64 34" stroke="#78350f" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="50" cy="58" rx="30" ry="32" fill="#92400e" />
        <ellipse cx="50" cy="68" rx="18" ry="20" fill="#fde68a" opacity=".9" />
        <circle cx="38" cy="46" r="11" fill="#fef3c7" />
        <circle cx="62" cy="46" r="11" fill="#fef3c7" />
        <circle cx="38" cy="46" r="6" fill="#1c1917" />
        <circle cx="62" cy="46" r="6" fill="#1c1917" />
        <circle cx="40" cy="44" r="2" fill="#fff" />
        <circle cx="64" cy="44" r="2" fill="#fff" />
        <path d="M46 56h8l-4 7z" fill="#f59e0b" />
      </>
    ),
  },
  {
    name: "Oso",
    bg: ["#fb7185", "#4c0519"],
    draw: () => (
      <>
        <circle cx="25" cy="30" r="11" fill="#78350f" />
        <circle cx="75" cy="30" r="11" fill="#78350f" />
        <circle cx="25" cy="30" r="5" fill="#d97706" />
        <circle cx="75" cy="30" r="5" fill="#d97706" />
        <circle cx="50" cy="56" r="30" fill="#92400e" />
        <ellipse cx="50" cy="66" rx="14" ry="11" fill="#fcd34d" />
        <circle cx="39" cy="50" r="3.6" fill="#1c1917" />
        <circle cx="61" cy="50" r="3.6" fill="#1c1917" />
        <ellipse cx="50" cy="62" rx="5" ry="3.6" fill="#1c1917" />
        <path
          d="M45 69c3 3 7 3 10 0"
          stroke="#1c1917"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    name: "Ninja",
    bg: ["#f43f5e", "#1c0508"],
    draw: () => (
      <>
        <circle cx="50" cy="54" r="31" fill="#111827" />
        <rect x="18" y="42" width="64" height="18" rx="9" fill="#fde2c7" />
        <path d="M80 44l14-6-6 10 8 4-16 0z" fill="#ef4444" />
        <rect x="18" y="38" width="64" height="5" fill="#ef4444" />
        <path
          d="M32 51c3-3 8-3 11 0M57 51c3-3 8-3 11 0"
          stroke="#111827"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    name: "Monstruo",
    bg: ["#facc15", "#713f12"],
    draw: () => (
      <>
        <path d="M30 26l6 12M70 26l-6 12" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" />
        <rect x="18" y="32" width="64" height="58" rx="28" fill="#8b5cf6" />
        <circle cx="50" cy="54" r="15" fill="#fff" />
        <circle cx="52" cy="55" r="7" fill="#1e1b4b" />
        <circle cx="54" cy="52" r="2.4" fill="#fff" />
        <path d="M34 76h32l-4 6-4-5-4 5-4-5-4 5-4-5-4 5z" fill="#fff" />
      </>
    ),
  },
  {
    name: "Clásico",
    bg: ["#f0a640", "#c2410c"],
    draw: () => (
      <g fill="#1a0f02">
        <rect x="30" y="34" width="9" height="15" rx="4.5" />
        <rect x="61" y="34" width="9" height="15" rx="4.5" />
        <path
          d="M28 60c6 10 14 15 22 15s16-5 22-15"
          stroke="#1a0f02"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    ),
  },
];

export const AVATAR_COUNT = ART.length;
export const avatarName = (index: number) =>
  ART[((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT].name;

export function Avatar({
  index,
  className,
  rounded = "rounded-[24%]",
}: {
  index: number;
  className?: string;
  rounded?: string;
}) {
  const art = ART[((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT];
  const id = `av${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 100 100"
      className={cx("block shrink-0 overflow-hidden", rounded, className)}
      role="img"
      aria-label={art.name}
    >
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={art.bg[0]} />
          <stop offset="1" stopColor={art.bg[1]} />
        </linearGradient>
        <radialGradient id={`${id}light`} cx="0.3" cy="0.12" r="0.85">
          <stop offset="0" stopColor="#fff" stopOpacity=".32" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}shade`} cx="0.35" cy="0.3" r="0.8">
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}bg)`} />
      {art.draw(id)}
      <rect width="100" height="100" fill={`url(#${id}light)`} />
    </svg>
  );
}
