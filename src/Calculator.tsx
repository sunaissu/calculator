import React, { useId, useMemo, useState } from "react";
import {
  type AngleUnit,
  type ResultFormat,
  evaluateVariables,
  type EvaluationContext,
  differentiateExpression,
  evaluateExpression,
  formatCalculatorResult,
  integrateExpression,
  solveEquation,
} from "./engine";
import {
  type CalculationKind,
  type CalculationResult,
  type CanvasCalculationInsert,
  type CanvasInsertOptions,
  type DocumentCalculationInsert,
  type DocumentInsertOptions,
  createCanvasCalculationInsert,
  createDocumentCalculationInsert,
} from "./adapters";
import {
  CALCULATOR_DARK_THEME,
  CALCULATOR_LIGHT_THEME,
  applyCalculatorBrandColors,
  getCalculatorThemeStyle,
  useCalculatorResolvedTheme,
  type CalculatorTheme,
  type CalculatorBrandColors,
  type CalculatorThemeMode,
} from "./theme";

type CalculatorMode = "standard" | "engineering";
type CalculusOperation = "integral" | "derivative" | "root";

interface HistoryItem extends CalculationResult {
  input?: string;
  variableSource: string;
  previousAnswer: number | null;
}

interface CalculatorKey {
  label: string;
  value: string;
  kind?: "operator" | "function" | "utility";
  ariaLabel?: string;
}

interface CommonCalculatorProps {
  readOnly?: boolean;
  className?: string;
  defaultMode?: CalculatorMode;
  defaultAngleUnit?: AngleUnit;
  maxHistory?: number;
  defaultVariables?: string;
  defaultFormat?: ResultFormat;
  title?: string;
  /** Light, dark, or the user's operating-system preference. */
  theme?: CalculatorThemeMode;
  /** Initial theme when `theme` is not controlled. */
  defaultTheme?: CalculatorThemeMode;
  /** Override any semantic color token without replacing the active theme. */
  themeOverrides?: Partial<CalculatorTheme>;
  /** Primary drives actions/results; secondary drives functions and supporting accents. */
  brandColors?: CalculatorBrandColors;
  onThemeChange?: (theme: CalculatorThemeMode) => void;
  showThemeSwitcher?: boolean;
  appearance?: "panel" | "app";
  style?: React.CSSProperties;
}

export interface StandaloneCalculatorProps extends CommonCalculatorProps {
  target?: "standalone";
  onResult?: (result: CalculationResult) => void;
}

export interface DocumentCalculatorProps extends CommonCalculatorProps {
  target: "document";
  onInsert?: (payload: DocumentCalculationInsert) => void;
  insertOptions?: DocumentInsertOptions;
  onResult?: (result: CalculationResult) => void;
}

export interface CanvasCalculatorProps extends CommonCalculatorProps {
  target: "canvas";
  onInsert?: (payload: CanvasCalculationInsert) => void;
  insertOptions?: CanvasInsertOptions;
  onResult?: (result: CalculationResult) => void;
}

export type CalculatorProps =
  | StandaloneCalculatorProps
  | DocumentCalculatorProps
  | CanvasCalculatorProps;

export type CalculatorAppProps = Omit<StandaloneCalculatorProps, "target" | "appearance">;

