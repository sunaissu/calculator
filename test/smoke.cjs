const assert = require("node:assert/strict");
const calculator = require("../dist/index.js");

assert.equal(calculator.evaluateExpression("2 + 3 * 4"), 14);
assert.ok(Math.abs(calculator.evaluateExpression("sin(30)", { angleUnit: "deg" }) - 0.5) < 1e-10);
assert.equal(calculator.evaluateExpression("5!"), 120);
assert.ok(Math.abs(calculator.integrateExpression("x^2", "0", "3") - 9) < 1e-6);
assert.ok(Math.abs(calculator.differentiateExpression("x^3", "2") - 12) < 1e-5);

const base = {
  kind: "expression",
  expression: "6*7",
  displayExpression: "6×7",
  numericValue: 42,
  value: "42",
};
assert.equal(calculator.createDocumentCalculationInsert(base).markdown, "**Calculation:** 42");
assert.deepEqual(
  calculator.createCanvasCalculationInsert(base, { x: 10, y: 20 }),
  { ...base, target: "canvas", text: "6×7 = 42", x: 10, y: 20, width: 220, height: 36 },
);

assert.throws(() => calculator.evaluateExpression("globalThis.process"), /Unexpected character/);
console.log("calculator smoke tests passed");
