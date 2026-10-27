export type AngleUnit = "rad" | "deg";

export interface EvaluationContext {
  angleUnit?: AngleUnit;
  variables?: Record<string, number>;
}

type Token = { type: "number" | "name" | "operator"; value: string };

const MAX_EXPRESSION_LENGTH = 500;
const MAX_FACTORIAL = 170;

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Result is not finite");
  return value;
}

function tokenize(rawExpression: string): Token[] {
  if (rawExpression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error("Expression is too long");
  }

  const expression = rawExpression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/gi, "pi");
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < expression.length) {
    const remaining = expression.slice(cursor);
    const whitespace = remaining.match(/^\s+/);
    if (whitespace) {
      cursor += whitespace[0].length;
      continue;
    }

    const number = remaining.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      if (tokens[tokens.length - 1]?.type === "number") throw new Error("Numbers need an operator between them");
      tokens.push({ type: "number", value: number[0] });
      cursor += number[0].length;
      continue;
    }

    const name = remaining.match(/^[a-z][a-z0-9_]*/i);
    if (name) {
      tokens.push({ type: "name", value: name[0].toLowerCase() });
      cursor += name[0].length;
      continue;
    }

    const operator = remaining[0];
    if ("+-*/^()%!".includes(operator)) {
      tokens.push({ type: "operator", value: operator });
      cursor += 1;
      continue;
    }
    throw new Error(`Unexpected character "${operator}"`);
  }

  return tokens;
}

function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Factorial needs a non-negative integer");
  }
  if (value > MAX_FACTORIAL) throw new Error(`Factorial is limited to ${MAX_FACTORIAL}`);

  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

/** Parse and safely evaluate an expression without eval or Function. */
export function evaluateExpression(
  expression: string,
  context: EvaluationContext = {},
): number {
  return evaluateTokens(tokenize(expression), context);
}

