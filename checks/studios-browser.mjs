import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const base = process.env.YIYU_TEST_URL || 'http://127.0.0.1:8013/';
const photo = fileURLToPath(new URL('../icon-192.png', import.meta.url));
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const width of [320, 390, 820, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await context.newPage(), requests = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true, deepseek: true } }));
    await page.route('**/api/ai', route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: { answer: '根据记录，先观察盆土干湿与叶片状态。', model: 'test' } });
    });
    await page.goto(base);
    await page.waitForFunction(() => typeof state === 'object' && state !== null);
    await page.evaluate(() => {
      state.plants = [{ id: 'studio-plant', name: '鸟巢蕨', latin: 'Asplenium nidus', interval: 7, status: '健康', acquired: stamp(), logs: [] }];
      plantForm('studio-plant');
    });
    const assertDialog = async () => {
      assert.ok(await page.locator('.fl-dialog-body').evaluate(body => body.scrollWidth <= body.clientWidth + 1), 'Dialog must not scroll sideways');
      const sizes = await page.locator('.fl-dialog').evaluate(dialog => {
        const header = dialog.querySelector('.modal-header').getBoundingClientRect();
        const body = dialog.querySelector('.fl-dialog-body').getBoundingClientRect();
        const controls = [...dialog.querySelectorAll('input,select,textarea')].filter(el => el.getClientRects().length && getComputedStyle(el).opacity !== '0' && !el.classList.contains('v46-native-select'));
        return { header: header.bottom, body: body.top, fonts: controls.map(el => Number.parseFloat(getComputedStyle(el).fontSize)), right: dialog.getBoundingClientRect().right };
      });
      assert.ok(sizes.body >= sizes.header - 1, 'Scrolling content stays below the title');
      assert.ok(sizes.fonts.every(size => size >= 16), 'Inputs keep a non-zooming mobile type size');
      assert.ok(sizes.right <= width);
    };
    await assertDialog();
    await page.locator('#plant-form [name=acquired]').fill('2026-11-01');
    await page.locator('#plant-form [name=price]').fill('39.95');
    await assertDialog();
    await page.locator('.fl-dialog-body').evaluate(body => { body.scrollTop = body.scrollHeight; });
    await assertDialog();
    await page.locator('.fl-file-row button').scrollIntoViewIfNeeded();
    const chooser = page.waitForEvent('filechooser');
    await page.locator('.fl-file-row button').click();
    await (await chooser).setFiles(photo);
    await page.locator('#plant-preview img').waitFor();
    assert.equal(await page.locator('.fl-file-row>span').innerText(), 'icon-192.png');
    await page.locator('#plant-form [type=submit]').click();
    await page.waitForFunction(() => state.plants[0].price === '39.95' && state.plants[0].acquired === '2026-11-01' && state.plants[0].image);
    await page.locator('[data-action=v48-local-care]').click();
    await page.locator('.v48-library-grid>button').first().click();
    await page.locator('.v48-topic-detail').waitFor();
    await assertDialog();
    await page.locator('#modal-root [data-action=close-modal]').click();
    await page.evaluate(() => v2aiModal('studio-plant', 'care'));
    await assertDialog();
    const aiChooser = page.waitForEvent('filechooser');
    await page.locator('.v49-file-button').click();
    await (await aiChooser).setFiles(photo);
    await page.waitForFunction(() => Boolean(ui.aiImage));
    assert.equal(await page.locator('.v48-ai-media img:visible').count(), 1, 'Only one preview after selecting a photo');
    assert.equal(requests.length, 0, 'Selecting a photo never sends it to the API');
    await page.locator('.v48-ai-prompts button').first().click();
    assert.equal(await page.locator('#v2-ai-question').inputValue(), '按当前季节给我一周观察清单');
    await page.locator('.fl-dialog-body').evaluate(body => { body.scrollTop = body.scrollHeight; });
    await assertDialog();
    await page.locator('#v2-ai-run').click();
    await page.waitForFunction(() => document.querySelector('#v2-ai-result')?.textContent.includes('根据记录'));
    assert.equal(requests.length, 1);
    assert.ok(requests[0].image);
    assert.equal(requests[0].plant.name, '鸟巢蕨');
    assert.equal(requests[0].question, '按当前季节给我一周观察清单');
    await page.screenshot({ path: `/tmp/wanwusheng-studios-ai-${width}.png` });
    await page.locator('#modal-root [data-action=close-modal]').click();
    await page.evaluate(() => go('recognize'));
    await page.locator('[data-action=v51-ai-diagnose]').click();
    await page.locator('#v51-ai-plant').selectOption('studio-plant');
    assert.equal(await page.locator('#v2-ai-run').getAttribute('data-id'), 'studio-plant');
    await assertDialog();
    await page.locator('#modal-root [data-action=close-modal]').click();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, headerNeverOverlaps: true, horizontalOverflow: false, photoChooser: true, savedDatesAndDecimals: true, singleAIPreview: true, explicitSubmitOnly: true }));
    await context.close();
  }
} finally { await browser.close(); }
