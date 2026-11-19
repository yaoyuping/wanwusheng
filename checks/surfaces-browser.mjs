import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const base = process.env.YIYU_TEST_URL || 'http://127.0.0.1:8013/';
const output = join(tmpdir(), 'wanwusheng-surfaces');
mkdirSync(output, { recursive: true });
const image = 'data:image/png;base64,' + readFileSync(new URL('../icon-192.png', import.meta.url)).toString('base64');
const article = { name: '银杏', latin: 'Ginkgo biloba', family: '银杏科', genus: '银杏属', summary: '银杏是落叶乔木，叶片呈扇形。', sections: { morphology: '叶脉二叉分枝。', distribution: '适宜温带气候。', cultivation: '喜光，土壤应保持排水良好。', uses: '常见的观赏树种。', culture: '常见于庭院与寺庙。', similar: '观察叶形及枝条特征。' } };
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/status', route => route.fulfill({ json: { ready: true } }));
    await page.route('**/api/ai', route => route.fulfill({ json: { encyclopedia: article, answer: '观察盆土，保持通风。', model: 'test' } }));
    await page.goto(base);
    await page.waitForFunction(() => typeof state === 'object' && state);
    await page.evaluate(image => {
      state.plants = [{ id: 'p', name: '鸟巢蕨', latin: 'Asplenium nidus', image, location: '窗边', interval: 3, lastWatered: v2plusDate(stamp(), -4), acquired: stamp(), tags: '观叶 / 喜湿', status: '健康', notes: '窗边的一片绿。', logs: [{ id: 'l', date: stamp(), action: '病虫害', image, note: '查看叶片。' }] }];
      state.sightings = [{ id: 's', name: '银杏', image, images: [image, image], date: stamp(), notes: '秋天的叶子。', location: '公园' }];
      state.tasks = [{ id: 't', name: '查看叶片', plantId: 'p', type: '病虫害', date: stamp(), done: false }];
    }, image);
    const scenes = [
      ['home', () => go('home')], ['plants', () => go('plants')], ['atlas', () => go('atlas')],
      ['plant-info', () => plantDetail('p')], ['plant-logs', () => plantDetail('p', 'logs')], ['plant-photos', () => plantDetail('p', 'photos')],
      ['record', () => sightingDetail('s')],
      ['encyclopedia', () => { sightingDetail('s'); document.querySelector('[data-action=v56-open-guide]').click(); }, '#v56-guide-content .v54-chapters'],
      ['recognize', () => { go('recognize'); ui.v52PlantnetOpen = true; render(); }],
      ['recognition-result', () => { ui.recognitionResults = [{ score: .87, species: { commonNames: ['银杏'], scientificNameWithoutAuthor: 'Ginkgo biloba', family: { scientificName: 'Ginkgoaceae' } } }]; render(); }],
      ['deepseek', () => { ui.v52PlantnetOpen = false; ui.v53DeepSeekOpen = true; render(); }],
      ['care', () => go('care')], ['settings', () => go('settings')],
      ['plant-form', () => plantForm('p')], ['record-form', () => sightingForm('s')], ['log-form', () => newLog('p')],
      ['assistant', () => v2aiModal('p', 'care')], ['library', () => v48Knowledge('care', 'p')], ['topic', () => v48Topic('care', 'water', 'p')],
      ['city', () => v3WeatherManual()], ['task-form', () => v2TaskForm()], ['actions', () => v3ActionSheet('p')],
      ['tags', () => { go('plants'); document.querySelector('[data-action=fl-manage-tags]').click(); }],
      ['month', () => { go('care'); document.querySelector('[data-action=sk-toggle-month]').click(); }],
      ['photo-viewer', () => { sightingDetail('s'); document.querySelector('.v56-visit-photo').click(); }, '#v57-lightbox'],
      ...['home', 'plants', 'atlas', 'care'].map(tab => ['empty-' + tab, null])
    ];
    for (const [name, show, ready] of scenes) {
      await page.evaluate(() => { document.querySelector('.v57-lightbox-close')?.click(); closeModal(); });
      if (show) await page.evaluate(show);
      else await page.evaluate(tab => { state.plants = []; state.sightings = []; state.tasks = []; go(tab); }, name.slice(6));
      if (ready) await page.locator(ready).waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Inspect rendered components, including content below the fold. This catches
      // legacy styles in infrequently opened panels, not just the main buttons.
      const audit = await page.evaluate(() => {
        const root = document.querySelector('#v57-lightbox') || document.querySelector('.modal') || document.querySelector('#app');
        const describe = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].map(c => '.' + c).join('');
        const framed = [], shadows = [], overflow = [];
        for (const el of [root, ...root.querySelectorAll('*')]) {
          if (!el.getClientRects().length) continue;
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          if (r.width > 30 && r.height > 24 && ['Top', 'Bottom', 'Left', 'Right'].every(k => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none')) framed.push(describe(el));
          for (const pseudo of [null, '::before', '::after']) {
            const style = pseudo ? getComputedStyle(el, pseudo) : s;
            if (style.display !== 'none' && (!pseudo || !['none', 'normal'].includes(style.content)) && style.boxShadow !== 'none') shadows.push(describe(el) + (pseudo || ''));
          }
        }
        for (const el of [document.documentElement, ...document.querySelectorAll('.fl-dialog-body')]) if (el.scrollWidth > el.clientWidth + 1) overflow.push(describe(el));
        return { framed, shadows, overflow };
      });
      assert.deepEqual(audit, { framed: [], shadows: [], overflow: [] }, `${width}px ${name} has a legacy frame, shadow, or horizontal overflow`);
      if (width === 390) await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
    }
    // Borderless controls still have a visible keyboard focus indicator.
    await page.evaluate(() => plantForm());
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => {
      const el = document.activeElement, s = getComputedStyle(el);
      return el.matches(':focus-visible') && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
    }));
    assert.deepEqual(errors, []);
    console.log(`${width}px: ${scenes.length} populated/empty routes, dialogs and photo viewer; no legacy frames, shadows or horizontal overflow; keyboard focus visible`);
    await context.close();
  }
} finally { await browser.close(); }