function evaluateTokens(tokens: Token[], context: EvaluationContext): number {
  const angleUnit = context.angleUnit ?? "rad";
  const variables = context.variables ?? {};
  const toRadians = (value: number) =>
    angleUnit === "deg" ? (value * Math.PI) / 180 : value;
  const fromRadians = (value: number) =>
    angleUnit === "deg" ? (value * 180) / Math.PI : value;

  const functions: Record<string, (value: number) => number> = {
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    exp: Math.exp,
    ln: Math.log,
    log: Math.log10,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sin: (value) => Math.sin(toRadians(value)),
    cos: (value) => Math.cos(toRadians(value)),
    tan: (value) => Math.tan(toRadians(value)),
    asin: (value) => fromRadians(Math.asin(value)),
    acos: (value) => fromRadians(Math.acos(value)),
    atan: (value) => fromRadians(Math.atan(value)),
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
  };

  let cursor = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  let parseExpression: () => number;
  let parseUnary: () => number;

  const parsePrimary = (): number => {
    const token = take();
    if (!token) throw new Error("Incomplete expression");
    if (token.type === "number") return finite(Number(token.value));

    if (token.type === "name") {
      const constants: Record<string, number> = {
        pi: Math.PI,
        e: Math.E,
        tau: Math.PI * 2,
        phi: (1 + Math.sqrt(5)) / 2,
      };
      if (Object.prototype.hasOwnProperty.call(constants, token.value)) return constants[token.value];
      if (Object.prototype.hasOwnProperty.call(variables, token.value)) {
        const variable = variables[token.value];
        if (!Number.isFinite(variable)) {
          throw new Error(`Variable "${token.value}" is not finite`);
        }
        return variable;
      }

      const fn = Object.prototype.hasOwnProperty.call(functions, token.value) ? functions[token.value] : undefined;
      if (!fn) throw new Error(`Unknown function or variable "${token.value}"`);
      if (peek()?.value !== "(") throw new Error("Functions need parentheses");
      take();
      const value = parseExpression();
      if (take()?.value !== ")") throw new Error("Missing closing parenthesis");
      return finite(fn(value));
    }

    if (token.value === "(") {
      const value = parseExpression();
      if (take()?.value !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    throw new Error("Expected a number");
  };

  const parsePostfix = (): number => {
    let value = parsePrimary();
    while (peek()?.value === "%" || peek()?.value === "!") {
      value = take().value === "%" ? value / 100 : factorial(value);
    }
    return value;
  };

  const parsePower = (): number => {
    const base = parsePostfix();
    if (peek()?.value === "^") {
      take();
      return finite(Math.pow(base, parseUnary()));
    }
    return base;
  };

  parseUnary = (): number => {
    if (peek()?.value === "+") {
      take();
      return parseUnary();
    }
    if (peek()?.value === "-") {
      take();
      return -parseUnary();
    }
    return parsePower();
  };

  const beginsPrimary = (token?: Token) =>
    token?.type === "number" || token?.type === "name" || token?.value === "(";

  const parseTerm = (): number => {
    let value = parseUnary();
    while (peek()) {
      const operator = peek().value;
      if (operator === "*" || operator === "/") {
        take();
        const right = parseUnary();
        value = finite(operator === "*" ? value * right : value / right);
      } else if (peek().type === "name" && peek().value === "mod") {
        take();
        value = finite(value % parseUnary());
      } else if (beginsPrimary(peek())) {
        value = finite(value * parseUnary());
      } else {
        break;
      }
    }
    return value;
  };

  parseExpression = (): number => {
    let value = parseTerm();
    while (peek()?.value === "+" || peek()?.value === "-") {
      const operator = take().value;
      const right = parseTerm();
      value = finite(operator === "+" ? value + right : value - right);
    }
    return value;
  };

  if (!tokens.length) throw new Error("Enter a calculation");
  const result = parseExpression();
  if (cursor < tokens.length) throw new Error("Check the expression");
  if (!Number.isFinite(result)) throw new Error("Result is not finite");
  return result;
}

export interface ResultFormat {
  notation?: "auto" | "fixed" | "scientific" | "engineering" | "significant";
  precision?: number;
}

export interface EquationSolverOptions {
  /** Absolute residual tolerance for f(x), not a guarantee about x. */
  tolerance?: number;
  maxIterations?: number;
}

export interface EquationSolution {
  value: number;
  residual: number;
  iterations: number;
}

/** Find one root of a continuous real function in a sign-changing bracket. */
export function solveEquation(
  expression: string,
  lowerExpression: string,
  upperExpression: string,
  context: EvaluationContext = {},
  options: EquationSolverOptions = {},
): EquationSolution {
  const tolerance = options.tolerance ?? 1e-8;
  const limit = options.maxIterations ?? 100;
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 1) throw new Error("Tolerance must be greater than 0 and at most 1");
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("Iteration limit must be an integer from 1 to 1000");
  let lower = evaluateExpression(lowerExpression, context), upper = evaluateExpression(upperExpression, context);
  if (lower >= upper) throw new Error("Lower bound must be less than upper bound");
  const tokens = tokenize(expression);
  const at = (x: number) => evaluateTokens(tokens, { ...context, variables: { ...context.variables, x } });
  let left: number | undefined;
  let lowerError: unknown;
  try { left = at(lower); } catch (error) { lowerError = error; }
  if (left !== undefined && Math.abs(left) <= tolerance) return { value: lower, residual: left, iterations: 0 };
  const right = at(upper);
  if (Math.abs(right) <= tolerance) return { value: upper, residual: right, iterations: 0 };
  // Either endpoint can be a root even when the opposite endpoint is undefined.
  if (left === undefined) throw lowerError;
  if (Math.sign(left) === Math.sign(right)) throw new Error("Choose bounds where f(x) changes sign");
  for (let iterations = 1; iterations <= limit; iterations++) {
    const middle = lower / 2 + upper / 2;
    if (middle === lower || middle === upper) break;
    const residual = at(middle);
    if (Math.abs(residual) <= tolerance) return { value: middle, residual, iterations };
    if (Math.sign(residual) === Math.sign(left)) { lower = middle; left = residual; }
    else upper = middle;
  }
  throw new Error("Solver did not converge. Check continuity, bounds, and tolerance");
}

export function formatCalculatorResult(value: number, options: ResultFormat = {}): string {
  if (!Number.isFinite(value)) throw new Error("Result is not finite");
  const precision = options.precision ?? 6;
  if (!Number.isInteger(precision) || precision < 0 || precision > 12) throw new Error("Precision must be an integer from 0 to 12");
  if (options.notation === "significant") {
    if (precision < 1) throw new Error("Precision must be an integer from 1 to 12 for significant figures");
    return value.toPrecision(precision);
  }
  if (options.notation === "fixed") return value.toFixed(precision);
  if (options.notation === "scientific") return value.toExponential(precision);
  if (options.notation === "engineering") {
    const exponent = value === 0 ? 0 : Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
    const mantissa = value / 10 ** exponent;
    if (!Number.isFinite(mantissa)) return value.toExponential(precision);
    const rounded = Number(mantissa.toFixed(precision));
    return Math.abs(rounded) >= 1000 ? (rounded / 1000).toFixed(precision) + "e" + (exponent + 3) : rounded.toFixed(precision) + "e" + exponent;
  }
  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) {
    return value.toExponential(8).replace(/\.0+e/, "e");
  }
  return Number(value.toPrecision(12)).toString();
}

// Powers of two preserve precision while bringing finite samples into a safe range.
function sampleScale(values: number[]): number {
  const largest = Math.max(...values.map(Math.abs));
  return largest === 0 ? 1 : 2 ** Math.max(-1022, Math.min(1023, Math.floor(Math.log2(largest))));
}

