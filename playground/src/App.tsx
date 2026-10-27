import sunaissuMark from "../../assets/brand/sunaissu-light.svg";
import bgMark from "../../assets/brand/bg-light.svg";
import { useState } from "react";
import {
  CalculatorApp,
  getCalculatorScrollbarProps,
  type CalculatorScrollbarOptions,
  type CalculatorBrandColors,
} from "@sunaissu/calculator";

const schemes: Record<string, CalculatorBrandColors | undefined> = {
  default: undefined,
  ocean: { primary: "#2563eb", secondary: "#06b6d4" },
  forest: { primary: "#15803d", secondary: "#ca8a04" },
  plum: { primary: "#9333ea", secondary: "#db2777" },
};

export default function App() {
  const [scrollbarPreset, setScrollbarPreset] = useState<"native" | "custom" | "hidden">("native");
  const [thumbColor, setThumbColor] = useState("#0f9f76");
  const [trackColor, setTrackColor] = useState("#edf2f7");
  const [transparentTrack, setTransparentTrack] = useState(true);
  const [scheme, setScheme] = useState("default");
  const [primary, setPrimary] = useState("#0f9f76");
  const [secondary, setSecondary] = useState("#0284c7");
  const brandColors = scheme === "custom" ? { primary, secondary } : schemes[scheme];
  const scrollbar: CalculatorScrollbarOptions | undefined = scrollbarPreset === "hidden"
    ? { width: "none" }
    : scrollbarPreset === "custom"
      ? { thumbColor, trackColor: transparentTrack ? "transparent" : trackColor }
      : undefined;
  const scrollbarProps = getCalculatorScrollbarProps(scrollbar);

  return (
    <div
      {...scrollbarProps}
      className={`calculator-playground-scroll ${scrollbarProps.className}`}
      role="region"
      aria-label="Calculator playground"
      tabIndex={0}
    >
      <main className="calculator-playground">
        <header className="playground-heading">
          <span>@sunaissu/calculator</span>
          <h1>Calculator</h1>
          <p>A focused playground for the standalone calculator app.</p>
        </header>

        <details className="playground-scrollbar-settings">
          <summary>Appearance</summary>
          <div className="playground-scrollbar-controls">
            <label>
              <span>Color scheme</span>
              <select value={scheme} onChange={event => setScheme(event.target.value)}>
                <option value="default">Default</option>
                <option value="ocean">Ocean</option>
                <option value="forest">Forest</option>
                <option value="plum">Plum</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {scheme === "custom" && <>
              <label><span>Primary color</span><input type="color" value={primary} onChange={event => setPrimary(event.target.value)} /></label>
              <label><span>Secondary color</span><input type="color" value={secondary} onChange={event => setSecondary(event.target.value)} /></label>
            </>}
            <label>
              <span>Scrollbar</span>
              <select value={scrollbarPreset} onChange={(event) => setScrollbarPreset(event.target.value as typeof scrollbarPreset)}>
                <option value="native">Native</option>
                <option value="custom">Custom colors</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
            {scrollbarPreset === "custom" && (
              <>
                <label>
                  <span>Thumb color</span>
                  <input type="color" value={thumbColor} onChange={(event) => setThumbColor(event.target.value)} />
                </label>
                <label>
                  <span>Track color</span>
                  <input type="color" value={trackColor} disabled={transparentTrack} onChange={(event) => setTrackColor(event.target.value)} />
                </label>
                <label className="playground-scrollbar-checkbox">
                  <input type="checkbox" checked={transparentTrack} onChange={(event) => setTransparentTrack(event.target.checked)} />
                  <span>Transparent track</span>
                </label>
              </>
            )}
          </div>
        </details>

        <CalculatorApp defaultTheme="system" brandColors={brandColors} scrollbar={scrollbar} />
      <footer className="maker-credit"><span>Made by</span><img className="maker-wordmark" src={sunaissuMark} alt="Sunaissu" width="81" height="26" /><img className="maker-monogram" src={bgMark} alt="bg_" width="26" height="13" /></footer>
      </main>
    </div>
  );
}
