import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/format";

type BtnProps = ComponentProps<typeof motion.button>;
const press = {
  whileTap: { scale: 0.96 },
  transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as const },
};

export function PrimaryButton({
  className,
  children,
  ...rest
}: BtnProps & { children: ReactNode }) {
  return (
    <motion.button
      {...press}
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-fg px-6 text-[0.95rem] font-semibold tracking-[-0.01em] text-ink transition-transform duration-500 ease-[var(--ease-spring)] hover:scale-[1.035]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function GlassButton({ className, children, ...rest }: BtnProps & { children: ReactNode }) {
  return (
    <motion.button
      {...press}
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-white/[0.13] px-6 text-[0.95rem] font-semibold tracking-[-0.01em] text-fg backdrop-blur-2xl transition-transform duration-500 ease-[var(--ease-spring)] refract hover:scale-[1.035]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function IconButton({
  className,
  children,
  label,
  active,
  size = "md",
  ...rest
}: BtnProps & { children: ReactNode; label: string; active?: boolean; size?: "sm" | "md" | "lg" }) {
  return (
    <motion.button
      {...press}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full transition-transform duration-500 ease-[var(--ease-spring)] hover:scale-[1.08]",
        size === "sm" && "size-8",
        size === "md" && "size-10",
        size === "lg" && "size-12",
        active ? "bg-fg text-ink" : "bg-white/[0.12] text-fg backdrop-blur-xl refract",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function Chip({
  active,
  children,
  className,
  ...rest
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      className={cx(
        "relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-transform duration-500 ease-[var(--ease-spring)] active:scale-95",
        active ? "bg-fg text-ink" : "bg-white/[0.06] text-muted refract hover:text-fg",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
