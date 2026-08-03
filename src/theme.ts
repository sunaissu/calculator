import { useSyncExternalStore, type CSSProperties } from "react";

export type CalculatorThemeMode = "light" | "dark" | "system";
export type CalculatorResolvedTheme = Exclude<CalculatorThemeMode, "system">;

/** Simple brand colors layered on top of the selected light/dark theme. */
export interface CalculatorBrandColors {
  primary?: string;
  secondary?: string;
}

export interface CalculatorTheme {
  background: string;
  surface: string;
  surfaceRaised: string;
  inset: string;
  display: string;
  border: string;
  borderStrong: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  accentHover: string;
  accentText: string;
  accentSoft: string;
  accentBorder: string;
  function: string;
  functionSoft: string;
  functionBorder: string;
  danger: string;
}

export const CALCULATOR_LIGHT_THEME: CalculatorTheme = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceRaised: "#eef2f7",
  inset: "#f1f5f9",
  display: "#ffffff",
  border: "#d9e1ea",
  borderStrong: "#b9c5d2",
  text: "#17202b",
  muted: "#526171",
  faint: "#7a8998",
  accent: "#0f9f76",
  accentHover: "#0b8b67",
  accentText: "#ffffff",
  accentSoft: "#e7f8f2",
  accentBorder: "#96d9c3",
  function: "#087ca7",
  functionSoft: "#e8f6fc",
  functionBorder: "#a9d8eb",
  danger: "#d63d59",
};

export const CALCULATOR_DARK_THEME: CalculatorTheme = {
  background: "#0e1116",
  surface: "#151920",
  surfaceRaised: "#1c222b",
  inset: "#0b0e12",
  display: "#090b0e",
  border: "#29303a",
  borderStrong: "#3c4653",
  text: "#dce3ec",
  muted: "#8994a2",
  faint: "#596473",
  accent: "#73e2bd",
  accentHover: "#8aebca",
  accentText: "#07130f",
  accentSoft: "rgba(115, 226, 189, 0.1)",
  accentBorder: "rgba(115, 226, 189, 0.35)",
  function: "#7dd3fc",
  functionSoft: "rgba(125, 211, 252, 0.08)",
  functionBorder: "rgba(125, 211, 252, 0.3)",
  danger: "#fb7185",
};

function colorMix(color: string, amount: number, withColor = "transparent"): string {
  return `color-mix(in srgb, ${color} ${amount}%, ${withColor})`;
}

function contrastText(color: string, fallback: string): string {
  const match = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return fallback;
  const expanded = match[1].length === 3
    ? match[1].split("").map((part) => part + part).join("")
    : match[1];
  const channels = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.179 ? "#07130f" : "#ffffff";
}

/** Converts two brand colors into the calculator's semantic theme tokens. */
export function applyCalculatorBrandColors(
  theme: CalculatorTheme,
  brandColors?: CalculatorBrandColors,
): CalculatorTheme {
  if (!brandColors?.primary && !brandColors?.secondary) return theme;
  const nextTheme = { ...theme };

  if (brandColors.primary) {
    nextTheme.accent = brandColors.primary;
    nextTheme.accentHover = colorMix(brandColors.primary, 84, theme.background);
    nextTheme.accentText = contrastText(brandColors.primary, theme.accentText);
    nextTheme.accentSoft = colorMix(brandColors.primary, 12);
    nextTheme.accentBorder = colorMix(brandColors.primary, 44);
  }

  if (brandColors.secondary) {
    nextTheme.function = brandColors.secondary;
    nextTheme.functionSoft = colorMix(brandColors.secondary, 10);
    nextTheme.functionBorder = colorMix(brandColors.secondary, 38);
  }

  return nextTheme;
}

function getSystemTheme(): CalculatorResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeSystemTheme(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

export function useCalculatorResolvedTheme(mode: CalculatorThemeMode): CalculatorResolvedTheme {
  const systemTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    (): CalculatorResolvedTheme => "light",
  );

  return mode === "system" ? systemTheme : mode;
}

export function getCalculatorThemeStyle(theme: CalculatorTheme): CSSProperties {
  return {
    "--calculator-bg": theme.background,
    "--calculator-surface": theme.surface,
    "--calculator-surface-raised": theme.surfaceRaised,
    "--calculator-inset": theme.inset,
    "--calculator-display": theme.display,
    "--calculator-border": theme.border,
    "--calculator-border-strong": theme.borderStrong,
    "--calculator-text": theme.text,
    "--calculator-muted": theme.muted,
    "--calculator-faint": theme.faint,
    "--calculator-accent": theme.accent,
    "--calculator-accent-hover": theme.accentHover,
    "--calculator-accent-text": theme.accentText,
    "--calculator-accent-soft": theme.accentSoft,
    "--calculator-accent-border": theme.accentBorder,
    "--calculator-function": theme.function,
    "--calculator-function-soft": theme.functionSoft,
    "--calculator-function-border": theme.functionBorder,
    "--calculator-danger": theme.danger,
  } as CSSProperties;
}
