// Run the playground, then this script with PLAYWRIGHT_MODULE pointing to an
// installed @playwright/test. CALCULATOR_URL, QA_BROWSER, CHROME_PATH and
// QA_OUTPUT have the same meanings as in responsive-review.cjs.
const { chromium, firefox, webkit, expect } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = process.env.QA_BROWSER || 'chromium';
const output = process.env.QA_OUTPUT || path.join(__dirname, 'artifacts');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const reports = [], errors = [];
let support;

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await { chromium, firefox, webkit }[engine].launch({
    headless: true,
    ...(engine === 'chromium' && fs.existsSync(chrome) ? { executablePath: chrome } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    support = await page.evaluate(() => ({
      color: CSS.supports('scrollbar-color', 'red blue'),
      width: CSS.supports('scrollbar-width', 'none'),
      userAgent: navigator.userAgent,
    }));
    assert.equal(support.width, true, 'This review requires standard scrollbar-width support');
    if (!support.color) {
      console.log(`${engine} uses the scoped WebKit scrollbar-color fallback`);
      reports.push({
        state: 'fallback verification scope',
        assertions: 'Computed scrollbar styling and wheel/keyboard scrolling; rendered pixels require manual inspection.',
        manualFinding: 'The tested Windows WebKit build painted initially custom scrollbars, but failed to repaint native-to-custom changes. Native scrollbar appearance preservation was not verified for experimental workarounds; no workaround is applied.',
      });
    }
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.CALCULATOR_URL || 'http://127.0.0.1:5173');
    await expect(page.getByLabel('Calculation expression')).toBeVisible();
    const demo = page.locator('.sunaissu-calculator-panel');
    await page.getByText('Appearance', { exact: true }).click();
    await demo.getByRole('button', { name: 'Light', exact: true }).click();
    const defaultAccent = await demo.evaluate(element => getComputedStyle(element).getPropertyValue('--calculator-accent').trim());
    for (const [scheme, primary, secondary] of [
      ['ocean', '#2563eb', '#06b6d4'], ['forest', '#15803d', '#ca8a04'], ['plum', '#9333ea', '#db2777'],
    ]) {
      await page.getByLabel(/^Color scheme/).selectOption(scheme);
      await expect.poll(() => demo.evaluate(element => [getComputedStyle(element).getPropertyValue('--calculator-accent').trim(), getComputedStyle(element).getPropertyValue('--calculator-function').trim()])).toEqual([primary, secondary]);
    }
    await page.getByLabel(/^Color scheme/).selectOption('custom');
    await page.getByLabel('Primary color', { exact: true }).fill('#123456');
    await page.getByLabel('Secondary color', { exact: true }).fill('#abcdef');
    await expect.poll(() => demo.evaluate(element => [getComputedStyle(element).getPropertyValue('--calculator-accent').trim(), getComputedStyle(element).getPropertyValue('--calculator-function').trim()])).toEqual(['#123456', '#abcdef']);
    await demo.getByRole('button', { name: 'Dark', exact: true }).click();
    await expect(demo).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => demo.evaluate(element => getComputedStyle(element).getPropertyValue('--calculator-accent').trim())).toBe('#123456');
    await demo.getByRole('button', { name: 'Auto', exact: true }).click();
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      await expect(demo).toHaveAttribute('data-theme', colorScheme);
    }
    await demo.getByRole('button', { name: 'Light', exact: true }).click();
    await page.getByLabel(/^Color scheme/).selectOption('default');
    await expect.poll(() => demo.evaluate(element => getComputedStyle(element).getPropertyValue('--calculator-accent').trim())).toBe(defaultAccent);
    await page.getByLabel(/^Scrollbar/).selectOption('custom');
    await page.getByLabel('Thumb color', { exact: true }).fill('#654321');
    await expect(page.getByLabel('Track color', { exact: true })).toBeDisabled();
    await page.getByLabel('Transparent track', { exact: true }).uncheck();
    await page.getByLabel('Track color', { exact: true }).fill('#fedcba');
    await expect(page.getByRole('region', { name: 'Calculator playground', exact: true })).toHaveAttribute('data-calculator-scrollbar', 'custom');
    await page.getByLabel(/^Scrollbar/).selectOption('hidden');
    await expect.poll(() => page.getByRole('region', { name: 'Calculator playground', exact: true }).evaluate(element => getComputedStyle(element).scrollbarWidth)).toBe('none');
    await page.getByLabel(/^Scrollbar/).selectOption('native');
    await expect(page.getByRole('region', { name: 'Calculator playground', exact: true })).toHaveAttribute('data-calculator-scrollbar', 'native');
    reports.push({ state: 'playground', presets: ['default', 'ocean', 'forest', 'plum', 'custom'], themes: ['light', 'dark', 'system'], scrollbarControls: true });
    console.log('Calculator playground color schemes, custom colors, themes and scrollbar controls passed');
    await page.evaluate(async () => {
      const resources = performance.getEntriesByType('resource').map(entry => entry.name);
      const React = (await import(resources.find(url => /\/react\.js(?:\?|$)/.test(url)))).default;
      const ReactDOM = await import(resources.find(url => /\/react-dom_client\.js(?:\?|$)/.test(url)));
      const createRoot = ReactDOM.createRoot || ReactDOM.default.createRoot;
      const { Calculator, getCalculatorScrollbarProps } = await import(resources.find(url => url.includes('/calculator/src/index.tsx')));
      const variables = Array.from({ length: 50 }, (_, index) => `v${index} = ${index}`).join('\n');
      function Fixture() {
        const [scrollbar, setScrollbar] = React.useState(undefined);
        window.qaSetScrollbar = setScrollbar;
        const scrollbarProps = getCalculatorScrollbarProps(scrollbar);
        return React.createElement('div', { style: { display: 'flex', gap: 16, padding: 20, alignItems: 'flex-start' } },
          React.createElement('div', {
            ...scrollbarProps, id: 'qa-host', tabIndex: 0,
            role: 'region', 'aria-label': 'Host calculator scroll area',
            style: { ...scrollbarProps.style, width: 440, height: 440, overflow: 'auto', padding: 8, border: '1px solid #64748b' },
          }, React.createElement(Calculator, { title: 'Configured calculator', scrollbar, defaultVariables: variables, theme: 'light' })),
          React.createElement('div', { style: { width: 400 } }, React.createElement(Calculator, {
            title: 'Independent calculator', defaultVariables: variables, theme: 'light',
            scrollbar: { thumbColor: '#112233', trackColor: '#ddeeff', width: 'thin' },
          })),
          React.createElement('div', { id: 'qa-unrelated', tabIndex: 0, style: { width: 180, height: 120, overflow: 'auto' } },
            React.createElement('div', { style: { height: 800 } }, 'Unrelated host content')));
      }
      document.body.innerHTML = '<div id="qa-scrollbar-fixture"></div>';
      createRoot(document.getElementById('qa-scrollbar-fixture')).render(React.createElement(Fixture));
    });
    const main = page.getByRole('region', { name: 'Configured calculator', exact: true });
    const independent = page.getByRole('region', { name: 'Independent calculator', exact: true });
    await main.locator('.calculator-options > summary').first().click();
    await independent.locator('.calculator-options > summary').first().click();
    const plot = main.locator('.calculator-plot');
    await plot.locator('summary').first().click();
    await plot.getByRole('button', { name: 'Data points', exact: true }).click();
    await plot.getByLabel('Data, one x,y pair per line').fill(Array.from({ length: 80 }, (_, index) => `${index},${index * 2}`).join('\n'));
    await plot.getByRole('button', { name: 'Draw plot', exact: true }).click();
    await plot.locator('details > summary').click();
    const targets = [
      ['host', page.locator('#qa-host')],
      ['variables', main.getByRole('region', { name: 'Variable values and errors' })],
      ['variable input', main.getByLabel('Named variables')],
      ['plot input', plot.getByLabel('Data, one x,y pair per line')],
      ['plot values', plot.getByRole('region', { name: 'Plot values', exact: true })],
    ];
    const appearance = locator => locator.evaluate((element, checkColor) => {
      const css = getComputedStyle(element);
      return checkColor ? { color: css.scrollbarColor, width: css.scrollbarWidth } : {
        width: css.scrollbarWidth,
        thumb: getComputedStyle(element, '::-webkit-scrollbar-thumb').backgroundColor,
        track: getComputedStyle(element, '::-webkit-scrollbar-track').backgroundColor,
        size: getComputedStyle(element, '::-webkit-scrollbar').width,
      };
    }, support.color);
    const nativeAppearance = new Map(await Promise.all(targets.map(async ([name, target]) => [name, await appearance(target)])));
    const expectedAppearance = (color, width, name) => support.color ? { color, width }
      : color === 'auto' ? { ...nativeAppearance.get(name), width }
        : { width: 'auto', thumb: color.match(/rgba?\([^)]+\)/g)[0], track: color.match(/rgba?\([^)]+\)/g)[1], size: width === 'thin' ? '8px' : '12px' };
    const independentBefore = await appearance(independent.getByLabel('Named variables'));
    const unrelatedBefore = await appearance(page.locator('#qa-unrelated'));
    const pageBefore = await page.evaluate(() => ({ color: getComputedStyle(document.documentElement).scrollbarColor, width: getComputedStyle(document.documentElement).scrollbarWidth }));
    reports.push({ state: 'fixture', independent: independentBefore, containers: await Promise.all(targets.map(async ([name, target]) => ({ name, ...await appearance(target) }))) });
    assert.deepEqual(independentBefore, expectedAppearance('rgb(17, 34, 51) rgb(221, 238, 255)', 'thin'));
    for (const [name, target] of targets) {
      assert.equal(await target.evaluate(element => element.scrollHeight > element.clientHeight), true, `${name} must actually overflow`);
    }
    const states = [
      ['native', null, 'auto', 'auto'],
      ['native thin', { width: 'thin' }, 'auto', 'thin'],
      ['custom', { thumbColor: '#123456', trackColor: '#abcdef', width: 'thin' }, 'rgb(18, 52, 86) rgb(171, 205, 239)', 'thin'],
      ['transparent track', { thumbColor: '#123456', trackColor: 'transparent' }, 'rgb(18, 52, 86) rgba(0, 0, 0, 0)', 'auto'],
      ['transparent colors', { thumbColor: 'transparent', trackColor: 'transparent' }, 'rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)', 'auto'],
      ['hidden', { width: 'none' }, 'auto', 'none'],
      ['reset', null, 'auto', 'auto'],
    ];
    for (const [state, options, color, width] of states) {
      await page.evaluate(value => window.qaSetScrollbar(value ?? undefined), options);
      for (const [name, target] of targets) {
        await expect.poll(() => appearance(target), { message: `${state}: ${name}` }).toEqual(expectedAppearance(color, width, name));
      }
      assert.deepEqual(await appearance(independent.getByLabel('Named variables')), independentBefore, `${state}: independent calculator changed`);
      assert.deepEqual(await appearance(page.locator('#qa-unrelated')), unrelatedBefore, `${state}: unrelated scroll area changed`);
      assert.deepEqual(await page.evaluate(() => ({ color: getComputedStyle(document.documentElement).scrollbarColor, width: getComputedStyle(document.documentElement).scrollbarWidth })), pageBefore, `${state}: page scrollbar changed`);
      reports.push({ state, color, width, targets: targets.map(([name]) => name) });
      if (state === 'custom') {
        await targets[1][1].scrollIntoViewIfNeeded();
        const bounds = await targets[1][1].boundingBox();
        await page.mouse.move(bounds.x + bounds.width - 4, bounds.y + bounds.height / 2);
        await page.mouse.wheel(0, 80);
        await expect.poll(() => targets[1][1].evaluate(element => element.scrollTop)).toBeGreaterThan(0);
        await page.screenshot({ path: path.join(output, `scrollbar-${engine}-custom.png`), fullPage: true });
      }
      if (state === 'hidden') {
        for (const [name, target] of targets) {
          await target.scrollIntoViewIfNeeded();
          await target.evaluate(element => { element.scrollTop = 0; });
          const box = await target.boundingBox();
          await page.mouse.move(box.x + (name === 'host' ? 3 : box.width / 2), box.y + Math.min(30, box.height / 2));
          await page.mouse.wheel(0, 180);
          await expect.poll(() => target.evaluate(element => element.scrollTop), { message: `${name}: hidden scrollbar wheel` }).toBeGreaterThan(0);
          await target.focus();
          await expect(target).toBeFocused();
          await target.evaluate(element => { element.scrollTop = 0; if (element instanceof HTMLTextAreaElement) element.setSelectionRange(0, 0); });
          await page.keyboard.press('PageDown');
          await expect.poll(() => target.evaluate(element => element.scrollTop), { message: `${name}: hidden scrollbar keyboard` }).toBeGreaterThan(0);
          reports.push({ state, target: name, wheel: true, keyboard: true });
        }
      }
      console.log(`Calculator scrollbar ${state} computed-style checks passed`);
    }
    await page.screenshot({ path: path.join(output, `scrollbar-${engine}.png`), fullPage: true });
    assert.deepEqual(errors, []);
  } catch (error) {
    errors.push(error.stack || error.message);
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, `scrollbar-${engine}.json`), JSON.stringify({ engine, version: browser.version(), support, reports, errors }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