// Avoid overflow/underflow in intermediate products when the final product is finite.
function scaledProduct(...factors: number[]): number {
  if (factors.some(value => value === 0)) return 0;
  let mantissa = 1, exponent = 0;
  for (const value of factors) {
    const shift = Math.max(-1022, Math.min(1023, Math.floor(Math.log2(Math.abs(value)))));
    mantissa *= value / 2 ** shift;
    exponent += shift;
  }
  while (Math.abs(mantissa) >= 2) { mantissa /= 2; exponent++; }
  while (Math.abs(mantissa) < 1) { mantissa *= 2; exponent--; }
  if (exponent > 1023) return Math.sign(mantissa) * Infinity;
  if (exponent < -1075) return Math.sign(mantissa) * 0;
  return exponent < -1022
    ? (mantissa * 2 ** -1022) * 2 ** (exponent + 1022)
    : mantissa * 2 ** exponent;
}

/** Numerically evaluate a definite integral using Simpson's rule. */
export function integrateExpression(
  expression: string,
  lowerBoundExpression: string,
  upperBoundExpression: string,
  context: EvaluationContext = {},
): number {
  const lowerBound = evaluateExpression(lowerBoundExpression, context);
  const upperBound = evaluateExpression(upperBoundExpression, context);

  const tokens = tokenize(expression);
  const intervals = 600;
  const span = upperBound - lowerBound;
  const spanScale = Number.isFinite(span) ? span : upperBound / 2 - lowerBound / 2;
  const spanMultiplier = Number.isFinite(span) ? 1 : 2;
  const evaluateAt = (x: number) =>
    evaluateTokens(tokens, {
      ...context,
      variables: { ...context.variables, x },
    });

  if (lowerBound === upperBound) { evaluateAt(lowerBound); return 0; }
  const values = Array.from({ length: intervals + 1 }, (_, index) => evaluateAt(
    index <= intervals / 2
      ? lowerBound + spanScale * ((index / intervals) * spanMultiplier)
      : upperBound - spanScale * (((intervals - index) / intervals) * spanMultiplier),
  ));
  const scale = sampleScale(values);
  let weightedSum = 0, correction = 0;
  // Pair symmetric samples and compensate the sum to retain small contributions.
  for (let index = 0; index <= intervals / 2; index++) {
    const pair = values[index] / scale + (index < intervals / 2 ? values[intervals - index] / scale : 0);
    const term = (index === 0 ? 1 : index % 2 === 0 ? 2 : 4) * pair;
    const next = weightedSum + term;
    correction += Math.abs(weightedSum) >= Math.abs(term)
      ? (weightedSum - next) + term : (term - next) + weightedSum;
    weightedSum = next;
  }
  const result = scaledProduct(weightedSum + correction, 1 / (3 * intervals), scale, spanScale, spanMultiplier);
  if (!Number.isFinite(result)) throw new Error("Integral is not finite");
  return result;
}

/** Numerically evaluate a derivative with a five-point central difference. */
export function differentiateExpression(
  expression: string,
  pointExpression: string,
  context: EvaluationContext = {},
): number {
  const tokens = tokenize(expression);
  const point = evaluateExpression(pointExpression, context);
  const step = Math.max(1e-5, Math.abs(point) * 1e-5);
  const evaluateAt = (x: number) =>
    evaluateTokens(tokens, {
      ...context,
      variables: { ...context.variables, x },
    });
  // A symmetric stencil alone can hide an undefined value at the evaluation point.
  evaluateAt(point);
  const values = [point + 2 * step, point + step, point - step, point - 2 * step].map(evaluateAt);
  const scale = sampleScale(values);
  const [outerRight, innerRight, innerLeft, outerLeft] = values.map(value => value / scale);
  const difference = 8 * (innerRight - innerLeft) - (outerRight - outerLeft);
  const result = scaledProduct(difference, 1 / 12, scale, 1 / step);
  if (!Number.isFinite(result)) throw new Error("Derivative is not finite");
  return result;
}

/** Variables are evaluated in order, allowing later rows to reference earlier rows. */
export function evaluateVariables(source: string, context: EvaluationContext = {}): Record<string, number> {
  const variables = { ...context.variables };
  const lines = source.split(/\r?\n/).filter(line => line.trim());
  if (lines.length > 50) throw new Error("Use at most 50 named variables");
  for (const line of lines) {
    const match = line.match(/^\s*([a-z][a-z0-9_]*)\s*=\s*(.+)$/i);
    if (!match) throw new Error('Write each variable as name = expression');
    const name = match[1].toLowerCase();
    if (/^(ans|pi|e|tau|phi|mod|sqrt|cbrt|abs|exp|ln|log|floor|ceil|round|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh)$/.test(name)) throw new Error('Reserved variable name: ' + name);
    variables[name] = evaluateExpression(match[2], { ...context, variables });
  }
  return variables;
}
