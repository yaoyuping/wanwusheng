import assert from 'node:assert/strict';
const { chromium } = await import('/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'Asia/Shanghai', serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true } }));
    await page.goto(process.env.YIYU_TEST_URL || 'http://127.0.0.1:8007/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof state === 'object' && state !== null);
    await page.evaluate(async () => {
      state.plants = [{ id: 'check-plant', name: '检查植物', lastWatered: v2plusDate(stamp(), -2), interval: 1, logs: [] }];
      state.tasks = [{ id: 'task-1', type: '施肥', name: '手动任务', date: stamp(), done: false }];
      await save(); go('care');
    });
    const circle = page.locator('[role="checkbox"][data-action="v2-toggle-task"][data-id="task-1"]');
    const checkCircle = page.locator('[role="checkbox"][data-action="v59-toggle-check"]');
    await circle.click();
    await page.waitForFunction(() => state.tasks[0].done === true);
    await page.waitForFunction(() => document.querySelector('[role="checkbox"][data-id="task-1"]')?.getAttribute('aria-checked') === 'true');
    assert.equal((await page.evaluate(() => yiyuPush.items())).filter(item => item.kind === 'task').length, 0);
    await page.locator('.v2-text-button[data-action="v2-toggle-task"]').click();
    await page.waitForFunction(() => state.tasks[0].done === false);
    assert.equal((await page.evaluate(() => yiyuPush.items())).filter(item => item.kind === 'task').length, 1);
    const watered = await page.evaluate(() => state.plants[0].lastWatered);
    await checkCircle.click();
    await page.waitForFunction(() => document.querySelector('[role="checkbox"][data-action="v59-toggle-check"]')?.getAttribute('aria-checked') === 'true');
    assert.equal(await page.evaluate(() => state.plants[0].lastWatered), watered);
    assert.deepEqual(await page.evaluate(() => state.plants[0].logs.map(log => log.action)), ['检查盆土']);
    assert.equal((await page.evaluate(() => yiyuPush.items())).find(item => item.kind === 'water').date, await page.evaluate(() => v2plusDate(stamp(), 1)));
    await page.evaluate(() => go('home'));
    assert.equal(await page.locator('.v50-count').innerText(), '1', 'Completed inspections leave the home pending count');
    await page.evaluate(() => go('care'));
    await page.locator('.v2-text-button[data-action="v59-toggle-check"]').click();
    await page.waitForFunction(() => !yiyuCare.checked(state.plants[0]));
    assert.equal(await page.evaluate(() => state.plants[0].logs.length), 0);
    assert.ok((await page.evaluate(() => yiyuPush.items())).find(item => item.kind === 'water').date <= await page.evaluate(() => stamp()));
    await page.locator('.v2-text-button[data-action="v59-toggle-check"]').click();
    await page.waitForFunction(() => yiyuCare.checked(state.plants[0]));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof state === 'object' && state?.plants?.[0]?.id === 'check-plant');
    await page.evaluate(() => go('care'));
    assert.equal(await checkCircle.getAttribute('aria-checked'), 'true', 'Completion survives reloading');
    const record = page.locator('[data-action="v59-delete-log"]');
    page.once('dialog', dialog => dialog.accept()); await record.click();
    await page.locator('[data-action="v59-undo"]').waitFor();
    assert.equal(await checkCircle.getAttribute('aria-checked'), 'false');
    await page.locator('[data-action="v59-undo"]').click();
    await page.waitForFunction(() => yiyuCare.checked(state.plants[0]));
    assert.equal(await page.evaluate(() => state.plants[0].lastWatered), watered);
    const size = await checkCircle.boundingBox(); assert.ok(size.width >= 44 && size.height >= 44);
    await page.screenshot({ path: `/tmp/wanwusheng-completion-${width}.png` });
    await page.evaluate(() => {
      const tomorrow = v2plusDate(stamp(), 1);
      stamp = () => tomorrow;
      ui.selectedDay = tomorrow; ui.calendarMonth = tomorrow.slice(0, 7); render();
    });
    assert.equal(await checkCircle.getAttribute('aria-checked'), 'false', 'An inspection is due again the next day without recording water');
    assert.equal((await page.evaluate(() => yiyuPush.items())).find(item => item.kind === 'water').date, await page.evaluate(() => stamp()), 'The server already has tomorrow’s date, even if the app stays closed');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    console.log(`${width}px: manual/automatic checkbox and complete/reopen, persistence, check log undo, home count, next-day closed-app reminders passed`);
    await context.close();
  }
} finally { await browser.close(); }
