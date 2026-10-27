import { useMemo, useState } from "react";
import type { EvaluationContext } from "./engine";
import { parsePlotData, plotCsv, plotSvg, sampleExpression, type CalculatorPlot } from "./plot";

export function PlotPanel({ expression, getContext }: { expression: string; getContext: () => EvaluationContext }) {
  const [mode, setMode] = useState<"expression" | "data">("expression"), [formula, setFormula] = useState("x^2"), [lower, setLower] = useState("-10"), [upper, setUpper] = useState("10"), [data, setData] = useState("");
  const [plot, setPlot] = useState<CalculatorPlot | null>(null), [error, setError] = useState("");
  const svg = useMemo(() => plot ? plotSvg(plot) : "", [plot]);
  const download = (format: "svg" | "csv") => {
    if (!plot) return;
    try {
      const url = URL.createObjectURL(new Blob([format === "svg" ? svg : plotCsv(plot)], { type: format === "svg" ? "image/svg+xml;charset=utf-8" : "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `calculator-plot.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("The plot could not be downloaded."); }
  };
  return <details className="calculator-options calculator-plot"><summary>Plot expression or data</summary><p>Plots stay in this calculator. Downloads are local files; they are not inserted into a document or board.</p><div className="calculator-plot-actions"><button type="button" aria-pressed={mode === "expression"} onClick={() => setMode("expression")}>Expression</button><button type="button" aria-pressed={mode === "data"} onClick={() => setMode("data")}>Data points</button></div>
    {mode === "expression" ? <><label>Plot expression<input value={formula} maxLength={500} onChange={event => setFormula(event.target.value)} spellCheck={false} /></label><button type="button" onClick={() => setFormula(expression)}>Use calculator expression</button><div className="calculator-plot-bounds"><label>Plot lower x<input type="number" step="any" value={lower} onChange={event => setLower(event.target.value)} /></label><label>Plot upper x<input type="number" step="any" value={upper} onChange={event => setUpper(event.target.value)} /></label></div><small>Uses the current angle unit and named variables. Restore a Recent calculation to reuse its expression and variables.</small></> : <label>Data, one x,y pair per line<textarea rows={5} value={data} maxLength={32000} onChange={event => setData(event.target.value)} placeholder={"0,0\n1,2\n2,4"} /></label>}
    <button type="button" className="calculator-plot-run" onClick={() => { try { if (mode === "expression" && (!lower.trim() || !upper.trim())) throw new Error("Enter both plot bounds."); setPlot(mode === "expression" ? sampleExpression(formula, Number(lower), Number(upper), getContext()) : parsePlotData(data)); setError(""); } catch (error) { setPlot(null); setError(error instanceof Error ? error.message : "Could not plot these values."); } }}>Draw plot</button>
    {error && <p role="alert">{error}</p>}{plot && <figure><figcaption><strong>Last plotted: {plot.title}</strong><small>{plot.context}</small></figcaption><img src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)} alt={`Sampled plot of ${plot.title}. ${plot.points.length} points; ${plot.omitted} omitted. Values are available in the table below.`} /><p>Dots show samples, not a continuous curve. {plot.omitted} undefined or out-of-range samples omitted.</p><div className="calculator-plot-actions"><button type="button" onClick={() => download("svg")}>Download SVG</button><button type="button" onClick={() => download("csv")}>Download CSV</button><button type="button" onClick={() => setPlot(null)}>Clear plot</button></div><details><summary>Plot values ({plot.points.length})</summary><div className="calculator-plot-table" role="region" aria-label="Plot values" tabIndex={0}><table><thead><tr><th scope="col">x</th><th scope="col">y</th></tr></thead><tbody>{plot.points.map((point, index) => <tr key={index}><td>{point.x}</td><td>{point.y}</td></tr>)}</tbody></table></div></details></figure>}
  </details>;
}
