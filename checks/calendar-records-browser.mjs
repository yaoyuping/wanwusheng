import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { chromium } = await import('/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const photo = 'data:image/png;base64,' + readFileSync(new URL('../icon-192.png', import.meta.url)).toString('base64');
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Shanghai', serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('yiyu-weather-location-preference-v4', JSON.stringify({ mode: 'fixed', lat: 30.274, lon: 120.155, label: '杭州' })));
    await page.clock.setFixedTime(new Date('2026-11-19T04:00:00Z'));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true } }));
    await page.goto(process.env.YIYU_TEST_URL || 'http://127.0.0.1:8012/');
    await page.waitForFunction(() => typeof state === 'object' && state !== null);
    const original = await page.evaluate(async image => {
      state.plants = ['春羽', '散尾葵', '鸟巢蕨', '观音竹', '章鱼凤梨', '栀子'].map((name, index) => ({
        id: `plant-${index}`, name, image, lastWatered: stamp(), interval: 7, reminder: false,
        // IDs may coincide between plants: the relationship is plant ID + log ID.
        logs: [{ id: 'shared-water-id', date: stamp(), time: '08:00', action: '浇水', careTask: 'watering', note: '已完成浇水', carePreviousWatered: '2026-11-17' }]
      }));
      const logs = state.plants[0].logs;
      logs[0].note = '沿盆边缓慢浇透，倒掉托盘积水。'; logs[0].image = image;
      logs.push(
        { id: 'monday-water', date: '2026-11-16', action: '浇水', careTask: 'watering', note: '保留星期一的原始记录。' },
        { id: 'tuesday-water', date: '2026-11-17', action: '浇水', careTask: 'watering', note: '叶片已经舒展，先检查盆土与托盘。'.repeat(8), image },
        { id: 'manual-a', date: '2026-11-18', action: '浇水', note: '独立手动记录' },
        { id: 'manual-b', date: '2026-11-18', action: '浇水', note: '独立手动记录' }
      );
      state.plants[1].logs.push({ id: 'older-check', date: '2026-11-18', action: '检查盆土', note: '盆土仍湿润', careCheckKey: '2026-11-19|7' });
      state.plants[2].logs.push(
        { id: 'health-note', date: '2026-11-17', time: '09:20', action: '病虫害', note: '花洒冲水驱虫，最近长了很多嫩叶。', image, weather: '晴', temperature: '18°C' },
        { id: 'feed-note', date: '2026-11-17', action: '施肥', note: '按说明稀释后施肥。' },
        { id: 'prune-note', date: '2026-11-17', action: '修剪', note: '去除枯叶。' }
      );
      state.tasks = [
        { id: 'done-manual', type: '修剪', date: stamp(), plantId: 'plant-0', done: true },
        { id: 'pending-manual', type: '施肥', date: stamp(), plantId: 'plant-0', done: false }
      ];
      await save();
      const original = JSON.stringify(state.plants.map(plant => plant.logs));
      go('care');
      return original;
    }, photo);
    const cards = page.locator('[data-record-key]');
    const record = (plantId, logId) => cards.filter({ has: page.locator(`button[data-log-id="${logId}"]:is([data-id="${plantId}"],[data-plant-id="${plantId}"])`) });
    assert.equal(await cards.count(), 14, 'Each of 14 original events is shown exactly once');
    const keys = await cards.evaluateAll(nodes => nodes.map(node => node.dataset.recordKey));
    assert.equal(new Set(keys).size, 14, 'Records are matched by plant and log, never name or date');
    assert.equal(await page.locator('.sk-task:not([data-record-key])').count(), 2, 'Unlinked manual tasks remain separate');
    assert.equal(await page.evaluate(() => JSON.stringify(state.plants.map(plant => plant.logs))), original, 'Rendering does not change old history');
    for (const [id, kind] of [['health-note', '病虫害'], ['feed-note', '施肥'], ['prune-note', '修剪']]) {
      const card = record('plant-2', id);
      assert.equal(await card.locator('.sk-task-photo img').getAttribute('src'), photo);
      assert.equal(await card.locator('.sk-care-kind').innerText(), kind);
      assert.equal(await card.locator('.sk-task-copy h3').innerText(), '鸟巢蕨');
      assert.equal(await card.locator('.sk-task-actions .sk-plant-link').count(), 1);
      assert.equal(await card.locator('.sk-task-actions .v59-delete').count(), 1);
      assert.equal(await card.locator('[role="checkbox"]').count(), 0, 'A manual record is not a task that can be reopened');
    }
    const health = record('plant-2', 'health-note');
    assert.equal(await health.locator('time').innerText(), '09:20');
    assert.ok((await health.innerText()).includes('花洒冲水驱虫，最近长了很多嫩叶。'));
    assert.ok((await health.innerText()).includes('晴 · 18°C'));
    await health.locator('.sk-log-photo').click();
    await page.locator('#v57-lightbox').waitFor();
    assert.equal(await page.locator('.v57-lightbox-image img').getAttribute('src'), photo);
    await page.locator('.v57-lightbox-close').click();
    await health.locator('.sk-plant-link').click();
    await page.locator('.detail-page').waitFor();
    await page.evaluate(() => go('care'));
    await health.evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `/tmp/wanwusheng-care-types-${width}.png` });
    page.once('dialog', dialog => dialog.accept());
    await health.locator('[data-action="v59-delete-log"]').click();
    await page.locator('[data-action="v59-undo"]').waitFor();
    assert.equal(await cards.count(), 13);
    assert.equal(await page.evaluate(() => state.plants[2].lastWatered), '2026-11-19');
    await page.locator('[data-action="v59-undo"]').click();
    await health.waitFor();
    assert.equal(await page.evaluate(() => JSON.stringify(state.plants.map(plant => plant.logs))), original);
    const watering = record('plant-0', 'shared-water-id');
    assert.equal(await watering.count(), 1);
    assert.ok((await watering.innerText()).includes('沿盆边缓慢浇透，倒掉托盘积水。'));
    assert.equal(await watering.locator('time').innerText(), '08:00');
    await watering.locator('.sk-log-photo').click();
    await page.locator('#v57-lightbox').waitFor();
    assert.equal(await page.locator('.v57-lightbox-image img').getAttribute('src'), photo);
    await page.locator('.v57-lightbox-close').click();
    assert.equal(await record('plant-1', 'older-check').locator('[data-action="v59-check-to-water"]').count(), 1);
    await page.evaluate(() => document.fonts.ready);
    const boxes = await page.locator('.sk-task,.sk-log').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom };
    }));
    for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i].top >= boxes[i - 1].bottom, 'Long notes and photos never overlap the next card');
    assert.equal(await page.locator('.sk-calendar').evaluate(el => getComputedStyle(el).position), 'relative');
    assert.ok(['static', 'relative'].includes(await page.locator('.sk-add-task').evaluate(el => getComputedStyle(el).position)), 'The add button remains in normal document flow');
    const deleteRecord = watering.locator('[data-action="v59-delete-task"]');
    await deleteRecord.evaluate(el => el.scrollIntoView({ block: 'center' }));
    assert.ok(await deleteRecord.evaluate(el => {
      const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }), 'Delete remains reachable without calendar or floating button covering it');
    assert.ok((await page.locator('.sk-calendar').boundingBox()).y < 0, 'The calendar scrolls away with the page');
    await page.screenshot({ path: `/tmp/wanwusheng-records-${width}.png` });
    page.once('dialog', dialog => dialog.accept());
    await deleteRecord.click();
    await page.locator('[data-action="v59-undo"]').waitFor();
    assert.equal(await cards.count(), 13);
    assert.equal(await record('plant-1', 'shared-water-id').count(), 1, 'Deleting one plant never removes another plant with the same log ID');
    await page.locator('[data-action="v59-undo"]').click();
    await watering.waitFor();
    assert.equal(await cards.count(), 14);
    assert.equal(await page.evaluate(() => JSON.stringify(state.plants.map(plant => plant.logs))), original);
    await page.locator('[data-action="sk-filter-pending"]').click();
    assert.equal(await cards.count(), 0);
    assert.equal(await page.locator('.sk-task').count(), 1, 'Pending filter hides all completed records');
    await page.locator('[data-action="sk-filter-pending"]').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => state?.plants?.[0]?.id === 'plant-0');
    await page.evaluate(() => go('care'));
    assert.equal(await cards.count(), 14);
    assert.equal(await page.evaluate(() => JSON.stringify(state.plants.map(plant => plant.logs))), original);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `/tmp/wanwusheng-calendar-refined-${width}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    console.log(`${width}px: historical events shown once; distinct/manual events retained; notes/photos/correction, delete/undo, filtering and persistence passed; no covering or overlapping cards`);
    await context.close();
  }
} finally { await browser.close(); }
