import { useState, type ImgHTMLAttributes } from "react";
import { cx } from "../lib/format";

/** Image that fades in on load and swaps to a fallback node on error. */
export function SmartImage({
  className,
  fallback,
  onLoad,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement> & { fallback?: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  if (state === "error") return <>{fallback ?? null}</>;
  return (
    <img
      loading="lazy"
      decoding="async"
      draggable={false}
      {...rest}
      onLoad={(e) => {
        setState("ok");
        onLoad?.(e);
      }}
      onError={() => setState("error")}
      className={cx(
        "transition-opacity duration-700",
        state === "ok" ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}

export function TitleLogo({
  item,
  className,
  textClassName,
}: {
  item: { logo: string; title: string };
  className?: string;
  textClassName?: string;
}) {
  return (
    <SmartImage
      key={item.logo}
      src={item.logo}
      alt={item.title}
      loading="eager"
      className={cx(
        "object-contain object-left-bottom drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]",
        className,
      )}
      fallback={
        <span
          className={cx(
            "block font-title leading-[0.92] tracking-[-0.01em] text-balance text-fg drop-shadow-[0_6px_30px_rgba(0,0,0,0.7)]",
            textClassName,
          )}
        >
          {item.title}
        </span>
      }
    />
  );
}
