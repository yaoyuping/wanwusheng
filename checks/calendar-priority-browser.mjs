import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const base = process.env.YIYU_TEST_URL || 'http://127.0.0.1:8013/';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Shanghai', serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-19T04:00:00Z'));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true } }));
    await page.goto(base); await page.waitForFunction(() => typeof state === 'object' && state);
    const seed = async () => page.evaluate(async () => {
      const today = stamp(), tomorrow = v2plusDate(today, 1), yesterday = v2plusDate(today, -1), older = v2plusDate(today, -10);
      state.plants = [{ id: 'p', name: '鸟巢蕨', interval: 1, lastWatered: today, logs: [
        { id: 'today-log', date: today, action: '浇水', careTask: 'watering', note: '今天浇过水。' },
        { id: 'old-log', date: yesterday, action: '生长观察', note: '昨天的叶片。' },
        { id: 'future-log', date: tomorrow, action: '拍照', note: '按日期查看这条记录。' }
      ] }];
      state.tasks = [
        { id: 'today-task', plantId: 'p', date: today, type: '施肥', done: false },
        { id: 'tomorrow-task', plantId: 'p', date: tomorrow, type: '拍照', done: false },
        { id: 'future-done', plantId: 'p', date: tomorrow, type: '修剪', done: true },
        { id: 'old-task', plantId: 'p', date: older, type: '检查叶片', done: false }
      ];
      await save(); go('care');
      return { today, tomorrow, yesterday, older, saved: JSON.stringify({ plants: state.plants, tasks: state.tasks }) };
    });
    const days = () => page.locator('.sk-agenda>.sk-day').evaluateAll(nodes => nodes.map(el => el.dataset.day));
    const main = await seed();
    assert.deepEqual((await days()).slice(0, 2), [main.today, main.tomorrow]);
    const today = page.locator(`#sk-day-${main.today}`), tomorrow = page.locator(`#sk-day-${main.tomorrow}`);
    assert.equal(await today.locator('[data-record-key]').count(), 1, 'Today keeps the linked watering record exactly once');
    assert.equal(await today.locator('[data-id=today-task][role=checkbox]').count(), 1);
    assert.equal(await tomorrow.locator('.sk-task').count(), 2, 'Tomorrow includes manual tasks and automatic watering checks');
    assert.equal(await tomorrow.locator('.is-done,[data-record-key]').count(), 0, 'Tomorrow preview only includes pending tasks');
    assert.ok((await days()).indexOf(main.older) > 1, 'Overdue tasks follow the two priority days');
    assert.ok((await days()).indexOf(main.yesterday) > 1, 'Earlier records follow the two priority days');
    assert.equal(await page.evaluate(() => JSON.stringify({ plants: state.plants, tasks: state.tasks })), main.saved, 'Sorting never changes stored records');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.sk-agenda-heading').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/wanwusheng-priority-${width}.png` });
    await today.locator('[data-id=today-task][role=checkbox]').click();
    await page.waitForFunction(() => state.tasks.find(t => t.id === 'today-task').done);
    assert.deepEqual((await days()).slice(0, 2), [main.today, main.tomorrow]);
    await page.locator('[data-action=sk-filter-pending]').click();
    assert.equal(await page.locator('.sk-agenda [data-record-key],.sk-agenda .is-done').count(), 0);
    assert.deepEqual((await days()).slice(0, 2), [main.today, main.tomorrow]);
    await page.locator('[data-action=sk-filter-pending]').click();
    await tomorrow.getByRole('button', { name: '查看当天全部' }).click();
    assert.equal(await tomorrow.locator('.is-done').count(), 2, 'Selecting tomorrow shows its completed task and saved photo record');
    await tomorrow.locator('.sk-plant-link').first().click();
    await page.locator('[data-action=page-back]').click();
    await tomorrow.locator('.is-done').first().waitFor();
    assert.equal(await page.locator('.sk-week-day.selected').getAttribute('data-day'), main.tomorrow, 'Returning from a plant keeps the date being reviewed');
    await page.reload(); await page.waitForFunction(() => state?.plants?.[0]?.id === 'p');
    assert.deepEqual((await days()).slice(0, 2), [main.today, main.tomorrow], 'A fresh opening starts with today even after reviewing another date');
    await page.locator('[data-action=v2-month-today]').click();
    assert.deepEqual((await days()).slice(0, 2), [main.today, main.tomorrow]);
    await page.evaluate(() => { ui.selectedDay = v2plusDate(stamp(), -30); render(); });
    await page.locator('[data-action=sk-filter-pending]').click();
    await page.evaluate(() => { go('home'); go('care'); });
    assert.equal(await page.locator('[data-action=sk-filter-pending]').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.sk-week-day.selected').getAttribute('data-day'), main.today, 'A fresh calendar visit opens today');
    await page.reload(); await page.waitForFunction(() => state?.plants?.[0]?.id === 'p');
    assert.deepEqual((await days()).slice(0, 2), [main.today, main.tomorrow]);
    // Sunday, month/year transitions, leap day and Shanghai's date before UTC midnight.
    for (const [instant, expected] of [
      ['2026-11-22T04:00:00Z', ['2026-11-22', '2026-11-23']],
      ['2026-11-30T04:00:00Z', ['2026-11-30', '2026-12-01']],
      ['2026-12-31T04:00:00Z', ['2026-12-31', '2027-01-01']],
      ['2028-02-29T04:00:00Z', ['2028-02-29', '2028-03-01']],
      ['2026-11-19T16:30:00Z', ['2026-11-20', '2026-11-21']]
    ]) {
      await page.clock.setFixedTime(new Date(instant)); await seed();
      assert.deepEqual((await days()).slice(0, 2), expected);
      assert.equal(await page.locator(`#sk-day-${expected[1]} .sk-task`).count(), 2);
    }
    await page.evaluate(() => { state.plants = []; state.tasks = []; go('care'); });
    assert.equal(await page.locator('.sk-agenda>.sk-day').count(), 2, 'Both days remain clear when empty');
    assert.ok((await page.locator('.sk-agenda').innerText()).includes('明天暂无待完成养护'));
    await page.getByRole('button', { name: '安排明天的养护' }).click();
    assert.equal(await page.locator('#v2-task-form [name=date]').inputValue(), '2026-11-21');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    console.log(`${width}px: today then pending tomorrow; history retained; completion/filter/full-day view/re-entry; week/month/year/leap-day/Shanghai-date boundaries; empty days and dated creation passed`);
    await context.close();
  }
} finally { await browser.close(); }
