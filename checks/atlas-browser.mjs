import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = process.env.YIYU_TEST_URL || 'http://127.0.0.1:8000/';
const output = process.env.YIYU_BROWSER_OUTPUT || join(tmpdir(), 'yiyu-atlas-check');
const photo = 'data:image/png;base64,' + readFileSync(join(root, 'icon-192.png')).toString('base64');
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const guide = { name: '无患子', latin: 'Sapindus mukorossi', family: '无患子科', genus: '无患子属', aliases: ['洗手果'], keywords: ['羽状复叶', '皂苷', '排水'], summary: '无患子是落叶乔木，果皮含皂苷。', evidence: '照片显示了果实，但这段不应进入百科页。', uncertain: false, sections: { morphology: '羽状复叶，果实成熟时呈黄褐色。', distribution: '见于温暖地区，具体分布须核对植物志。', cultivation: '宜有充足光照、排水良好的介质；检查土壤干湿后浇水。', uses: '果皮含皂苷，可作传统洗涤材料。', culture: '文化资料需要与可靠记载核对。', similar: '对比复叶结构、花序和果实特征。' } };
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  for (const [device, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage(), errors = []; let guideRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ body: tile, contentType: 'image/png' }));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true, deepseek: true, species: true } }));
    await page.route('**/api/ai', route => {
      guideRequests++;
      const body = route.request().postDataJSON();
      assert.equal(body.mode, 'species'); assert.equal(body.format, 'encyclopedia'); assert.equal(Boolean(body.image), false);
      return route.fulfill({ json: { model: 'deepseek-flash', encyclopedia: guide, answer: '百科正文' } });
    });
    await page.goto(base);
    await page.waitForFunction(() => typeof state === 'object' && state !== null);
    await page.evaluate(async image => {
      state.sightings = [
        { id: 's1', name: '无患子', latin: 'Sapindus mukorossi', date: '2026-10-18', location: '普陀山风景区', lat: 30.113, lon: 122.39, notes: '第一次见到金黄的果实。', image },
        { id: 's2', name: '无患子', latin: 'Sapindus mukorossi', date: '2026-10-20', location: '植物园', lat: 30.274, lon: 120.155, notes: '树下有落果 <img src=x onerror="window.injected=true">。\n\n【AI 植物百科草稿】\n旧照片描述不应作为备注展示。', image },
        { id: 's3', name: '银杏', latin: 'Ginkgo biloba', date: '2026-10-19', location: '街角', lat: 31.23, lon: 121.47, notes: '叶片开始变黄。', image }
      ];
      await save(); ui.tab = 'atlas'; render();
    }, photo);
    await page.locator('#v56-atlas-map .v56-pin').first().waitFor();
    assert.equal(await page.locator('.v56-group-card').count(), 2);
    assert.equal(await page.locator('#v56-atlas-map .v56-pin').count(), 3);
    assert.equal(await page.locator('.v50-atlas').getByText('植物小百科').count(), 0);
    await page.screenshot({ path: join(output, `${device}-atlas-map.png`) });
    await page.locator('.v56-group-card').filter({ hasText: '无患子' }).click();
    assert.equal(await page.locator('.v56-record-page .v56-visit').count(), 2);
    assert.equal(await page.locator('.v56-record-page .v56-place-card').count(), 2);
    assert.equal(await page.locator('#v56-record-map .v56-pin').count(), 2);
    assert.ok((await page.locator('.v56-record-page').innerText()).includes('第一次见到金黄的果实'));
    assert.equal(await page.locator('.v56-record-page .v54-guide').count(), 0);
    assert.equal(await page.locator('.v56-visit-note img').count(), 0);
    assert.equal(await page.evaluate(() => Boolean(window.injected)), false);
    await page.screenshot({ path: join(output, `${device}-group-record.png`) });
    await page.locator('[data-action="v56-open-guide"]').click();
    await page.locator('#v56-guide-content .v54-chapters').waitFor();
    assert.equal(guideRequests, 1);
    assert.equal(await page.locator('#v56-guide-content .v54-chapters details').count(), 6);
    assert.equal(await page.locator('#v56-guide-content mark').count() > 0, true);
    assert.ok((await page.locator('#v56-guide-content .v54-aliases').innerText()).includes('洗手果'));
    assert.ok((await page.locator('#v56-guide-content .v56-taxonomy').innerText()).includes('Sapindus mukorossi'));
    assert.equal((await page.locator('#v56-guide-content').innerText()).includes('照片显示'), false);
    await page.screenshot({ path: join(output, `${device}-encyclopedia.png`) });
    await page.locator('[data-action="v56-back-record"]').click();
    await page.locator('[data-action="v56-open-guide"]').click();
    assert.equal(guideRequests, 1);
    const backup = await page.evaluate(async () => JSON.parse(await (await yiyuBuildFile()).file.text()));
    assert.equal(backup.encyclopediaEntries['latin:sapindus mukorossi'].name, '无患子');
    await page.locator('[data-action="v56-back-record"]').click();
    await page.locator('[data-action="v56-add-record"]').click();
    assert.equal(await page.locator('#sighting-form [name="name"]').inputValue(), '无患子');
    assert.equal(await page.locator('#sighting-form [name="latin"]').inputValue(), 'Sapindus mukorossi');
    await page.locator('#sighting-form [name="location"]').fill('第二次植物园');
    await page.locator('#sighting-form [name="date"]').fill('2026-10-21');
    await page.locator('#sighting-form [name="notes"]').fill('看到了树上的新果实。');
    await page.locator('#sighting-form [type="submit"]').click();
    await page.waitForFunction(() => state.sightings.length === 4);
    assert.equal(await page.locator('.v56-group-card').count(), 2);
    await page.locator('.v56-group-card').filter({ hasText: '无患子' }).click();
    assert.equal(await page.locator('.v56-record-page .v56-visit').count(), 3);
    assert.ok((await page.locator('.v56-record-page').innerText()).includes('看到了树上的新果实'));
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    console.log(`${device}: grouped sightings, atlas/group maps, add record, notes, separate guide, highlights and backup passed`);
    await context.close();
  }
} finally { await browser.close(); }
