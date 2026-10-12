const {performance}=require('node:perf_hooks');
const {integrateExpression}=require('../dist/index.js');
for(let i=0;i<10;i++)integrateExpression('sin(x)^2 + cos(x)^2 + x^3','0','5');
const samples=[];
for(let run=0;run<5;run++){const start=performance.now();for(let i=0;i<100;i++)integrateExpression('sin(x)^2 + cos(x)^2 + x^3','0','5');samples.push(performance.now()-start);}
samples.sort((a,b)=>a-b);console.log(JSON.stringify({batch:'100 integrations, 601 samples each',medianMs:samples[2],samplesMs:samples}));
