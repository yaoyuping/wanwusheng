import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const base = process.env.YIYU_TEST_URL || 'http://127.0.0.1:8000/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  for (const [device, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true, plantnet: true, deepseek: true } }));
    await page.goto(base);
    await page.waitForFunction(() => typeof state === 'object' && state !== null && document.querySelector('#desktop-nav')?.children.length > 0);
    await page.locator('[data-nav="plants"]:visible').first().click();
    await page.locator('[data-action="new-plant"]:visible').first().click();
    const form = page.locator('#plant-form');
    if (device === 'mobile') {
      const smallFields = await form.locator('input:visible, textarea:visible, select:visible').evaluateAll(fields =>
        fields.filter(field => parseFloat(getComputedStyle(field).fontSize) < 16).map(field => field.id));
      assert.deepEqual(smallFields, [], 'Mobile form controls must avoid iOS focus zoom');
    }
    const price = form.locator('[name="price"]');
    assert.equal(await price.getAttribute('inputmode'), 'decimal');
    for (const invalid of ['-1', '19.999']) {
      await price.fill(invalid);
      assert.equal(await price.evaluate(field => field.checkValidity()), false);
    }
    await price.fill('19.90');
    assert.equal(await price.evaluate(field => field.checkValidity()), true);
    for (const [key, value] of Object.entries({ interval: '13', location: '北窗书房', source: '邻居赠送', status: '休眠中' })) {
      await form.locator(`#v55-custom-${key}`).fill(value);
      await form.locator(`[data-action="v55-add-option"][data-key="${key}"]`).click();
      assert.equal(await form.locator(`select[name="${key}"]`).inputValue(), value);
    }
    await form.locator('[name="name"]').fill('自定义测试一');
    await form.locator('#v4-tag-entry').fill('喜湿');
    await form.locator('[data-action="v4-tag-add"]').click();
    await form.locator('[type="submit"]').click();
    await page.waitForFunction(() => state.plants.some(p => p.name === '自定义测试一'));
    await page.locator('#modal-root [data-action="close-modal"]').first().click();
    await page.locator('[data-action="new-plant"]:visible').first().click();
    assert.equal(await form.locator('select[name="interval"] option[value="13"]').count(), 1);
    assert.equal(await form.locator('select[name="location"] option[value="北窗书房"]').count(), 1);
    await form.locator('[name="name"]').fill('自定义测试二');
    await price.fill('0.00');
    await form.locator('select[name="location"]').selectOption('北窗书房');
    await form.locator('#v4-tag-entry').fill('耐阴');
    await form.locator('[data-action="v4-tag-add"]').click();
    await form.locator('[type="submit"]').click();
    await page.waitForFunction(() => state.plants.some(p => p.name === '自定义测试二'));
    await page.locator('#modal-root [data-action="close-modal"]').first().click();
    await page.reload();
    await page.waitForFunction(() => typeof state === 'object' && state?.plants?.length === 2);
    assert.equal(await page.evaluate(() => state.plants.find(p => p.name === '自定义测试一').price), '19.90');
    assert.equal(await page.evaluate(() => state.plants.find(p => p.name === '自定义测试二').price), '0.00');
    await page.evaluate(() => plantDetail(state.plants.find(p => p.name === '自定义测试一').id));
    assert.ok((await page.locator('#modal-root').innerText()).includes('¥19.90'));
    await page.locator('#modal-root [data-action="edit-plant"]').first().click();
    assert.equal(await price.inputValue(), '19.90');
    await price.fill('12.35');
    await form.locator('[type="submit"]').click();
    await page.waitForFunction(() => state.plants.find(p => p.name === '自定义测试一').price === '12.35');
    await page.locator('#modal-root [data-action="close-modal"]').first().click();
    await page.locator('[data-nav="plants"]:visible').first().click();
    await page.locator('[data-action="new-plant"]:visible').first().click();
    for (const [key, value] of Object.entries({ interval: '13', location: '北窗书房', source: '邻居赠送', status: '休眠中' }))
      assert.equal(await form.locator(`select[name="${key}"] option[value="${value}"]`).count(), 1);
    await page.locator('#modal-root [data-action="close-modal"]').first().click();
    await page.locator('[data-filter="tag:喜湿"]').click();
    assert.deepEqual(await page.locator('.v50-plants .plant-card h3').allTextContents(), ['自定义测试一']);
    await page.locator('[data-filter="tag:耐阴"]').click();
    assert.deepEqual(await page.locator('.v50-plants .plant-card h3').allTextContents(), ['自定义测试二']);
    await page.locator('[data-filter="北窗书房"]').click();
    assert.equal(await page.locator('.v50-plants .plant-card').count(), 2);
    const data = await page.evaluate(async () => JSON.parse(await (await yiyuBuildFile()).file.text()));
    assert.deepEqual(data.optionLibrary, { interval: ['13'], location: ['北窗书房'], source: ['邻居赠送'], status: ['休眠中'] });
    assert.equal(data.plants.find(p => p.name === '自定义测试一').interval, 13);
    assert.equal(data.plants.find(p => p.name === '自定义测试一').price, '12.35');
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    results.push({ device, customOptions: 4, reusableAfterReload: true, tagFilter: true, locationFilter: true, backedUp: true, decimalPrice: true, mobileInputFont: device === 'mobile' ? '16px or larger' : 'unchanged' });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
