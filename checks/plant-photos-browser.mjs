import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const { chromium } = await import('/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
const legacyImage = 'data:image/png;base64,' + readFileSync(new URL('../icon-180.png', import.meta.url)).toString('base64');
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true } }));
    await page.goto(process.env.YIYU_TEST_URL || 'http://127.0.0.1:8010/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => state?.plants);
    await page.evaluate(async image => {
      state.plants = [{ id: 'p/中文', name: '鸟巢蕨', image, logs: [
        { date: v2plusDate(stamp(), -1), action: '生长观察', image, note: '旧照片，没有记录 ID' },
        { date: stamp(), action: '浇水', note: '没有照片的记录' }
      ] }];
      await save(); go('plants'); plantDetail('p/中文', 'logs');
    }, legacyImage);
    const viewer = page.locator('#v57-lightbox');
    const viewImage = page.locator('.v57-lightbox-image img');
    const thumbnails = page.locator('[data-action="v57-view-plant-photo"]');
    assert.equal(await thumbnails.count(), 1);
    await thumbnails.first().click();
    assert.equal(await viewer.getAttribute('aria-label'), '养护照片');
    assert.equal(await viewImage.getAttribute('src'), legacyImage);
    assert.equal(await page.locator('.v57-lightbox-count').innerText(), '1 / 1');
    assert.equal(await page.locator('[data-action="v57-next-photo"]').isDisabled(), true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.keyboard.press('Escape');
    assert.equal(await viewer.count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(await thumbnails.first().evaluate(button => button === document.activeElement), true);

    // Follow the actual camera-record form, then reopen the saved photograph.
    await page.locator('[data-action="v3-action-sheet"]').click();
    await page.locator('[data-action="v3-quick-log"][data-type="拍照"]').click();
    await page.locator('#log-form [name="photo"]').setInputFiles(fileURLToPath(new URL('../icon-512.png', import.meta.url)));
    await page.locator('#log-form [name="note"]').fill('新拍的照片');
    await page.locator('#log-form [type="submit"]').click();
    await page.locator('#log-form').waitFor({ state: 'hidden' });
    const saved = await page.evaluate(() => ({ ...state.plants[0].logs.find(log => log.note === '新拍的照片') }));
    await page.locator('[data-action="v2-plant-tab"][data-tab="logs"]').click();
    const newPhoto = page.locator(`[data-action="v57-view-plant-photo"][data-log-id="${saved.id}"]`);
    assert.equal(await thumbnails.count(), 2);
    await newPhoto.click();
    assert.equal(await viewImage.getAttribute('src'), saved.image);
    assert.equal(await page.locator('.v57-lightbox-count').innerText(), '1 / 2');
    await page.waitForFunction(() => document.querySelector('.v57-lightbox-image img')?.naturalWidth > 0);
    assert.equal(await viewImage.evaluate(img => getComputedStyle(img).objectFit), 'contain');
    const bounds = await viewImage.boundingBox(); assert.ok(bounds.width <= width && bounds.height <= 950);
    await page.screenshot({ path: `/tmp/wanwusheng-plant-photo-${width}.png` });
    await page.locator('[data-action="v57-next-photo"]').click();
    assert.equal(await viewImage.getAttribute('src'), legacyImage);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await viewImage.getAttribute('src'), saved.image);
    await page.locator('.v57-lightbox-close').click();
    assert.equal(await page.locator('[data-tab="logs"]').getAttribute('aria-selected'), 'true');

    // The album uses the same stored images and the clicked image's position.
    await page.locator('[data-action="v2-plant-tab"][data-tab="photos"]').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await thumbnails.nth(1).click();
    assert.equal(await viewImage.getAttribute('src'), legacyImage);
    assert.equal(await page.locator('.v57-lightbox-count').innerText(), '2 / 2');
    await page.locator('[data-action="v57-prev-photo"]').click();
    assert.equal(await viewImage.getAttribute('src'), saved.image);
    await page.locator('.v57-lightbox-shade').click({ position: { x: 5, y: 5 } });
    assert.equal(await viewer.count(), 0);
    assert.equal(await page.locator('[data-tab="photos"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => state.plants[0].logs.length), 3, 'Viewing never mutates care records');
    assert.equal(await page.evaluate(() => state.plants[0].logs.find(log => log.note === '新拍的照片').image), saved.image);
    assert.deepEqual(errors, []);
    console.log(`${width}px: legacy and newly uploaded care photos, album, persistence, correct image selection, previous/next, close/focus and uncropped viewing passed`);
    await context.close();
  }
} finally { await browser.close(); }
