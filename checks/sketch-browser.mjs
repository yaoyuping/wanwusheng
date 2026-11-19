import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { chromium } = await import('/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const photo = 'data:image/png;base64,' + readFileSync(new URL('../icon-192.png', import.meta.url)).toString('base64');
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 900 }, timezoneId: 'Asia/Shanghai', serviceWorkers: 'block', reducedMotion: 'reduce', locale: 'zh-CN' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-19T04:00:00Z'));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true } }));
    await page.goto(process.env.YIYU_TEST_URL || 'http://127.0.0.1:8012/');
    await page.waitForFunction(() => typeof state === 'object' && state !== null);
    await page.evaluate(async image => {
      state.plants = [{ id: 'plant', name: '花叶万年青与窗边的新叶', image, interval: 3, lastWatered: stamp(), logs: [{ id: 'photo-log', date: stamp(), action: '拍照', time: '09:05', note: '新叶舒展开了。', image }] }];
      state.tasks = [
        { id: 'overdue', type: '修剪', name: '修剪黄叶', date: '2026-11-10', done: false },
        { id: 'today', type: '施肥', plantId: 'plant', date: stamp(), done: false, note: '稀释后沿着盆边慢慢浇。' },
        { id: 'completed', type: '生长观察', date: stamp(), done: true },
        { id: 'tomorrow', type: '拍照', plantId: 'plant', date: '2026-11-20', done: false }
      ];
      await save(); go('care');
    }, photo);
    const dates = () => page.locator('.sk-week-day').evaluateAll(nodes => nodes.map(node => node.dataset.day));
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}px must fit the viewport`);
    assert.deepEqual(await dates(), ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
    assert.equal(await page.locator('.sk-week-day.selected small').innerText(), '十一');
    assert.ok(await page.locator('.sk-day[data-day="2026-11-10"]').isVisible(), 'Older unfinished tasks remain visible');
    assert.equal(await page.locator('.sk-task-photo img').first().getAttribute('src'), photo);
    await noOverflow();
    const circle = page.locator('[role="checkbox"][data-id="today"]');
    const bounds = await circle.boundingBox();
    assert.ok(bounds.width >= 44 && bounds.height >= 44, 'Completion has a 44px touch target');
    await circle.click();
    await page.waitForFunction(() => state.tasks.find(task => task.id === 'today').done);
    await page.locator('[data-action="sk-filter-pending"]').click();
    assert.equal(await page.locator('.sk-task.is-done, .sk-log').count(), 0);
    assert.equal(await page.locator('.sk-task.is-overdue').count(), 1);
    await page.locator('[data-action="sk-filter-pending"]').click();
    await page.locator('.sk-log-photo').click();
    await page.locator('#v57-lightbox').waitFor();
    assert.equal(await page.locator('.v57-lightbox-image img').getAttribute('src'), photo);
    await page.locator('.v57-lightbox-close').click();
    await page.locator('.sk-week-day[data-day="2026-11-20"]').click();
    assert.equal(await page.locator('.sk-day.is-selected').getAttribute('data-day'), '2026-11-20');
    assert.equal(await page.locator('.sk-day[data-day="2026-11-10"]').count(), 0);
    await page.locator('.sk-add-task').click();
    assert.equal(await page.locator('#v2-task-form [name="date"]').inputValue(), '2026-11-20');
    await page.locator('#v2-task-form [name="type"]').selectOption('换盆');
    await page.locator('#v2-task-form [name="plantId"]').selectOption('plant');
    await page.locator('#v2-task-form [name="note"]').fill('备好疏松的新土。');
    await page.locator('#v2-task-form [type="submit"]').click();
    await page.waitForFunction(() => state.tasks.some(task => task.type === '换盆' && task.date === '2026-11-20'));
    await page.locator('#v2-task-form').waitFor({ state: 'hidden' });
    assert.ok((await page.locator('.sk-day.is-selected').innerText()).includes('换盆'));
    await page.locator('[data-action="v2-month-today"]').click();
    await page.locator('[data-action="sk-next-week"]').click();
    assert.equal((await dates())[0], '2026-11-23');
    await page.locator('[data-action="sk-prev-week"]').click();
    assert.equal(await page.locator('.sk-week-day.selected').getAttribute('data-day'), '2026-11-19');
    await page.locator('[data-action="sk-toggle-month"]').click();
    await page.locator('#sk-month-input').fill('2028-02');
    await page.locator('[data-action="v2-month-next"]').click();
    assert.equal(await page.locator('#sk-month-input').inputValue(), '2028-03');
    await page.locator('[data-action="v2-month-prev"]').click();
    assert.equal(await page.locator('#sk-month-input').inputValue(), '2028-02');
    await noOverflow();
    const calendar = await page.locator('.sk-calendar').boundingBox();
    assert.ok(calendar.height <= page.viewportSize().height - 95, 'Expanded months fit short phone screens');
    await page.locator('.sk-month-grid [data-day="2028-02-29"]').click();
    assert.equal(await page.locator('.sk-week-day.selected').getAttribute('data-day'), '2028-02-29');
    assert.equal((await dates())[0], '2028-02-28');
    assert.equal((await dates())[6], '2028-03-05');
    assert.equal(await page.locator('#sk-month-panel').isVisible(), false);
    await page.locator('[data-action="sk-toggle-month"]').click();
    await page.locator('#sk-month-input').fill('2026-12');
    await page.locator('.sk-month-grid [data-day="2026-12-31"]').click();
    await page.locator('[data-action="sk-next-week"]').click();
    assert.equal(await page.locator('.sk-week-day.selected').getAttribute('data-day'), '2027-01-07');
    await page.locator('[data-action="v2-month-today"]').click();
    await page.screenshot({ path: `/tmp/wanwusheng-sketch-calendar-${width}.png` });
    await noOverflow();
    for (const tab of ['home', 'plants', 'recognize', 'settings']) {
      await page.evaluate(value => go(value), tab);
      assert.equal(await page.locator('body.sk-care-open').count(), 0);
      await noOverflow();
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => state?.plants?.[0]?.id === 'plant');
    assert.equal(await page.evaluate(() => state.tasks.find(task => task.id === 'today').done), true);
    assert.ok(await page.evaluate(() => state.tasks.some(task => task.type === '换盆' && task.date === '2026-11-20')));
    assert.deepEqual(errors, []);
    console.log(`${width}px: weekly dates/lunar labels, overdue tasks, completion/filter, photos, dated task creation, month/leap-year/year navigation, mobile fit and persistence passed`);
    await context.close();
  }
} finally { await browser.close(); }
