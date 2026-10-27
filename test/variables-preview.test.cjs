const {test}=require('node:test');
const assert=require('node:assert/strict');
const {inspectVariables}=require('../dist/index.js');
test('live variable preview recalculates dependencies without mutating captured Ans',()=>{
 const context={angleUnit:'deg',variables:{ans:8}};
 assert.deepEqual(inspectVariables('length = ans\nwidth = length / 2\nangle = sin(90)',context).map(r=>r.value),[8,4,1]);
 assert.deepEqual(inspectVariables('length = 20\nwidth = length / 2',context).map(r=>r.value),[20,10]);
 assert.deepEqual(context.variables,{ans:8});
});
test('bad assignments do not leave stale dependent values and independent rows still preview',()=>{
 const rows=inspectVariables('x=2\n\nx=1/0\ny=x+1\nz=3');
 assert.equal(rows[1].line,3);assert.match(rows[1].error,/finite|zero/i);assert.ok(rows[2].error);assert.equal(rows[3].value,3);
 assert.ok(inspectVariables('x=y\ny=x')[0].error);
 assert.ok(inspectVariables('pi=3')[0].error);
 assert.match(inspectVariables(Array(51).fill('a=1').join('\n'))[0].error,/50/);
});
