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
      state.plants = [{ id: 'check-plant', name: '检查植物', lastWatered: v2plusDate(stamp(), -9), interval: 7, logs: [] }];
      state.tasks = [{ id: 'task-1', type: '施肥', name: '手动任务', date: stamp(), done: false }];
      await save(); go('care');
    });
    const circle = page.locator('[role="checkbox"][data-action="v2-toggle-task"][data-id="task-1"]');
    const checkCircle = page.locator('[role="checkbox"][data-action="v59-toggle-check"]');
    async function chooseResult(result) {
      await page.locator(`[data-action="v59-finish-care"][data-result="${result}"]`).click();
      await page.locator('#modal-root .v59-care-results').waitFor({ state: 'hidden' });
      await page.locator('[role="checkbox"][data-action="v59-toggle-check"][aria-checked="true"]').waitFor();
    }
    await circle.click();
    await page.waitForFunction(() => state.tasks[0].done === true);
    await page.waitForFunction(() => document.querySelector('[role="checkbox"][data-id="task-1"]')?.getAttribute('aria-checked') === 'true');
    assert.equal((await page.evaluate(() => yiyuPush.items())).filter(item => item.kind === 'task').length, 0);
    await page.locator('.v2-text-button[data-action="v2-toggle-task"]').click();
    await page.waitForFunction(() => state.tasks[0].done === false);
    assert.equal((await page.evaluate(() => yiyuPush.items())).filter(item => item.kind === 'task').length, 1);
    const watered = await page.evaluate(() => state.plants[0].lastWatered);
    await checkCircle.click();
    assert.equal(await page.evaluate(() => state.plants[0].logs.length), 0, 'Choosing a result does not record care yet');
    await page.locator('#modal-root [data-action="close-modal"]').last().click();
    assert.equal(await page.evaluate(() => state.plants[0].logs.length), 0, 'Cancel leaves the task pending');
    await checkCircle.click();
    await page.locator('#modal-root .modal').screenshot({ path: `/tmp/wanwusheng-care-choice-${width}.png` });
    await chooseResult('water');
    await page.waitForFunction(() => state.plants[0].logs[0]?.action === '浇水' && !document.querySelector('#modal-root .v59-care-results'));
    assert.equal(await page.evaluate(() => state.plants[0].lastWatered), await page.evaluate(() => stamp()));
    assert.equal((await page.evaluate(() => yiyuPush.items())).find(item => item.kind === 'water').date, await page.evaluate(() => v2plusDate(stamp(), 7)));
    assert.equal(await checkCircle.getAttribute('aria-checked'), 'true', 'Watering stays visible as a completed task');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => state?.plants?.[0]?.id === 'check-plant');
    await page.evaluate(() => go('care'));
    assert.equal(await checkCircle.getAttribute('aria-checked'), 'true', 'Watering completion survives reloading');
    assert.deepEqual(await page.evaluate(() => state.plants[0].logs.map(log => log.action)), ['浇水']);
    await page.locator('.v2-text-button[data-action="v59-toggle-check"]').click();
    await page.waitForFunction(() => state.plants[0].logs.length === 0);
    assert.equal(await page.evaluate(() => state.plants[0].lastWatered), watered, 'Reopening restores the original watering date even without older logs');
    await page.locator('.v2-text-button[data-action="v59-toggle-check"]').click();
    await chooseResult('check');
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
    await chooseResult('check');
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
    // The screenshot's existing inspection records can be corrected in place.
    const previousLogId = await page.evaluate(() => state.plants[0].logs[0].id);
    await page.locator('[data-action="v59-check-to-water"]').click();
    await page.locator('[data-action="v59-undo"]').waitFor();
    assert.deepEqual(await page.evaluate(() => state.plants[0].logs.map(log => log.action)), ['浇水']);
    assert.equal(await page.evaluate(() => state.plants[0].logs[0].id), previousLogId, 'Correction updates the existing record');
    assert.equal((await page.evaluate(() => yiyuPush.items())).find(item => item.kind === 'water').date, await page.evaluate(() => v2plusDate(stamp(), 7)));
    await page.locator('[data-action="v59-undo"]').click();
    await page.waitForFunction(() => yiyuCare.checked(state.plants[0]));
    assert.equal(await page.evaluate(() => state.plants[0].lastWatered), watered);
    await page.evaluate(() => plantDetail('check-plant', 'logs'));
    await page.locator('[data-action="v59-check-to-water"]').click();
    await page.locator('[data-action="v59-undo"]').waitFor();
    assert.equal(await page.evaluate(() => state.plants[0].logs[0].action), '浇水', 'Correction also works from the plant record page');
    await page.evaluate(() => go('care'));
    page.once('dialog', dialog => dialog.accept());
    await page.locator('[data-action="v59-delete-task"][data-generated="1"]').click();
    await page.locator('[data-action="v59-undo"]').waitFor();
    assert.equal(await page.evaluate(() => state.plants[0].lastWatered), watered, 'Deleting a completed watering task also restores its reminder cycle');
    await page.locator('[data-action="v59-undo"]').click();
    await page.waitForFunction(() => state.plants[0].logs[0]?.action === '浇水');
    await checkCircle.click();
    await page.waitForFunction(() => state.plants[0].logs.length === 0);
    await checkCircle.click();
    await chooseResult('check');
    await page.waitForFunction(() => yiyuCare.checked(state.plants[0]));
    const size = await checkCircle.boundingBox(); assert.ok(size.width >= 44 && size.height >= 44);
    await page.screenshot({ path: `/tmp/wanwusheng-completion-${width}.png` });
    await page.evaluate(() => {
      const tomorrow = v2plusDate(stamp(), 1);
      stamp = () => tomorrow;
      ui.selectedDay = tomorrow; ui.calendarMonth = tomorrow.slice(0, 7); render();
    });
    assert.equal(await checkCircle.getAttribute('aria-checked'), 'false', 'An inspection is due again the next day without recording water');
    assert.equal((await page.evaluate(() => yiyuPush.items())).find(item => item.kind === 'water').date, await page.evaluate(() => stamp()), 'The server already has tomorrow’s date, even if the app stays closed');
    await page.evaluate(async () => {
      const plant = state.plants[0], yesterday = v2plusDate(stamp(), -1);
      plant.lastWatered = stamp();
      plant.logs = [
        { id: 'newer-water', date: stamp(), action: '浇水' },
        { id: 'older-check', date: yesterday, action: '检查盆土', careCheckKey: `${v2plusDate(stamp(), -9)}|7`, note: '叶片舒展，原始备注', image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }
      ];
      ui.selectedDay = yesterday; await save(); render();
    });
    const older = await page.evaluate(() => ({ ...state.plants[0].logs[1] }));
    await page.locator('[data-action="v59-check-to-water"][data-log-id="older-check"]').click();
    await page.locator('[data-action="v59-undo"]').waitFor();
    const corrected = await page.evaluate(() => state.plants[0].logs.find(log => log.id === 'older-check'));
    assert.equal(corrected.action, '浇水');
    for (const key of ['date', 'note', 'image']) assert.equal(corrected[key], older[key]);
    assert.equal(await page.evaluate(() => state.plants[0].lastWatered), await page.evaluate(() => stamp()), 'Correcting an older record never moves the latest watering backwards');
    await page.locator('[data-action="v59-undo"]').click();
    await page.waitForFunction(() => state.plants[0].logs.find(log => log.id === 'older-check')?.action === '检查盆土');
    assert.deepEqual(await page.evaluate(() => state.plants[0].logs.find(log => log.id === 'older-check')), older);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    console.log(`${width}px: separate watering/inspection, correction/undo in both views, completion/reopen/delete, persistence, home count and reminder dates passed`);
    await context.close();
  }
} finally { await browser.close(); }