const standardKeys: CalculatorKey[] = [
  { label: "AC", value: "clear", kind: "utility", ariaLabel: "Clear" },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
  { label: "⌫", value: "backspace", kind: "utility", ariaLabel: "Backspace" },
  { label: "7", value: "7" }, { label: "8", value: "8" }, { label: "9", value: "9" },
  { label: "÷", value: "/", kind: "operator", ariaLabel: "Divide" },
  { label: "4", value: "4" }, { label: "5", value: "5" }, { label: "6", value: "6" },
  { label: "×", value: "*", kind: "operator", ariaLabel: "Multiply" },
  { label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" },
  { label: "−", value: "-", kind: "operator", ariaLabel: "Subtract" },
  { label: "0", value: "0" }, { label: ".", value: ".", ariaLabel: "Decimal point" },
  { label: "%", value: "%", ariaLabel: "Percent" },
  { label: "+", value: "+", kind: "operator", ariaLabel: "Add" },
];

const engineeringKeys: CalculatorKey[] = [
  { label: "sin", value: "sin(", kind: "function" },
  { label: "cos", value: "cos(", kind: "function" },
  { label: "tan", value: "tan(", kind: "function" },
  { label: "π", value: "pi", kind: "function", ariaLabel: "Pi" },
  { label: "sin⁻¹", value: "asin(", kind: "function", ariaLabel: "Arc sine" },
  { label: "cos⁻¹", value: "acos(", kind: "function", ariaLabel: "Arc cosine" },
  { label: "tan⁻¹", value: "atan(", kind: "function", ariaLabel: "Arc tangent" },
  { label: "e", value: "e", kind: "function", ariaLabel: "Euler's number" },
  { label: "ln", value: "ln(", kind: "function" },
  { label: "log", value: "log(", kind: "function", ariaLabel: "Base ten logarithm" },
  { label: "√", value: "sqrt(", kind: "function", ariaLabel: "Square root" },
  { label: "∛", value: "cbrt(", kind: "function", ariaLabel: "Cube root" },
  { label: "x²", value: "^2", kind: "function", ariaLabel: "Square" },
  { label: "xʸ", value: "^", kind: "function", ariaLabel: "Power" },
  { label: "exp", value: "exp(", kind: "function" },
  { label: "|x|", value: "abs(", kind: "function", ariaLabel: "Absolute value" },
  { label: "sinh", value: "sinh(", kind: "function" },
  { label: "cosh", value: "cosh(", kind: "function" },
  { label: "tanh", value: "tanh(", kind: "function" },
  { label: "n!", value: "!", kind: "function", ariaLabel: "Factorial" },
  { label: "floor", value: "floor(", kind: "function" },
  { label: "ceil", value: "ceil(", kind: "function" },
  { label: "round", value: "round(", kind: "function" },
  { label: "Ans", value: "ans", kind: "function", ariaLabel: "Previous answer" },
];

const removableTokens = [
  "asin(", "acos(", "atan(", "sqrt(", "cbrt(", "sinh(", "cosh(", "tanh(",
  "floor(", "round(", "ceil(", "sin(", "cos(", "tan(", "abs(", "exp(",
  "log(", "ln(", "ans", "pi",
];

function removeLastEntry(expression: string): string {
  const token = removableTokens.find((candidate) => expression.endsWith(candidate));
  return token ? expression.slice(0, -token.length) : expression.slice(0, -1);
}

function normalizeDisplayExpression(expression: string): string {
  return expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/gi, "pi");
}

