import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const { chromium } = await import('/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
let holdEntry = false, heldEntries = 0, nextRelease = false;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (!url.pathname.startsWith('/wanwusheng/')) { response.writeHead(404).end(); return; }
  const relative = url.pathname.slice('/wanwusheng/'.length) || 'index.html';
  const path = resolve(root, relative);
  if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { response.writeHead(403).end(); return; }
  if (holdEntry && relative === 'index.html') { heldEntries++; return; }
  try {
    let body = await readFile(path);
    if (nextRelease && relative === 'sw.js') body = Buffer.from(body.toString().replace(/const CACHE='([^']+)'/, "const CACHE='$1-update-test'"));
    if (nextRelease && relative === 'index.html') body = Buffer.from(body.toString().replace('<html lang="zh-CN">', '<html lang="zh-CN" data-test-release="updated">'));
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/wanwusheng/`;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Shanghai' });
  context.setDefaultTimeout(10000);
  let fontRequests = 0;
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, () => { fontRequests++; return new Promise(() => {}); });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  let page = await context.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForFunction(() => state?.plants && document.querySelector('#app')?.children.length);
  assert.equal(fontRequests, 0, 'Startup must not wait for Google Fonts');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8;
    canvas.getContext('2d').fillRect(0, 0, 8, 8);
    state.plants = [{ id: 'offline-plant', name: '离线绿萝', interval: 7, lastWatered: stamp(), image: canvas.toDataURL('image/png'), logs: [] }];
    state.tasks = []; state.sightings = []; await save();
  });
  const image = await page.evaluate(() => state.plants[0].image);
  await page.close();

  // The network remains online but the entry document never responds.
  holdEntry = true;
  page = await context.newPage();
  const slowResponse = await page.goto(base + '?slow-network=1#plants', { waitUntil: 'domcontentloaded', timeout: 5000 });
  assert.equal(slowResponse.fromServiceWorker(), true);
  await page.locator('.plant-card h3').filter({ hasText: '离线绿萝' }).waitFor({ timeout: 5000 });
  assert.equal(heldEntries, 0, 'An installed app must not wait for an entry request');
  await page.close();
  holdEntry = false;

  // Reopen with all networking disabled; read and edit the existing local data.
  await context.setOffline(true);
  page = await context.newPage();
  const offlineResponse = await page.goto(base + '#plants', { waitUntil: 'domcontentloaded', timeout: 5000 });
  assert.equal(offlineResponse.fromServiceWorker(), true);
  await page.locator('.plant-card').click();
  await page.locator('[data-action="v3-action-sheet"]').click();
  await page.locator('[data-action="v3-quick-log"][data-type="生长观察"]').click();
  const form = page.locator('#log-form');
  assert.equal(await form.locator('[name="action"][value="生长观察"]').isChecked(), true);
  await form.locator('[name="note"]').fill('断网后记录的新叶');
  await form.locator('[type="submit"]').click();
  await form.waitFor({ state: 'hidden' });
  const logCount = await page.evaluate(() => state.plants[0].logs.length);
  assert.equal(logCount, 1);
  await page.close();
  page = await context.newPage();
  await page.goto(base + '#plants/offline-plant/logs', { waitUntil: 'domcontentloaded', timeout: 5000 });
  await page.locator('.detail-page').filter({ hasText: '断网后记录的新叶' }).waitFor({ timeout: 5000 });
  assert.equal(await page.evaluate(() => state.plants[0].image), image, 'Photos survive offline reopening');
  await page.screenshot({ path: '/tmp/wanwusheng-offline-390.png' });

  // Cache-first navigation must still pick up a complete new release on reconnect.
  await context.setOffline(false);
  nextRelease = true;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const changed = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    await reg.update(); await Promise.race([changed, new Promise((_, reject) => setTimeout(() => reject(Error('Worker update did not activate')), 10000))]);
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  assert.equal(await page.locator('html').getAttribute('data-test-release'), 'updated');
  await page.waitForFunction(() => state?.plants?.[0]?.logs?.length === 1);
  assert.equal(await page.evaluate(() => state.plants[0].logs[0].note), '断网后记录的新叶');
  assert.equal(fontRequests, 0);
  assert.deepEqual(errors, []);
  console.log('Passed: no external font dependency; instant cached launch on hanging networks; offline reopen, photo access and care edits; complete release update with local data preserved.');
  await context.close();
} finally {
  await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
