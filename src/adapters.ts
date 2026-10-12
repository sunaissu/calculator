import type { EvaluationContext, ResultFormat } from "./engine";

export type CalculationKind = "expression" | "integral" | "derivative" | "root";

export interface CalculationResult {
  kind: CalculationKind;
  expression: string;
  displayExpression: string;
  numericValue: number;
  value: string;
  /** Inputs needed to reopen this calculation in a host application. */
  context?: EvaluationContext & { format?: ResultFormat; lowerBound?: string; upperBound?: string; point?: string; tolerance?: number };
  diagnostics?: { residual: number; iterations: number };
}

export interface DocumentCalculationInsert extends CalculationResult {
  target: "document";
  /** Plain result, useful for inserting at a text selection. */
  text: string;
  /** A portable Markdown equation block, useful when appending. */
  markdown: string;
}

export interface CanvasCalculationInsert extends CalculationResult {
  target: "canvas";
  /** Human-readable equation ready for a canvas text element. */
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentInsertOptions {
  label?: string;
  includeExpression?: boolean;
}

export interface CanvasInsertOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  includeExpression?: boolean;
}

const markdownText = (value: string) => value.replace(/\r\n?|\n/g, " ").replace(/([\\\x60*_[\]<>~#+.!|{}()&-])/g, "\\$1");

export function createDocumentCalculationInsert(
  result: CalculationResult,
  options: DocumentInsertOptions = {},
): DocumentCalculationInsert {
  const label = options.label ?? "Calculation";
  const equation = options.includeExpression
    ? `${result.displayExpression} = ${result.value}`
    : result.value;
  return {
    ...result,
    target: "document",
    text: result.value,
    markdown: `**${markdownText(label)}:** ${markdownText(equation)}`,
  };
}

export function createCanvasCalculationInsert(
  result: CalculationResult,
  options: CanvasInsertOptions = {},
): CanvasCalculationInsert {
  return {
    ...result,
    target: "canvas",
    text: options.includeExpression === false
      ? result.value
      : `${result.displayExpression} = ${result.value}`,
    x: options.x ?? 80,
    y: options.y ?? 80,
    width: options.width ?? 220,
    height: options.height ?? 36,
  };
}
