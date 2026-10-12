const test = require('node:test');
const assert = require('node:assert/strict');
const { solveEquation } = require('../dist/index.js');

test('solver finds a root and reports its actual residual', () => {
 const answer = solveEquation('x^2 - target', '0', '2', {variables:{target:2}});
 assert.ok(Math.abs(answer.value - Math.sqrt(2)) < 1e-8);
 assert.ok(Math.abs(answer.residual) <= 1e-8);
 assert.equal(answer.residual, answer.value ** 2 - 2);
 assert.ok(answer.iterations > 0 && answer.iterations <= 100);
 assert.equal(solveEquation('x - 2', '2', '3').iterations, 0);
 assert.equal(solveEquation('(x-1)^3', '0', '2').value, 1);
 const multiple = solveEquation('x*(x-1)*(x+1)', '-2', '2');
 assert.equal(Math.abs(multiple.residual), 0);
 assert.throws(()=>solveEquation('(x-1)^2', '0', '3'),/sign/);
});
test('solver rejects invalid brackets, poles and exhausted budgets', () => {
 assert.throws(()=>solveEquation('x^2 + 1','-1','1'),/sign/);
 assert.throws(()=>solveEquation('1/x','-1','1'),/finite/);
 assert.throws(()=>solveEquation('1/(x-.1)','0','1'),/converge|finite/);
 assert.throws(()=>solveEquation('x^2-2','0','2',{}, {maxIterations:1}),/converge/);
 assert.throws(()=>solveEquation('x','1','0'),/Lower bound/);
 for(const tolerance of [0,-1,NaN,Infinity,2]) assert.throws(()=>solveEquation('x','-1','1',{}, {tolerance}),/Tolerance/);
 assert.throws(()=>solveEquation('x','-1','1',{}, {maxIterations:Infinity}),/Iteration/);
});

test('a root at the lower endpoint does not evaluate an unrelated singular endpoint', () => {
 const {solveEquation} = require('../dist/index.js');
 assert.deepEqual(solveEquation('(x-1)/(x-2)','1','2'),{value:1,residual:-0,iterations:0});
});
