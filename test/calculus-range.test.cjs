const test = require('node:test');
const assert = require('node:assert/strict');
const { integrateExpression: integrate, differentiateExpression: derivative } = require('../dist/index.js');

const near = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Number.isFinite(actual), `Expected a finite result, got ${actual}`);
  assert.ok(Math.abs(actual / expected - 1) <= tolerance, `${actual} differs from ${expected}`);
};

test('integration preserves finite answers across large, small and reversed ranges', () => {
  near(integrate('1e306', '0', '1'), 1e306);
  near(integrate('1e308', '0', '1'), 1e308);
  near(integrate('a', '0', '1', { variables: { a: Number.MAX_VALUE } }), Number.MAX_VALUE);
  near(integrate('1e308*x', '0', '1'), 5e307);
  near(integrate('1e308', '1', '0'), -1e308);
  near(integrate('1e-308', '-1e308', '1e308'), 2);
  near(integrate('1e-308', '1e308', '-1e308'), -2);
  near(integrate('1e308', '0', '1e-308'), 1);
  assert.equal(integrate('5e-324', '0', '1'), 5e-324);
  assert.equal(integrate('1', '0', '5e-324'), 5e-324);
  assert.equal(integrate('x', '-1e308', '1e308'), 0);
  assert.equal(integrate('0', '-1e308', '1e308'), 0);
});

test('derivatives avoid overflow caused by large finite function values', () => {
  near(derivative('x', '1e308'), 1);
  near(derivative('x', '-1e308'), 1);
  near(derivative('1e308*x', '0'), 1e308);
  near(derivative('1e-308*x', '0'), 1e-308, 1e-9);
  assert.equal(derivative('1e308', '0'), 0);
});

test('scaled calculus preserves ordinary accuracy and rejects nonfinite answers or samples', () => {
  near(integrate('x^2', '0', '3'), 9);
  near(integrate('sin(x)', '0', 'pi'), 2);
  near(derivative('x^3', '2'), 12, 1e-8);
  near(derivative('sin(x)', '0'), 1, 1e-8);
  assert.throws(() => integrate('1e308', '0', '2'), /finite/);
  assert.throws(() => integrate('1/x', '-1', '1'), /finite/);
  assert.throws(() => derivative('1e308*x*2', '0'), /finite/);
  assert.throws(() => derivative('1/x', '0'), /finite/);
});
