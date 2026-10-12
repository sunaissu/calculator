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

## Equation solving

Engineering mode includes **Solve f(x) = 0** under Numerical tools. Enter an expression, lower and upper bounds, and an absolute residual tolerance. Results show the residual and iteration count; history restores the solver inputs.

```ts
import { solveEquation } from "@sunaissu/calculator";

const solution = solveEquation("x^2 - target", "0", "2", {
  variables: { target: 2 },
}, { tolerance: 1e-8, maxIterations: 100 });
// solution: { value: approximately 1.41421356, residual, iterations }
```

The solver uses bounded bisection for real, continuous functions. Bounds must increase and bracket a sign change, unless an endpoint already meets the tolerance. It returns one root; it does not enumerate roots or find even-multiplicity roots without a sign change. Success means `abs(f(x)) <= tolerance`, not a bound on x error or proof of continuity. Invalid values, missing brackets, and exhausted iteration limits throw. Defaults are 1e-8 and 100 iterations; supported limits are tolerance greater than zero up to 1, and 1–1000 iterations.

Host result handlers should handle the new `CalculationKind` value `"root"`. Its payload includes `context.lowerBound`, `context.upperBound` and `context.tolerance` and `diagnostics` with residual and iterations.

## Variables, formatting, and memory

Expand **Variables & display** to enter up to 50 variables as `name = expression`, one per line. Names may include digits and underscores after the first letter. Later rows can reference earlier rows. Built-in function names, constants, `mod`, and `ans` are reserved.

`defaultVariables` seeds that panel. `defaultFormat={{ notation: "engineering", precision: 3 }}` seeds result formatting. Supported notations are `auto`, `fixed`, `scientific`, `engineering`, and `significant`. Fixed, scientific and engineering precision uses 0 to 12 decimal places; significant precision uses 1 to 12 significant figures. For example, `formatCalculatorResult(12, { notation: "significant", precision: 4 })` returns `"12.00"`. Formatting changes display, not the stored numeric answer.

The calculator includes MC, MR, M+, M−, copy-result, and copy-equation controls. Memory and history last for the mounted session. Selecting history restores the original variables, captured Ans, angle mode, format and calculus inputs so pressing Evaluate reproduces that calculation. Changing a variable still requires evaluation; automatic dependent recalculation remains planned. Result payloads include evaluation context and calculus inputs so hosts can retain how a result was produced; reopening and recalculation remain host responsibilities.

Engine-only consumers can call `evaluateVariables(source, context)` and `formatCalculatorResult(value, options)`. Invalid intermediate results, including division by zero or a square root outside the real domain, throw even if a later operation would hide them. Derivatives also reject a function that is undefined at the requested point. Calculus still uses numerical approximations and does not report an error bound or prove convergence.

See [the implementation review](./implementation-review.txt) for measured results and [the feature backlog](./feature-backlog.txt) for all 27 feature contracts, dependencies and acceptance checks. OPEN and PARTIAL items are not implemented.

## Development checks

Run `npm test`, `npm run playground:build`, and `npm pack --dry-run --json` before release. The GitHub Actions workflow is configured to test the package on Node 18, 22 and 24, build the playground on Node 22/24, and audit both dependency trees. Browser checks remain a separate local step documented in the implementation review. The workflow has not been run on GitHub as part of this local review.

## Review safeguards

Document insertion escapes Markdown in labels and displayed equations, so underscores, multiplication signs written as asterisks, and brackets remain literal. The plain-text result is unchanged. The root solver returns immediately when the lower endpoint meets the residual tolerance; it does not evaluate the other endpoint in that case.
