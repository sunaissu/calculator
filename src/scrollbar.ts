import type { CSSProperties } from "react";

export interface CalculatorScrollbarOptions {
  /** CSS color for the draggable thumb. Omit both colors for browser styling. */
  thumbColor?: string;
  /** CSS color for the track. Defaults to transparent when a thumb color is set. */
  trackColor?: string;
  /** `none` hides the scrollbar without disabling scrolling. */
  width?: "auto" | "thin" | "none";
}

/** Scrollbar variables; use getCalculatorScrollbarProps for host containers. */
export function getCalculatorScrollbarStyle(options: CalculatorScrollbarOptions = {}): CSSProperties {
  const thumb = options.thumbColor?.trim();
  const track = options.trackColor?.trim();
  return {
    "--calculator-scrollbar-width": options.width ?? "auto",
    "--calculator-scrollbar-color": thumb || track
      ? `${thumb || "currentColor"} ${track || "transparent"}`
      : "auto",
    "--calculator-scrollbar-thumb": thumb || "currentColor",
    "--calculator-scrollbar-track": track || "transparent",
    "--calculator-scrollbar-size": options.width === "thin" ? "8px" : "12px",
  } as CSSProperties;
}

/** Apply to a host-owned scroll container, including browser fallback attributes. */
export function getCalculatorScrollbarProps(options: CalculatorScrollbarOptions = {}) {
  const mode = options.width === "none" ? "hidden" as const
    : options.thumbColor?.trim() || options.trackColor?.trim()
      ? "custom" as const : "native" as const;
  return {
    className: "sunaissu-calculator-scrollbar",
    "data-calculator-scrollbar": mode,
    style: getCalculatorScrollbarStyle(options),
  };
}
