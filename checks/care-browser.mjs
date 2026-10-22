import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
 for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' }), page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/status', r => r.fulfill({ json: { ready: true } }));
  await page.goto(process.env.YIYU_TEST_URL || 'http://127.0.0.1:8003/');
  await page.waitForFunction(() => typeof state === 'object' && state !== null);
  await page.evaluate(async () => {
   const yesterday = v2plusDate(stamp(), -1);
   state.plants = [
    { id: 'p1', name: '测试绿植', lastWatered: stamp(), interval: 7, logs: [{ date: stamp(), action: '浇水', note: '最新浇水' }, { date: yesterday, action: '浇水', note: '上一次浇水' }, { date: stamp(), action: '观察', note: '相同内容' }, { date: stamp(), action: '观察', note: '相同内容' }] },
    { id: 'p2', name: '自动检查植物', lastWatered: v2plusDate(stamp(), -7), interval: 1, logs: [] }
   ];
   state.tasks = [{ id: 't1', type: '施肥', name: '未完成任务', date: stamp(), done: false }, { id: 't2', type: '修剪', name: '已完成任务', date: stamp(), done: true }];
   await save(); ui.tab = 'plants'; render(); plantDetail('p1', 'logs');
  });
  assert.equal(await page.evaluate(() => new Set(state.plants[0].logs.map(l => l.id)).size), 4);
  const latestId = await page.evaluate(() => state.plants[0].logs[0].id);
  const button = page.locator(`[data-action="v59-delete-log"][data-log-id="${latestId}"]`);
  page.once('dialog', d => d.dismiss()); await button.click();
  assert.equal(await page.evaluate(() => state.plants[0].logs.length), 4);
  page.once('dialog', d => d.accept()); await button.click();
  await page.locator('[data-action="v59-undo"]').waitFor();
  assert.equal(await page.evaluate(() => state.plants[0].lastWatered), await page.evaluate(() => v2plusDate(stamp(), -1)));
  await page.locator('[data-action="v59-undo"]').click();
  await page.waitForFunction(() => state.plants[0].logs.length === 4);
  assert.equal(await page.evaluate(() => state.plants[0].lastWatered), await page.evaluate(() => stamp()));
  page.once('dialog', d => d.accept()); await button.click();
  await page.locator('[data-action="v59-undo"]').waitFor();
  await page.reload(); await page.waitForFunction(() => state?.plants?.length === 2);
  assert.equal(await page.evaluate(id => state.plants[0].logs.some(l => l.id === id), latestId), false);
  await page.evaluate(() => { go('care'); });
  const t1 = page.locator('[data-action="v59-delete-task"][data-id="t1"]');
  page.once('dialog', d => d.accept()); await t1.click();
  await page.locator('[data-action="v59-undo"]').waitFor();
  assert.equal(await t1.count(), 0);
  await page.locator('[data-action="v59-undo"]').click(); await t1.waitFor();
  page.once('dialog', d => d.accept()); await page.locator('[data-action="v59-delete-task"][data-id="t2"]').click();
  await page.locator('[data-action="v59-undo"]').waitFor();
  assert.equal(await page.evaluate(() => state.tasks.some(t => t.id === 't2')), false);
  const generated = page.locator('[data-action="v59-delete-task"][data-generated="1"][data-plant-id="p2"]');
  page.once('dialog', d => d.accept()); await generated.click();
  await page.locator('[data-action="v59-undo"]').waitFor();
  assert.equal(await generated.count(), 0);
  await page.reload(); await page.waitForFunction(() => state?.plants?.length === 2);
  await page.evaluate(() => { go('care'); });
  assert.equal(await generated.count(), 0);
  assert.equal(await page.evaluate(() => state.plants.some(p => p.id === 'p2')), true);
  await page.evaluate(async () => { state.plants[1].lastWatered = v2plusDate(stamp(), -3); await save(); render(); });
  assert.equal(await generated.count(), 1, 'A new watering cycle gets a new check');
  await page.evaluate(() => plantDetail('p1', 'logs'));
  const logId = await page.evaluate(() => state.plants[0].logs.find(l => l.note === '相同内容').id);
  page.once('dialog', d => d.accept()); await page.locator(`[data-action="v59-delete-log"][data-log-id="${logId}"]`).click();
  await page.locator('[data-action="v59-undo"]').waitFor();
  assert.equal(await page.evaluate(() => state.plants[0].logs.filter(l => l.note === '相同内容').length), 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: `/tmp/yiyu-v59-${width}-care.png` });
  assert.deepEqual(errors, []);
  console.log(`${width}px: delete/cancel/undo logs, recompute watering, legacy IDs, delete manual/completed/generated tasks, persistence and calendar deletion passed`);
  await context.close();
 }
} finally { await browser.close(); }
