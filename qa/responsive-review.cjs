// Run a playground server, then: node qa/responsive-review.cjs
// Requires @playwright/test (or set PLAYWRIGHT_MODULE to its installed path).
// QA_BROWSER: chromium (default), webkit, or firefox. CHROME_PATH is optional.
// CALCULATOR_URL defaults to http://127.0.0.1:5173.
// QA_OUTPUT defaults to ignored qa/artifacts. QA_CASES optionally replaces the
// full light/dark matrix with JSON tuples such as [[390,844,"light"]].
const { chromium, firefox, webkit, expect } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = process.env.QA_OUTPUT || path.join(__dirname, 'artifacts');
const sizes = [[320,568],[568,320],[390,844],[844,390],[768,1024],[1024,768],[1440,900]];
const cases = process.env.QA_CASES ? JSON.parse(process.env.QA_CASES) : ['light','dark'].flatMap(theme=>sizes.map(([width,height])=>[width,height,theme]));
const reports = [], errors = [];
const engine = process.env.QA_BROWSER || 'chromium';
(async () => {
  fs.mkdirSync(output,{recursive:true});
  const browser = await {chromium,firefox,webkit}[engine].launch({headless:true,...(engine==='chromium'&&process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    for (const [width,height,theme] of cases) {
      const context = await browser.newContext({viewport:{width,height},hasTouch:width<1100,colorScheme:theme,...(engine==='chromium'?{permissions:['clipboard-read','clipboard-write']}:{})});
      const page = await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.CALCULATOR_URL || 'http://127.0.0.1:5173');
      const panel = page.locator('.sunaissu-calculator-panel');
      const button = name => panel.getByRole('button',{name,exact:true});
      const expression = page.getByLabel('Calculation expression');
      const calculate = async text => {await expression.fill(text);await button('=').click();};
      const checkedControls=new Set();
      const inspect = async (state, all=false) => {
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width} ${state}: page overflow`);
        const targets = await panel.locator('button:visible, summary:visible').evaluateAll(nodes=>nodes.map(el=>({name:el.getAttribute('aria-label')||el.textContent,rect:el.getBoundingClientRect().toJSON()})));
        if (width<1100) assert.deepEqual(targets.filter(({rect})=>rect.height<43.5 || rect.width<43.5),[],`${state}: touch targets`);
        if (all) {
          const controls=panel.locator('button:visible:not(:disabled),input:visible,select:visible,textarea:visible,summary:visible');
          for(let i=0;i<await controls.count();i++) {const control=controls.nth(i);const key=await control.evaluate(el=>el.tagName+':'+(el.getAttribute('aria-label')||el.getAttribute('title')||(el.labels&&Array.from(el.labels).map(label=>label.textContent).join())||el.textContent));if(await control.isEnabled()&&!checkedControls.has(key)){await control.click({trial:true});checkedControls.add(key);}}
        }
        reports.push({width,height,theme,state,controls:targets.length});
      };
      await button(theme==='dark'?'Dark':'Light').click();
      await expect(panel).toHaveAttribute('data-theme',theme);
      await calculate('2+3*4');await expect(page.locator('.calculator-result')).toHaveText('14');
      await button('Copy result').click();
      if(engine==='chromium')await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toBe('14');else await expect(panel.locator('small[role=status]')).toHaveText(/Copied|Copy unavailable/);
      await button('Copy equation').click();if(engine==='chromium')assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/14/);else await expect(panel.locator('small[role=status]')).toHaveText(/Copied|Copy unavailable/);
      await button('M+').click();await page.locator('.calculator-keypad').getByRole('button',{name:'Clear',exact:true}).click();await button('MR').click();await expect(expression).toHaveValue('14');
      await button('M−').click();await button('MR').click();await expect(expression).toHaveValue('0');await button('MC').click();
      await inspect('standard-memory-clipboard-history',true);
      await panel.locator('details').first().locator('summary').click();
      await page.getByLabel('Named variables').fill('length = 12\nwidth = length / 2');
      await calculate('length*width');await expect(page.locator('.calculator-result')).toHaveText('72');
      for(const notation of ['fixed','scientific','engineering','significant','auto']) {await page.getByLabel(/^Notation/).selectOption(notation);await inspect('format '+notation);}
      await page.getByLabel('Named variables').fill('long_name = unknown_value');
      await expect(page.getByRole('region',{name:'Variable values and errors'})).toContainText('Error:');await inspect('variable-error');
      await page.getByLabel('Named variables').fill('');
      await calculate('1/0');await expect(page.locator('.calculator-result.is-error')).toBeVisible();await inspect('expression-error');
      await button('Engineering').click();await button('DEG').click();await calculate('sin(90)');await expect(page.locator('.calculator-result')).toHaveText('1');await button('RAD').click();
      await inspect('engineering',true);
      await page.getByLabel('f(x)',{exact:true}).fill('x^2');await page.getByLabel('Lower bound',{exact:true}).fill('0');await page.getByLabel('Upper bound',{exact:true}).fill('1');
      await button('Evaluate definite integral').click();await expect(page.locator('.calculus-summary')).toBeVisible();await inspect('integral');
      await button('d/dx Derivative').click();await page.getByLabel('Evaluate at x').fill('2');await button('Evaluate derivative').click();assert.ok(Math.abs(Number(await page.locator('.calculator-result').innerText())-4)<1e-8);await inspect('derivative');
      await button('Solve f(x) = 0').click();await page.getByLabel('f(x)',{exact:true}).fill('x^2-4');await page.getByLabel('Lower bound',{exact:true}).fill('0');await page.getByLabel('Upper bound',{exact:true}).fill('3');await button('Solve equation').click();assert.ok(Math.abs(Number(await page.locator('.calculator-result').innerText())-2)<1e-8);await inspect('solver');
      await page.getByLabel('Upper bound',{exact:true}).fill('1');await button('Solve equation').click();await expect(page.locator('.calculator-result.is-error')).toBeVisible();await inspect('solver-error');
      const plot = page.locator('.calculator-plot');await plot.locator('summary').first().click();
      await page.getByLabel('Plot expression',{exact:true}).fill('x^2');await button('Draw plot').click();await expect(plot.locator('img')).toBeVisible();await plot.locator('details summary').click();await inspect('expression-plot-values',true);
      for(const name of ['Download SVG','Download CSV']) {const downloaded=page.waitForEvent('download');await button(name).click();await downloaded;}
      await page.getByLabel('Plot lower x').fill('10');await page.getByLabel('Plot upper x').fill('-10');await button('Draw plot').click();await expect(plot.getByRole('alert')).toBeVisible();await inspect('plot-bounds-error');
      await button('Data points').click();await page.getByLabel('Data, one x,y pair per line').fill('0,0\n1,2\n2,4');await button('Draw plot').click();await expect(plot.locator('img')).toBeVisible();await inspect('data-plot',true);
      await button('Clear plot').click();await expect(plot.locator('img')).toHaveCount(0);
      await page.getByLabel('Data, one x,y pair per line').fill('bad,data');await button('Draw plot').click();await expect(plot.getByRole('alert')).toBeVisible();await inspect('data-error');
      await page.locator('.calculator-history > button').first().click();await expect(page.locator('.calculator-result.is-error')).toHaveCount(0);await inspect('history-restore');
      await page.locator('.calculator-history-clear').click();await expect(page.locator('.calculator-history')).toHaveCount(0);
      await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,`${width}x${height}-${theme}.png`),fullPage:true});
      await context.close();console.log(`Calculator ${width}x${height} ${theme} passed`);
    }
    const rotation = await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
    const page = await rotation.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.CALCULATOR_URL || 'http://127.0.0.1:5173');
    await page.getByLabel('Calculation expression').fill('42+8');await page.getByRole('button',{name:'=',exact:true}).click();
    for(const [width,height] of [[844,390],[390,844],[390,400],[568,260]]){
      await page.getByLabel('Calculation expression').click();await page.setViewportSize({width,height});await expect(page.getByLabel('Calculation expression')).toBeFocused();
      await expect(page.getByLabel('Calculation expression')).toHaveValue('42+8');await expect(page.locator('.calculator-result')).toHaveText('50');
      await page.getByRole('button',{name:'=',exact:true}).click({trial:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.locator('.calculator-display').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`rotation-${width}x${height}.png`)});reports.push({width,height,state:'rotation-and-focused-input',retainedResult:'50'});
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Auto',exact:true}).click();
    for(const colorScheme of ['dark','light']){await page.emulateMedia({colorScheme});await expect(page.locator('.sunaissu-calculator-panel')).toHaveAttribute('data-theme',colorScheme);}
    reports.push({width:390,height:844,state:'system-theme-changes'});
    await page.evaluate(async()=>{
      const resources=performance.getEntriesByType('resource').map(entry=>entry.name);
      const React=(await import(resources.find(url=>/\/react\.js(?:\?|$)/.test(url)))).default;
      const ReactDOM=await import(resources.find(url=>/\/react-dom_client\.js(?:\?|$)/.test(url)));
      const createRoot=ReactDOM.createRoot || ReactDOM.default.createRoot;
      const {DocumentCalculator,CanvasCalculator}=await import(resources.find(url=>url.includes('/calculator/src/index.tsx')));
      document.body.innerHTML='<div id="adapter-fixture" style="max-width:420px;margin:auto"></div>';
      window.qaPayloads=[];
      createRoot(document.getElementById('adapter-fixture')).render(React.createElement(React.Fragment,null,
        React.createElement(DocumentCalculator,{title:'Document adapter',onInsert:payload=>window.qaPayloads.push(payload)}),
        React.createElement(CanvasCalculator,{title:'Canvas adapter',onInsert:payload=>window.qaPayloads.push(payload)}),
        React.createElement(DocumentCalculator,{title:'Read-only adapter',readOnly:true,onInsert:payload=>window.qaPayloads.push(payload)})));
    });
    for(const [title,target] of [['Document adapter','document'],['Canvas adapter','canvas'],['Read-only adapter','document']]){
      const adapter=page.getByRole('region',{name:title,exact:true});await adapter.getByLabel('Calculation expression').fill('6*7');await adapter.getByRole('button',{name:'=',exact:true}).click();
      const insert=adapter.locator('.calculator-insert');if(title==='Read-only adapter')await expect(insert).toBeDisabled();else{await insert.click();assert.equal(await page.evaluate(()=>window.qaPayloads.at(-1).target),target);assert.equal(await page.evaluate(()=>window.qaPayloads.at(-1).numericValue),42);}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);reports.push({width:390,height:844,state:title});
    }
    assert.equal(await page.evaluate(()=>window.qaPayloads.length),2);await rotation.close();
    assert.deepEqual(errors,[]);
  } catch(error) {errors.push(error.stack || error.message);throw error;}
  finally {fs.writeFileSync(path.join(output,'responsive.json'),JSON.stringify({engine,cases,reports,errors},null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
