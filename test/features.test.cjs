const test = require('node:test');
const assert = require('node:assert/strict');
const {evaluateExpression: evaluate, evaluateVariables, formatCalculatorResult: format} = require('../dist/index.js');
test('named variables support dependencies and reject reserved names', () => {
 const variables = evaluateVariables('length_1 = 12\nwidth = length_1 / 2');
 assert.equal(evaluate('length_1 * width', {variables}), 72);
 assert.throws(() => evaluateVariables('pi = 2'), /Reserved/);
 assert.throws(() => evaluateVariables('width = missing'), /Unknown/);
 assert.throws(() => evaluate('inherited', {variables: Object.create({inherited:7})}), /Unknown/);
});
test('formatting controls rounding without changing numeric values', () => {
 assert.equal(format(72, {notation:'fixed',precision:2}), '72.00');
 assert.equal(format(12345, {notation:'engineering',precision:2}), '12.35e3');
 assert.equal(format(999999, {notation:'engineering',precision:2}), '1.00e6');
 assert.equal(format(-0.0012, {notation:'engineering',precision:2}), '-1.20e-3');
 assert.throws(() => format(1, {precision:1.5}), /Precision/);
 assert.throws(() => format(Infinity), /finite/);
});
test('ambiguous adjacent numbers are rejected but implicit multiplication works', () => {
 for (const expression of ['1..2', '1.2.3', '2 3']) assert.throws(() => evaluate(expression), /number|operator/i);
 assert.equal(evaluate('2(3+4)'), 14);
 assert.equal(evaluate('(2)3'), 6);
 assert.equal(evaluate('2^3^2'), 512);
 assert.equal(evaluate('-2^2'), -4);
});

test('calculus validates zero-width integrals and rejects nonfinite inputs',()=>{
 const {integrateExpression: integrate,differentiateExpression: derivative}=require('../dist/index.js');
 assert.throws(()=>integrate('missing','1','1'),/Unknown/);
 assert.ok(Math.abs(integrate('x^2','3','0')+9)<1e-10);
 assert.ok(Math.abs(derivative('sin(x)','0')-1)<1e-8);
 assert.throws(()=>evaluate('1/0'),/finite/);
 assert.throws(()=>evaluate('1'.repeat(501)),/long/);
});

test('invalid intermediate values cannot become plausible finite results', () => {
 for (const expression of ['1/(1/0)', '(1e309)^0', 'sqrt(-1)^0', '1/(171! + 1)']) {
  assert.throws(() => evaluate(expression), /finite|Factorial/);
 }
 const {differentiateExpression} = require('../dist/index.js');
 assert.throws(() => differentiateExpression('1/x^2', '0'), /finite/);
});

test('significant figures preserve meaningful trailing zeroes', () => {
 assert.equal(format(12, {notation:'significant',precision:4}), '12.00');
 assert.equal(format(0.00123456, {notation:'significant',precision:3}), '0.00123');
 assert.equal(format(12345, {notation:'significant',precision:3}), '1.23e+4');
 assert.throws(() => format(12, {notation:'significant',precision:0}), /Precision/);
});

test('document adapters keep labels and equations literal in Markdown', () => {
 const {createDocumentCalculationInsert} = require('../dist/index.js');
 const result={kind:'expression',expression:'a_b*2*3',displayExpression:'a_b*2*3',numericValue:6,value:'6'};
 const output=createDocumentCalculationInsert(result,{label:'[x](evil)\n# heading',includeExpression:true});
 assert.equal(output.markdown,'**\\[x\\]\\(evil\\) \\# heading:** a\\_b\\*2\\*3 = 6');
 assert.equal(output.text,'6');
 assert.equal(createDocumentCalculationInsert(result,{label:'&copy;'}).markdown,'**\\&copy;:** 6');
});
