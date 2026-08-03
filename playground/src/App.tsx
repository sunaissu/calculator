import { CalculatorApp } from "@sunaissu/calculator";

export default function App() {
  return (
    <main className="calculator-playground">
      <header className="playground-heading">
        <span>@sunaissu/calculator</span>
        <h1>Calculator</h1>
        <p>A focused playground for the standalone calculator app.</p>
      </header>

      <CalculatorApp defaultTheme="system" />
    </main>
  );
}
