import { evaluateExpression, type EvaluationContext } from "./engine";

export interface PlotPoint { x: number; y: number }
export interface CalculatorPlot { title: string; points: PlotPoint[]; omitted: number; context: string }
const coordinate = (value: number) => Number.isFinite(value) && Math.abs(value) <= 1e12;
export function sampleExpression(expression: string, lower: number, upper: number, context: EvaluationContext = {}, samples = 201): CalculatorPlot {
  if (!expression.trim() || expression.length > 500) throw new Error("Enter an expression of at most 500 characters.");
  if (![lower, upper].every(coordinate) || lower >= upper) throw new Error("Use increasing finite bounds between -1e12 and 1e12.");
  if (!Number.isInteger(samples) || samples < 2 || samples > 501) throw new Error("Use between 2 and 501 samples.");
  const points: PlotPoint[] = []; let omitted = 0;
  for (let index = 0; index < samples; index++) {
    const x = lower + (upper - lower) * index / (samples - 1);
    try { const y = evaluateExpression(expression, { ...context, variables: { ...context.variables, x } }); if (!coordinate(y)) throw new Error(); points.push({ x, y }); } catch { omitted++; }
  }
  if (!points.length) throw new Error("No finite samples could be plotted. Check the expression, variables and range.");
  const variables = Object.entries(context.variables ?? {}).filter(([name]) => name !== "x").map(([name, value]) => `${name}=${value}`).join(", ");
  return { title: expression, points, omitted, context: `${context.angleUnit ?? "rad"}; x from ${lower} to ${upper}; ${samples} samples${variables ? "; " + variables : ""}` };
}
export function parsePlotData(source: string): CalculatorPlot {
  if (source.length > 32000) throw new Error("Data must be at most 32,000 characters.");
  const lines = source.trim().split(/\r?\n/);
  if (!source.trim() || lines.length > 1000) throw new Error("Enter 1–1,000 rows of x,y numbers.");
  const number = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
  const points = lines.map((line, index) => {
    const values = line.split(",").map(value => value.trim());
    if (values.length !== 2 || !values.every(value => number.test(value) && coordinate(Number(value)))) throw new Error(`Row ${index + 1} needs two finite numbers between -1e12 and 1e12.`);
    return { x: Number(values[0]), y: Number(values[1]) };
  });
  return { title: "Measured data", points, omitted: 0, context: `${points.length} entered data points` };
}
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
export function plotSvg(plot: CalculatorPlot): string {
  if (!Number.isSafeInteger(plot.omitted) || plot.omitted < 0 || plot.omitted > 501) throw new Error("Invalid omitted sample count.");
  if (!plot.points.length || plot.points.length > 1000 || plot.points.some(point => !coordinate(point.x) || !coordinate(point.y))) throw new Error("Invalid plot points.");
  const xs = plot.points.map(point => point.x), ys = plot.points.map(point => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const x = (value: number) => 60 + (maxX === minX ? .5 : (value - minX) / (maxX - minX)) * 310;
  const y = (value: number) => 235 - (maxY === minY ? .5 : (value - minY) / (maxY - minY)) * 175;
  const label = (value: number) => Number(value.toPrecision(5)).toString();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-labelledby="plot-title plot-description"><title id="plot-title">${escape(plot.title.slice(0, 500))}</title><desc id="plot-description">${escape(plot.context.slice(0, 8000))}. ${plot.omitted} undefined or out-of-range samples omitted. Dots are samples, not a continuous curve. x ${minX} to ${maxX}; y ${minY} to ${maxY}.</desc><rect width="400" height="300" fill="white"/><path d="M60 55V235H375" fill="none" stroke="#475569"/><text x="200" y="28" text-anchor="middle" font-family="sans-serif" font-size="16">${escape(plot.title.slice(0, 60))}</text><text x="60" y="258" font-family="sans-serif" font-size="14">${label(minX)}</text><text x="375" y="258" text-anchor="end" font-family="sans-serif" font-size="14">${label(maxX)}</text><text x="50" y="65" text-anchor="end" font-family="sans-serif" font-size="12">${label(maxY)}</text><text x="50" y="235" text-anchor="end" font-family="sans-serif" font-size="12">${label(minY)}</text><text x="200" y="285" text-anchor="middle" font-family="sans-serif" font-size="14">x</text><text x="15" y="155" font-family="sans-serif" font-size="14">y</text>${plot.points.map(point => `<circle cx="${x(point.x).toFixed(3)}" cy="${y(point.y).toFixed(3)}" r="2.5" fill="#155e75"/>`).join("")}</svg>`;
}
export const plotCsv = (plot: CalculatorPlot) => { plotSvg(plot); return "x,y\n" + plot.points.map(point => `${point.x},${point.y}`).join("\n") + "\n"; };
