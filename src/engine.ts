export type AngleUnit = "rad" | "deg";

export interface EvaluationContext {
  angleUnit?: AngleUnit;
  variables?: Record<string, number>;
}

type Token = { type: "number" | "name" | "operator"; value: string };

const MAX_EXPRESSION_LENGTH = 500;
const MAX_FACTORIAL = 170;

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
      tokens.push({ type: "number", value: number[0] });
      cursor += number[0].length;
      continue;
    }

    const name = remaining.match(/^[a-z]+/i);
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
  const tokens = tokenize(expression);
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
    if (token.type === "number") return Number(token.value);

    if (token.type === "name") {
      const constants: Record<string, number> = {
        pi: Math.PI,
        e: Math.E,
        tau: Math.PI * 2,
        phi: (1 + Math.sqrt(5)) / 2,
      };
      if (token.value in constants) return constants[token.value];
      if (token.value in variables) {
        const variable = variables[token.value];
        if (!Number.isFinite(variable)) {
          throw new Error(`Variable "${token.value}" is not finite`);
        }
        return variable;
      }

      const fn = functions[token.value];
      if (!fn) throw new Error(`Unknown function or variable "${token.value}"`);
      if (peek()?.value !== "(") throw new Error("Functions need parentheses");
      take();
      const value = parseExpression();
      if (take()?.value !== ")") throw new Error("Missing closing parenthesis");
      return fn(value);
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
      return Math.pow(base, parseUnary());
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
        value = operator === "*" ? value * right : value / right;
      } else if (peek().type === "name" && peek().value === "mod") {
        take();
        value %= parseUnary();
      } else if (beginsPrimary(peek())) {
        value *= parseUnary();
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
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  if (!tokens.length) throw new Error("Enter a calculation");
  const result = parseExpression();
  if (cursor < tokens.length) throw new Error("Check the expression");
  if (!Number.isFinite(result)) throw new Error("Result is not finite");
  return result;
}

export function formatCalculatorResult(value: number): string {
  if (!Number.isFinite(value)) throw new Error("Result is not finite");
  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) {
    return value.toExponential(8).replace(/\.0+e/, "e");
  }
  return Number(value.toPrecision(12)).toString();
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
  if (lowerBound === upperBound) return 0;

  const intervals = 600;
  const step = (upperBound - lowerBound) / intervals;
  const evaluateAt = (x: number) =>
    evaluateExpression(expression, {
      ...context,
      variables: { ...context.variables, x },
    });

  let weightedSum = evaluateAt(lowerBound) + evaluateAt(upperBound);
  for (let index = 1; index < intervals; index += 1) {
    weightedSum += (index % 2 === 0 ? 2 : 4) * evaluateAt(lowerBound + index * step);
  }
  const result = (step / 3) * weightedSum;
  if (!Number.isFinite(result)) throw new Error("Integral is not finite");
  return result;
}

/** Numerically evaluate a derivative with a five-point central difference. */
export function differentiateExpression(
  expression: string,
  pointExpression: string,
  context: EvaluationContext = {},
): number {
  const point = evaluateExpression(pointExpression, context);
  const step = Math.max(1e-5, Math.abs(point) * 1e-5);
  const evaluateAt = (x: number) =>
    evaluateExpression(expression, {
      ...context,
      variables: { ...context.variables, x },
    });
  const result =
    (-evaluateAt(point + 2 * step) +
      8 * evaluateAt(point + step) -
      8 * evaluateAt(point - step) +
      evaluateAt(point - 2 * step)) /
    (12 * step);
  if (!Number.isFinite(result)) throw new Error("Derivative is not finite");
  return result;
}
