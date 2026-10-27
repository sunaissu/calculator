export {
  differentiateExpression,
  evaluateExpression,
  evaluateVariables,
  inspectVariables,
  formatCalculatorResult,
  integrateExpression,
  solveEquation,
} from "./engine";
export type { AngleUnit, EvaluationContext, ResultFormat, EquationSolverOptions, EquationSolution } from "./engine";
export type { VariableDiagnostic } from "./engine";

export {
  createCanvasCalculationInsert,
  createDocumentCalculationInsert,
} from "./adapters";
export type {
  CalculationKind,
  CalculationResult,
  CanvasCalculationInsert,
  CanvasInsertOptions,
  DocumentCalculationInsert,
  DocumentInsertOptions,
} from "./adapters";

export { Calculator, CalculatorApp, CanvasCalculator, DocumentCalculator } from "./Calculator";
export type {
  CalculatorAppProps,
  CalculatorProps,
  CanvasCalculatorProps,
  DocumentCalculatorProps,
  StandaloneCalculatorProps,
} from "./Calculator";

export {
  CALCULATOR_DARK_THEME,
  CALCULATOR_LIGHT_THEME,
  applyCalculatorBrandColors,
  getCalculatorThemeStyle,
  useCalculatorResolvedTheme,
} from "./theme";
export type {
  CalculatorBrandColors,
  CalculatorResolvedTheme,
  CalculatorTheme,
  CalculatorThemeMode,
} from "./theme";

export { Calculator as default } from "./Calculator";

export { sampleExpression, parsePlotData, plotSvg, plotCsv } from "./plot";
export type { PlotPoint, CalculatorPlot } from "./plot";
