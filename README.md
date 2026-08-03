# @sunaissu/calculator

A safe expression and numerical-calculus engine with a reusable React calculator. It includes separate adapters for inserting results into Markdown documents and canvas applications.

## Install

```bash
npm install @sunaissu/calculator
```

For local development before publishing:

```bash
npm install ../calculator
```

## Playground

The Vite playground demonstrates standalone, document, and canvas targets while importing directly from `src`:

```bash
npm install
npm --prefix playground install
npm run playground
```

Use `npm run playground:build` for a production playground build.

Import the package stylesheet once from your application entry point:

```ts
import "@sunaissu/calculator/styles.css";
```

## Calculator app

`CalculatorApp` is the ready-to-use standalone experience. It includes the standard and engineering calculators, history, numerical calculus, and built-in Automatic / Light / Dark controls.

```tsx
import { CalculatorApp } from "@sunaissu/calculator";

export function App() {
  return <CalculatorApp defaultTheme="system" />;
}
```

Use `Calculator`, `DocumentCalculator`, or `CanvasCalculator` when embedding a smaller panel in another product.

## Themes and brand colors

Every calculator accepts `theme="light"`, `theme="dark"`, or `theme="system"` (the default). Use two brand colors to make either theme fit the host application:

```tsx
<CalculatorApp
  defaultTheme="system"
  brandColors={{ primary: "#8b5cf6", secondary: "#2563eb" }}
/>
```

The primary color drives results, active controls, and main actions. The secondary color drives engineering functions and supporting actions. Light/dark/system still controls all neutral surfaces and readable text colors.

Use `themeOverrides` only when individual semantic tokens need more precise control. `CALCULATOR_LIGHT_THEME`, `CALCULATOR_DARK_THEME`, and `applyCalculatorBrandColors` are exported for complete custom presets. Plain CSS variable overrides such as `--calculator-accent` are also supported.

## Document calculator

```tsx
import { DocumentCalculator } from "@sunaissu/calculator";

<DocumentCalculator
  insertOptions={{ includeExpression: true }}
  onInsert={(payload) => {
    // payload.text is the raw formatted result.
    // payload.markdown is a portable Markdown calculation block.
    editorRef.current?.appendBlock(payload.markdown);
  }}
/>
```

## Canvas calculator

```tsx
import { CanvasCalculator } from "@sunaissu/calculator";

<CanvasCalculator
  insertOptions={{ x: 120, y: 80 }}
  onInsert={(payload) => {
    canvas.addText({
      text: payload.text,
      x: payload.x,
      y: payload.y,
      width: payload.width,
      height: payload.height,
    });
  }}
/>
```

The canvas payload is renderer-neutral; it works with HTML canvas libraries, whiteboards, SVG editors, and custom scene graphs.

## Engine-only usage

```ts
import {
  differentiateExpression,
  evaluateExpression,
  integrateExpression,
} from "@sunaissu/calculator";

evaluateExpression("sin(30) + 5!", { angleUnit: "deg" }); // 120.5
integrateExpression("x^2", "0", "3"); // approximately 9
differentiateExpression("x^3", "2"); // approximately 12
```

Expressions are parsed without `eval`. Constants include `pi`, `e`, `tau`, and `phi`; supported functions include trigonometry, inverse and hyperbolic trigonometry, roots, logarithms, rounding, exponentials, absolute value, percentages, powers, factorials, variables, and implicit multiplication.
