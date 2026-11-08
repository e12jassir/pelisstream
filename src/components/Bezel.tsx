import type { CSSProperties, ReactNode } from "react";
import { cx } from "../lib/format";

/** Double-Bezel surface: hairline outer shell + concentric refracting core. */
export function Bezel({
  radius = 24,
  pad = 5,
  className,
  coreClassName,
  style,
  children,
}: {
  radius?: number;
  pad?: number;
  className?: string;
  coreClassName?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={cx("bezel", className)}
      style={{ ["--bz-r" as string]: `${radius}px`, ["--bz-p" as string]: `${pad}px`, ...style }}
    >
      <div className={cx("bezel-core", coreClassName)}>{children}</div>
    </div>
  );
}
