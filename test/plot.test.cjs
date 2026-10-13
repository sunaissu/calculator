const test = require('node:test');
const assert = require('node:assert/strict');
const { sampleExpression, parsePlotData, plotSvg, plotCsv } = require('../dist/index.js');
test('plot sampling uses local variables and units and leaves gaps at undefined values', () => {
 const plot = sampleExpression('a*sin(x)', 0, 180, { angleUnit: 'deg', variables: { a: 2, x: 123 } }, 3);
 assert.equal(plot.points[1].x, 90); assert.equal(plot.points[1].y, 2); assert.match(plot.context, /deg.*a=2/);
 const discontinuous = sampleExpression('1/x', -1, 1, {}, 3); assert.equal(discontinuous.omitted, 1); assert.equal(discontinuous.points.length, 2);
 assert.equal((plotSvg(discontinuous).match(/<circle /g) || []).length, 2); assert.doesNotMatch(plotSvg(discontinuous), /polyline/);
 assert.throws(() => sampleExpression('process.exit()', 0, 1), /No finite samples/);
 assert.throws(() => sampleExpression('x', 0, 0), /bounds/); assert.throws(() => sampleExpression('x', 0, 1, {}, 502), /samples/);
});
test('numeric data and portable exports reject malformed, active and unbounded inputs', () => {
 const plot = parsePlotData('0,1\n1,2e2\n-2,3'); assert.equal(plotCsv(plot), 'x,y\n0,1\n1,200\n-2,3\n');
 for (const data of ['=CMD(),2', '1,2,3', 'Infinity,2', '0x12,1', '1e13,2', '1,2\n\n3,4', Array(1001).fill('1,2').join('\n')]) assert.throws(() => parsePlotData(data));
 const svg = plotSvg({ ...plot, title: '</text><script>alert(1)</script>', context: '<img src=x>' }); assert.doesNotMatch(svg, /<script>|<img /); assert.match(svg, /&lt;script&gt;/);
 assert.throws(() => plotSvg({ ...plot, omitted: '</desc><script>' }), /count/);
 assert.throws(() => plotSvg({ ...plot, points: [{ x: NaN, y: 1 }] }), /points/);
});
