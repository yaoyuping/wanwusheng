import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const base = process.env.YIYU_TEST_URL || 'http://127.0.0.1:8013/';
const article = { name: '银杏', latin: 'Ginkgo biloba', family: '银杏科', genus: '银杏属', summary: '已保存的银杏百科。', sections: { morphology: '叶片呈扇形。', distribution: '适宜温带气候。', cultivation: '喜光，保持排水良好。', uses: '观赏树种。', culture: '常见于庭院。', similar: '观察叶形及枝条。' } };
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [];
  let mode = 'success', calls = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/status', route => route.fulfill({ json: { ready: true, deepseek: true } }));
  await page.route('**/api/ai', async route => {
    calls++;
    assert.equal(route.request().postDataJSON().format, 'encyclopedia');
    switch (mode) {
      case 'network': return route.abort('failed');
      case 'disabled': return route.fulfill({ status: 402, contentType: 'text/plain', headers: { 'x-vercel-error': 'DEPLOYMENT_DISABLED' }, body: 'Payment required\nDEPLOYMENT_DISABLED' });
      case 'unauthorized': return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      case 'html': return route.fulfill({ contentType: 'text/html', body: '<html>Sign in</html>' });
      case 'upstream': return route.fulfill({ status: 502, json: { error: '模型服务暂不可用，请稍后重试。' } });
      default: return route.fulfill({ json: { encyclopedia: { ...article, summary: '更新成功的银杏百科。' } } });
    }
  });
  await page.goto(base);
  await page.waitForFunction(() => typeof state === 'object' && state);
  await page.evaluate(async article => {
    state.sightings = [{ id: 's', name: article.name, latin: article.latin, date: stamp(), notes: '观察记录。' }];
    state.encyclopediaEntries = { 'latin:ginkgo biloba': article };
    await save(); go('atlas'); sightingDetail('s');
  }, article);
  await page.locator('[data-action="v56-open-guide"]').click();
  await page.locator('.v54-chapters').waitFor();
  assert.equal(calls, 0, 'Opening an existing encyclopedia does not request AI');
  const refresh = page.locator('[data-action="v56-refresh-guide"]');
  const alert = page.locator('#v56-guide-content [role="alert"]');
  for (const [failure, message] of [
    ['network', /无法连接 AI 后端/],
    ['disabled', /Vercel 已停用 AI 后端/],
    ['unauthorized', /访问口令未设置或已失效/],
    ['html', /服务没有返回有效数据/],
    ['upstream', /模型服务暂不可用/]
  ]) {
    mode = failure; const before = calls;
    await refresh.click();
    await alert.waitFor();
    assert.match(await alert.innerText(), message, failure);
    assert.equal(calls, before + 1, 'A failed refresh makes no automatic retry');
    assert.ok(await refresh.isEnabled());
    assert.match(await page.locator('.v54-summary').innerText(), /已保存的银杏百科/);
    assert.match(await page.locator('#v57-cache-state').innerText(), /已保存的百科仍可阅读/);
    assert.deepEqual(await page.evaluate(() => state.encyclopediaEntries['latin:ginkgo biloba']), article);
  }

  await context.setOffline(true);
  mode = 'network';
  await refresh.click(); await alert.waitFor();
  assert.match(await alert.innerText(), /当前设备未联网/);
  assert.match(await page.locator('.v54-summary').innerText(), /已保存的银杏百科/);
  await context.setOffline(false);

  // A request that never resolves must release the refresh button after the
  // configured timeout. Use the browser clock so no real 70-second wait is needed.
  await page.clock.install();
  await page.evaluate(() => {
    window.testOriginalFetch = window.fetch;
    window.fetch = (input, init) => {
      if (!String(input).includes('/api/')) return window.testOriginalFetch(input, init);
      window.testPendingRequest = String(input);
      return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')), { once: true }));
    };
  });
  await refresh.click();
  await page.waitForFunction(() => window.testPendingRequest?.endsWith('/api/ai'));
  assert.ok(await refresh.isDisabled());
  await page.clock.fastForward(70001);
  await alert.waitFor();
  assert.match(await alert.innerText(), /服务响应超时/);
  assert.ok(await refresh.isEnabled());
  assert.deepEqual(await page.evaluate(() => state.encyclopediaEntries['latin:ginkgo biloba']), article);
  await page.evaluate(() => { window.testStatusPromise = v2status(); });
  await page.clock.fastForward(15001);
  const status = await page.evaluate(async () => { const s = await window.testStatusPromise; return { offline: s.offline, label: yiyuApiStatusLabel(s) }; });
  assert.equal(status.offline, true); assert.match(status.label, /服务响应超时/);
  await page.evaluate(() => { window.fetch = window.testOriginalFetch; });
  await page.clock.resume();

  mode = 'success';
  await refresh.click();
  await page.waitForFunction(() => document.querySelector('.v54-summary')?.textContent.includes('更新成功'));
  const beforeReload = calls;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => state?.encyclopediaEntries?.['latin:ginkgo biloba']?.summary.includes('更新成功'));
  await page.evaluate(() => { go('atlas'); sightingDetail('s'); });
  await page.locator('[data-action="v56-open-guide"]').click();
  await page.locator('.v54-chapters').waitFor();
  assert.equal(calls, beforeReload, 'Successful retry persists and reopening uses local cache');
  assert.match(await page.locator('.v54-summary').innerText(), /更新成功/);
  assert.equal(await alert.count(), 0);

  // First-time failure has the same actionable message, with no cached article
  // to replace; retry generates and saves the first encyclopedia normally.
  await page.evaluate(() => { delete state.encyclopediaEntries['latin:ginkgo biloba']; });
  mode = 'network'; await page.evaluate(() => yiyuRenderGuide('s'));
  assert.match(await alert.innerText(), /无法连接 AI 后端/);
  assert.equal(await page.locator('.v54-chapters').count(), 0);
  assert.match(await page.locator('#v57-cache-state').innerText(), /生成未完成/);
  mode = 'success'; await refresh.click();
  await page.locator('.v54-chapters').waitFor();
  assert.ok(await refresh.isEnabled());
  assert.deepEqual(errors, []);
  console.log('Encyclopedia: cached/first-time failures, offline/CORS, disabled deployment, credentials, invalid response, API errors, request/status timeouts, retry and persistence passed');
  await context.close();
} finally { await browser.close(); }