function formatDisplayExpression(expression: string): string {
  return expression.replace(/\*/g, "×").replace(/\//g, "÷");
}

export const Calculator: React.FC<CalculatorProps> = (props) => {
  const {
    readOnly = false,
    className = "",
    defaultMode = "standard",
    defaultAngleUnit = "rad",
    maxHistory = 6,
    title = "Calculator",
    defaultTheme = "system",
    themeOverrides,
    brandColors,
    onThemeChange,
    showThemeSwitcher = false,
    appearance = "panel",
    style,
  } = props;
  const target = props.target ?? "standalone";
  const [internalTheme, setInternalTheme] = useState<CalculatorThemeMode>(defaultTheme);
  const themeMode = props.theme ?? internalTheme;
  const resolvedThemeMode = useCalculatorResolvedTheme(themeMode);
  const themeTokens = useMemo(
    () => ({
      ...applyCalculatorBrandColors(
        resolvedThemeMode === "dark" ? CALCULATOR_DARK_THEME : CALCULATOR_LIGHT_THEME,
        brandColors,
      ),
      ...themeOverrides,
    }),
    [brandColors, resolvedThemeMode, themeOverrides],
  );
  const calculusHeadingId = useId();
  const [variableSource, setVariableSource] = useState(props.defaultVariables ?? "");
  const [resultFormat, setResultFormat] = useState<ResultFormat>(props.defaultFormat ?? {});
  const [memory, setMemory] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [mode, setMode] = useState<CalculatorMode>(defaultMode);
  const [angleUnit, setAngleUnit] = useState<AngleUnit>(defaultAngleUnit);
  const [expression, setExpression] = useState("");
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [calculusOperation, setCalculusOperation] = useState<CalculusOperation>("integral");
  const [functionExpression, setFunctionExpression] = useState("sin(x)");
  const [lowerBound, setLowerBound] = useState("0");
  const [upperBound, setUpperBound] = useState("pi");
  const [derivativePoint, setDerivativePoint] = useState("0");
  const [solverTolerance, setSolverTolerance] = useState("0.00000001");
  const [calculusSummary, setCalculusSummary] = useState("");

  const formattedExpression = useMemo(() => formatDisplayExpression(expression), [expression]);
  const evaluationContext = (): EvaluationContext => ({ angleUnit, variables: evaluateVariables(variableSource, { angleUnit, variables: answer === null ? {} : { ans: answer } }) });
  const displayedResult = currentResult ? formatCalculatorResult(currentResult.numericValue, resultFormat) : "0";
  const copyResult = async (full: boolean) => {
    if (!currentResult) return;
    try {
      await navigator.clipboard.writeText(full ? currentResult.displayExpression + " = " + displayedResult : displayedResult);
      setCopyStatus("Copied");
    } catch { setCopyStatus("Copy unavailable. Select the result to copy it."); }
  };
  const updateMemory = (sign: number) => {
    try {
      const next = (memory ?? 0) + sign * (currentResult?.numericValue ?? evaluateExpression(expression, evaluationContext()));
      if (!Number.isFinite(next)) throw new Error("Memory result is not finite");
      setMemory(next); setError("");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to store memory"); }
  };

  const clearPendingResult = () => {
    setCurrentResult(null);
    setError("");
    setCalculusSummary("");
    setCopyStatus("");
  };

  const recordResult = (
    numericValue: number,
    resultExpression: string,
    displayExpression: string,
    kind: CalculationKind,
    input?: string,
    diagnostics?: CalculationResult["diagnostics"],
  ) => {
    const result: CalculationResult = {
      kind,
      expression: resultExpression,
      displayExpression,
      numericValue,
      value: formatCalculatorResult(numericValue, resultFormat),
      context: { ...evaluationContext(), format: resultFormat, ...(kind === "integral" || kind === "root" ? { lowerBound, upperBound } : kind === "derivative" ? { point: derivativePoint } : {}), ...(kind === "root" ? { tolerance: Number(solverTolerance) } : {}) },
      ...(diagnostics ? { diagnostics } : {}),
    };
    setCurrentResult(result);
    setAnswer(numericValue);
    setError("");
    setHistory((previous) => [
      { ...result, input, variableSource, previousAnswer: answer },
      ...previous.filter(
        (item) => item.displayExpression !== result.displayExpression || item.value !== result.value,
      ),
    ].slice(0, Math.max(0, Math.min(1000, Math.floor(maxHistory) || 0))));
    props.onResult?.(result);
    return result;
  };

  const restoreHistory = (item: HistoryItem) => {
    setVariableSource(item.variableSource);
    setAnswer(item.previousAnswer);
    setAngleUnit(item.context?.angleUnit ?? "rad");
    setResultFormat(item.context?.format ?? {});
    setCurrentResult(item);
    setError("");
    setCopyStatus("");
    if (item.kind === "expression") {
      setExpression(item.input ?? item.expression);
      setCalculusSummary("");
    } else {
      setMode("engineering");
      setCalculusOperation(item.kind);
      setFunctionExpression(item.expression);
      setLowerBound(item.context?.lowerBound ?? "0");
      setUpperBound(item.context?.upperBound ?? "pi");
      setDerivativePoint(item.context?.point ?? "0");
      setSolverTolerance(String(item.context?.tolerance ?? 1e-8));
      setCalculusSummary(item.displayExpression + " = " + item.value);
    }
  };

  const calculate = () => {
    try {
      recordResult(
        evaluateExpression(expression, evaluationContext()),
        expression,
        formattedExpression,
        "expression",
        expression,
      );
      setCalculusSummary("");
    } catch (calculationError) {
      setCurrentResult(null);
      setError(calculationError instanceof Error ? calculationError.message : "Invalid expression");
    }
  };

  const calculateCalculus = () => {
    try {
      if (!functionExpression.trim()) throw new Error("Enter a function of x");
      if (calculusOperation === "root") {
        const solution = solveEquation(functionExpression, lowerBound, upperBound, evaluationContext(), { tolerance: Number(solverTolerance) });
        const display = `Root of ${functionExpression} = 0 in [${lowerBound}, ${upperBound}]`;
        const result = recordResult(solution.value, functionExpression, display, "root", undefined, { residual: solution.residual, iterations: solution.iterations });
        setCalculusSummary(`${display}: ${result.value}`);
      } else if (calculusOperation === "integral") {
        const display = `∫[${lowerBound}, ${upperBound}] ${functionExpression} dx`;
        const result = recordResult(
          integrateExpression(functionExpression, lowerBound, upperBound, evaluationContext()),
          functionExpression,
          display,
          "integral",
        );
        setCalculusSummary(`${display} = ${result.value}`);
      } else {
        const display = `d/dx ${functionExpression} at x=${derivativePoint}`;
        const result = recordResult(
          differentiateExpression(functionExpression, derivativePoint, evaluationContext()),
          functionExpression,
          display,
          "derivative",
        );
        setCalculusSummary(`${display} = ${result.value}`);
      }
    } catch (calculationError) {
      setCurrentResult(null);
      setCalculusSummary("");
      setError(
        calculationError instanceof Error
          ? calculationError.message
          : "Unable to evaluate calculus operation",
      );
    }
  };

  const press = (value: string) => {
    if (value === "clear") {
      setExpression("");
      setCurrentResult(null);
      setError("");
      setCalculusSummary("");
    } else if (value === "backspace") {
      setExpression((previous) => removeLastEntry(previous));
      clearPendingResult();
    } else {
      setExpression((previous) => previous + value);
      clearPendingResult();
    }
  };

  const insertResult = () => {
    if (!currentResult || readOnly) return;
    const formattedResult = { ...currentResult, value: displayedResult, context: { ...currentResult.context, format: resultFormat } };
    if (target === "document") {
      const documentProps = props as DocumentCalculatorProps;
      documentProps.onInsert?.(
        createDocumentCalculationInsert(formattedResult, documentProps.insertOptions),
      );
    } else if (target === "canvas") {
      const canvasProps = props as CanvasCalculatorProps;
      canvasProps.onInsert?.(
        createCanvasCalculationInsert(formattedResult, canvasProps.insertOptions),
      );
    }
  };

  const canInsert =
    !readOnly &&
    Boolean(currentResult) &&
    ((target === "document" && Boolean((props as DocumentCalculatorProps).onInsert)) ||
      (target === "canvas" && Boolean((props as CanvasCalculatorProps).onInsert)));
  const insertLabel = target === "canvas" ? "Add result to canvas" : "Insert result into document";

  const selectTheme = (nextTheme: CalculatorThemeMode) => {
    if (props.theme === undefined) setInternalTheme(nextTheme);
    onThemeChange?.(nextTheme);
  };

  const renderKey = (key: CalculatorKey) => (
    <button
      key={`${key.label}-${key.value}`}
      type="button"
      className={`calculator-key${key.kind ? ` is-${key.kind}` : ""}${
        key.value === "backspace" ? " is-backspace" : ""
      }${key.value === "clear" ? " is-clear" : ""}`}
      onClick={() => press(key.value)}
      aria-label={key.ariaLabel ?? key.label}
      title={key.ariaLabel}
    >
      {key.label}
    </button>
  );

  return (
    <section
      className={`calculator-panel sunaissu-calculator-panel target-${target} appearance-${appearance} ${className}`.trim()}
      aria-label={title}
      data-theme={resolvedThemeMode}
      data-theme-mode={themeMode}
      style={{ ...getCalculatorThemeStyle(themeTokens), ...style }}
    >
      <div className="sunaissu-calculator-heading">
        <div className="sunaissu-calculator-heading-copy">
          <div className="sunaissu-calculator-icon" aria-hidden="true">±</div>
          <div><strong>{title}</strong><span>{mode === "standard" ? "Fast everyday calculations." : "Engineering functions and numerical calculus."}</span></div>
        </div>
        {showThemeSwitcher && (
          <div className="calculator-theme-switch" aria-label="Color theme">
            {(["system", "light", "dark"] as CalculatorThemeMode[]).map((candidate) => (
              <button
                type="button"
                key={candidate}
                className={themeMode === candidate ? "is-active" : ""}
                onClick={() => selectTheme(candidate)}
                aria-pressed={themeMode === candidate}
                title={candidate === "system" ? "Follow system theme" : `Use ${candidate} theme`}
              >
                {candidate === "system" ? "Auto" : candidate === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="calculator-mode-switch" aria-label="Calculator mode">
        <button type="button" className={mode === "standard" ? "is-active" : ""} onClick={() => setMode("standard")} aria-pressed={mode === "standard"}>Standard</button>
        <button type="button" className={mode === "engineering" ? "is-active" : ""} onClick={() => setMode("engineering")} aria-pressed={mode === "engineering"}>Engineering</button>
      </div>

      {mode === "engineering" && (
        <div className="calculator-angle-control">
          <span>Angle unit</span>
          <div>{(["rad", "deg"] as AngleUnit[]).map((unit) => <button type="button" key={unit} className={angleUnit === unit ? "is-active" : ""} onClick={() => { setAngleUnit(unit); clearPendingResult(); }} aria-pressed={angleUnit === unit}>{unit.toUpperCase()}</button>)}</div>
        </div>
      )}

      <div className="calculator-display">
        <input value={formattedExpression} onChange={(event) => { setExpression(normalizeDisplayExpression(event.target.value)); clearPendingResult(); }} onKeyDown={(event) => { if (event.key === "Enter") calculate(); }} aria-label="Calculation expression" spellCheck={false} />
        <output className={error ? "calculator-result is-error" : "calculator-result"}>{error || displayedResult}</output>
      </div>

      <div className="calculator-utility-row" aria-label="Memory and clipboard">
        <button type="button" onClick={() => setMemory(null)} disabled={memory === null} title="Clear memory">MC</button>
        <button type="button" onClick={() => { setExpression(String(memory)); clearPendingResult(); }} disabled={memory === null} title="Recall memory">MR</button>
        <button type="button" onClick={() => updateMemory(1)} title="Add to memory">M+</button>
        <button type="button" onClick={() => updateMemory(-1)} title="Subtract from memory">M−</button>
        <button type="button" disabled={!currentResult} onClick={() => void copyResult(false)}>Copy result</button>
        <button type="button" disabled={!currentResult} onClick={() => void copyResult(true)}>Copy equation</button>
      </div>
      {copyStatus && <small role="status">{copyStatus}</small>}
      <details className="calculator-options">
        <summary>Variables & display{memory !== null ? " · Memory stored" : ""}</summary>
        <label>Named variables<textarea rows={3} value={variableSource} placeholder={"length = 12\nwidth = length / 2"} onChange={event => { setVariableSource(event.target.value); clearPendingResult(); }} /></label>
        <small>One name = expression per line. Later rows can use earlier variables.</small>
        <div className="calculator-format-row">
          <label>Notation<select value={resultFormat.notation ?? "auto"} onChange={event => setResultFormat({ ...resultFormat, notation: event.target.value as ResultFormat["notation"], precision: event.target.value === "significant" ? Math.max(1, resultFormat.precision ?? 6) : resultFormat.precision })}>
            {(["auto", "fixed", "scientific", "engineering", "significant"] as const).map(value => <option key={value}>{value}</option>)}
          </select></label>
          <label>{resultFormat.notation === "significant" ? "Significant figures" : "Decimal places"}<input type="number" disabled={!resultFormat.notation || resultFormat.notation === "auto"} min={resultFormat.notation === "significant" ? 1 : 0} max={12} value={resultFormat.precision ?? 6} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= (resultFormat.notation === "significant" ? 1 : 0) && value <= 12) setResultFormat({ ...resultFormat, precision: value }); }} /></label>
        </div>
      </details>

      {mode === "engineering" && <div className="calculator-engineering-keys" aria-label="Engineering functions">{engineeringKeys.map(renderKey)}</div>}
      <div className="calculator-keypad">{standardKeys.map(renderKey)}<button type="button" className="calculator-equals" onClick={calculate}>=</button></div>

      {mode === "engineering" && (
        <section className="calculus-lab" aria-labelledby={calculusHeadingId}>
          <div className="calculus-heading"><div><strong id={calculusHeadingId}>Numerical tools</strong><span>Use <code>x</code> as the independent variable.</span></div><span className="calculus-method">Approx.</span></div>
          <div className="calculus-operation-switch"><button type="button" className={calculusOperation === "integral" ? "is-active" : ""} onClick={() => { setCalculusOperation("integral"); clearPendingResult(); }}>∫ Integral</button><button type="button" className={calculusOperation === "derivative" ? "is-active" : ""} onClick={() => { setCalculusOperation("derivative"); clearPendingResult(); }}>d/dx Derivative</button><button type="button" className={calculusOperation === "root" ? "is-active" : ""} onClick={() => { setCalculusOperation("root"); clearPendingResult(); }}>Solve f(x) = 0</button></div>
          <label className="calculus-field"><span>f(x)</span><input value={functionExpression} onChange={(event) => { setFunctionExpression(event.target.value); clearPendingResult(); }} placeholder="e.g. x^2 + sin(x)" spellCheck={false} /></label>
          {calculusOperation !== "derivative" ? (
            <div className="calculus-bound-grid"><label className="calculus-field"><span>Lower bound</span><input value={lowerBound} onChange={(event) => { setLowerBound(event.target.value); clearPendingResult(); }} spellCheck={false} /></label><label className="calculus-field"><span>Upper bound</span><input value={upperBound} onChange={(event) => { setUpperBound(event.target.value); clearPendingResult(); }} spellCheck={false} /></label></div>
          ) : <label className="calculus-field"><span>Evaluate at x</span><input value={derivativePoint} onChange={(event) => { setDerivativePoint(event.target.value); clearPendingResult(); }} spellCheck={false} /></label>}
          {calculusOperation === "root" && <label className="calculus-field"><span>Residual tolerance</span><input type="number" min="0" max="1" step="any" value={solverTolerance} onChange={event => { setSolverTolerance(event.target.value); clearPendingResult(); }} /><small>Finds one root of a continuous function between sign-changing bounds.</small></label>}
          <button type="button" className="calculus-run" onClick={calculateCalculus}>{calculusOperation === "root" ? "Solve equation" : calculusOperation === "integral" ? "Evaluate definite integral" : "Evaluate derivative"}</button>
          {calculusSummary && currentResult && <output className="calculus-summary">{currentResult.displayExpression} = {displayedResult}</output>}
        </section>
      )}

      {currentResult?.diagnostics && <small role="status">Residual: {currentResult.diagnostics.residual.toExponential(2)} · {currentResult.diagnostics.iterations} iterations</small>}
      {target !== "standalone" && <button type="button" className="calculator-insert" onClick={insertResult} disabled={!canInsert}>↳ {insertLabel}</button>}

      {history.length > 0 && (
        <div className="calculator-history">
          <div className="calculator-history-header"><div className="calculator-history-label">↺ Recent</div><button type="button" className="calculator-history-clear" onClick={() => setHistory([])}>Clear</button></div>
          {history.map((item, index) => <button type="button" key={`${item.displayExpression}-${item.value}-${index}`} onClick={() => restoreHistory(item)} title={item.displayExpression}><span>{item.displayExpression}</span><strong>{item.value}</strong></button>)}
        </div>
      )}
    </section>
  );
};

export const DocumentCalculator: React.FC<Omit<DocumentCalculatorProps, "target">> = (props) => (
  <Calculator {...props} target="document" />
);

export const CanvasCalculator: React.FC<Omit<CanvasCalculatorProps, "target">> = (props) => (
  <Calculator {...props} target="canvas" />
);

/** A standalone, app-style calculator with built-in light/dark/system controls. */
export const CalculatorApp: React.FC<CalculatorAppProps> = (props) => (
  <Calculator {...props} target="standalone" appearance="app" showThemeSwitcher={props.showThemeSwitcher ?? true} />
);

export default Calculator;
