import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const photo = 'data:image/png;base64,' + readFileSync(new URL('../icon-192.png', import.meta.url)).toString('base64');
const base = process.env.YIYU_TEST_URL || 'http://127.0.0.1:8006/';
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true } }));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof state === 'object' && state !== null);
    await page.evaluate(async image => {
      state.plants = [{ id: 'p/中文', name: '我的银杏', latin: 'Ginkgo biloba', image, status: '需关注', interval: 7, logs: [] }];
      state.sightings = [{ id: 's1', name: '银杏', latin: 'Ginkgo biloba', image, date: stamp(), location: '植物园', notes: '今天的叶片开始变黄。' }];
      await save(); go('plants');
    }, photo);
    const assertPage = async kind => {
      await page.locator(`#app .detail-page-${kind}`).waitFor();
      assert.equal(await page.locator('#modal-root > *').count(), 0);
      assert.equal(await page.locator('[role="dialog"], .modal-backdrop').count(), 0);
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.equal(await page.locator('.bottom-nav').isVisible(), false);
    };
    await page.locator('.plant-card').click();
    await assertPage('plant');
    assert.ok(page.url().endsWith('#plants/p%2F%E4%B8%AD%E6%96%87/info'));
    assert.equal(await page.locator('#app .v46-detail-tokens').count(), 1);
    assert.equal(await page.locator('#app .v48-detail-help').count(), 1);
    await page.locator('[data-action="v2-plant-tab"][data-tab="logs"]').click();
    assert.ok(page.url().endsWith('/logs'));
    await page.reload({ waitUntil: 'domcontentloaded' }); await assertPage('plant');
    assert.equal(await page.locator('[data-tab="logs"]').getAttribute('aria-selected'), 'true');
    await page.goBack(); await page.locator('.plant-card').waitFor();
    assert.ok(page.url().endsWith('#plants'));
    await page.goForward(); await assertPage('plant');
    await page.locator('[data-action="edit-plant"]').first().click();
    await page.locator('#plant-form').waitFor();
    await page.locator('#modal-root [data-action="close-modal"]').first().click();
    await assertPage('plant');
    await page.locator('[data-action="edit-plant"]').first().click();
    await page.locator('#plant-form [name="name"]').fill('更新的银杏');
    await page.locator('#plant-form [type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('.v3-detail-cover-bottom h2')?.textContent === '更新的银杏');
    await assertPage('plant');
    await page.locator('[data-action="page-back"]').click();
    await page.locator('.plant-card').waitFor();
    await page.evaluate(() => go('atlas'));
    await page.locator('.v56-group-card').click(); await assertPage('record');
    assert.ok(page.url().endsWith('#atlas/s1'));
    assert.equal(await page.locator('#app .v56-map-section').count(), 0);
    assert.ok((await page.locator('#app').innerText()).includes('植物园'));
    await page.screenshot({ path: `/tmp/yiyu-pages-${width}-record.png`, fullPage: true });
    await page.locator('[data-action="v56-add-record"]').click();
    await page.locator('#sighting-form [name="notes"]').fill('新增一条观察');
    await page.locator('#sighting-form [type="submit"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.v56-visit').length === 2);
    await assertPage('record');
    await page.locator('[data-action="v56-open-guide"]').click(); await assertPage('guide');
    assert.match(page.url(), /#atlas\/[^/]+\/encyclopedia$/);
    await page.goBack(); await assertPage('record');
    await page.goForward(); await assertPage('guide');
    await page.locator('[data-action="page-back"]').click(); await assertPage('record');
    await page.locator('[data-action="page-back"]').click();
    await page.locator('.v56-group-card').waitFor();
    assert.ok(page.url().endsWith('#atlas'));
    assert.equal(await page.locator('.bottom-nav').isVisible(), width === 390);
    // A directly opened page with no prior in-app history has a safe return path.
    await page.evaluate(() => { history.replaceState(null, '', '#plants/p%2F%E4%B8%AD%E6%96%87/photos'); });
    await page.reload({ waitUntil: 'domcontentloaded' }); await assertPage('plant');
    await page.locator('[data-action="page-back"]').click(); await page.locator('.plant-card').waitFor();
    // Deleted and malformed deep links return to a usable list.
    await page.goto(base + '#plants/deleted/info', { waitUntil: 'domcontentloaded' });
    await page.locator('.plant-card').waitFor();
    assert.ok(page.url().endsWith('#plants'));
    await page.goto(base + '#atlas/%E0%A4%A', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof state === 'object' && state && ui.tab === 'home' && !document.body.classList.contains('detail-page-open'));
    assert.deepEqual(errors, []);
    console.log(`${width}px: document pages, tabs, deep links, reload, back/forward, edit, observations and guide return passed`);
    await context.close();
  }
} finally { await browser.close(); }
