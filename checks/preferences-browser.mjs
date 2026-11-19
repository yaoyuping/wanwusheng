import assert from 'node:assert/strict';
const {chromium}=await import('/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.YIYU_TEST_URL||'http://127.0.0.1:8013/';
try {for(const width of [320,390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/status',r=>r.fulfill({json:{ready:true}}));
 await page.goto(base);await page.waitForFunction(()=>typeof state==='object'&&state);
 await page.evaluate(async()=>{state.plants=[{id:'one',name:'鸟巢蕨',latin:'Asplenium nidus',tags:'喜湿 / 耐阴',interval:7,logs:[]},{id:'two',name:'龟背竹',latin:'Monstera deliciosa',tags:'喜湿 / 观叶',interval:7,logs:[]}];state.tagLibrary=['喜湿','耐阴','观叶','旧标签'];state.sightings=[{id:'a',name:'银杏',latin:'Ginkgo biloba',date:stamp(),notes:'原有观察'},{id:'b',name:'银杏',latin:'Ginkgo biloba',date:stamp(),notes:'第二次观察'}];await save();go('plants')});
 assert.equal(await page.locator('.plant-card .latin').count(),0);
 await page.locator('[data-action=fl-manage-tags]').click();
 page.once('dialog',d=>d.dismiss());await page.locator('[data-action=fl-delete-tag][data-tag="喜湿"]').click();
 assert.ok(await page.evaluate(()=>state.plants.every(p=>v4SplitTags(p.tags).includes('喜湿'))));
 page.once('dialog',d=>d.accept());await page.locator('[data-action=fl-delete-tag][data-tag="喜湿"]').click();
 await page.locator('[data-action=fl-undo-tag]').waitFor();
 assert.ok(await page.evaluate(()=>state.plants.every(p=>!v4SplitTags(p.tags).includes('喜湿'))&&!state.tagLibrary.includes('喜湿')));
 assert.equal(await page.evaluate(()=>state.plants.length),2);
 await page.locator('[data-action=fl-undo-tag]').click();await page.waitForFunction(()=>state.tagLibrary.includes('喜湿'));
 assert.ok(await page.evaluate(()=>state.plants.every(p=>v4SplitTags(p.tags).includes('喜湿'))));
 page.once('dialog',d=>d.accept());await page.locator('[data-action=fl-delete-tag][data-tag="旧标签"]').click();await page.waitForFunction(()=>!state.tagLibrary.includes('旧标签'));
 await page.locator('[data-action=close-modal]').click();await page.reload();await page.waitForFunction(()=>typeof state==='object'&&state?.plants?.length===2);
 assert.ok(await page.evaluate(()=>!v4TagBank().includes('旧标签')));
 await page.evaluate(()=>plantDetail('one'));
 assert.equal(await page.locator('.v3-detail-cover-bottom').innerText(),'鸟巢蕨');
 await page.locator('.v3-info-row[data-field=tags]').click();
 assert.equal(await page.locator('#plant-form [name=latin]:visible').count(),0);
 assert.equal(await page.locator('#plant-form [name=latin]').inputValue(),'Asplenium nidus');
 await page.getByRole('button',{name:'移除标签：喜湿',exact:true}).click();
 await page.locator('#plant-form [type=submit]').click();await page.waitForFunction(()=>!v4SplitTags(state.plants[0].tags).includes('喜湿'));
 assert.equal(await page.evaluate(()=>state.plants[0].latin),'Asplenium nidus');
 assert.ok(await page.evaluate(()=>v4SplitTags(state.plants[1].tags).includes('喜湿')));
 await page.evaluate(()=>go('atlas'));assert.equal(await page.locator('.v56-group-card').count(),1);assert.equal(await page.locator('.v56-group-card .latin').count(),0);
 await page.locator('.v56-group-card').click();assert.equal(await page.locator('.v56-record-page .latin').count(),0);
 await page.locator('[data-action=edit-sighting]').first().click();
 assert.equal(await page.locator('#sighting-form [name=latin]:visible').count(),0);await page.locator('#sighting-form [name=notes]').fill('更新的观察');await page.locator('#sighting-form [type=submit]').click();await page.waitForFunction(()=>state.sightings.some(s=>s.notes.includes('更新的观察')));
 assert.ok(await page.evaluate(()=>state.sightings.every(s=>s.latin==='Ginkgo biloba')));
 const weather=[];
 for(const tab of ['home','plants']){
  await page.evaluate(tab=>{v3Weather={temperature:22,humidity:65,city:'杭州',code:2};go(tab);v3UpdateWeatherViews()},tab);
  weather.push(await page.evaluate(()=>{const el=document.querySelector('.v50-weather');return {text:el.innerText,styles:['backgroundColor','borderRadius','borderTopWidth','borderBottomWidth','padding'].map(k=>getComputedStyle(el)[k])}}));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 assert.deepEqual(weather[0],weather[1]);
 await page.locator('[data-action=new-plant]:visible').first().click();
 assert.equal(await page.locator('#plant-form [type=submit]').evaluate(el=>getComputedStyle(el,'::after').display),'none');
 assert.equal(await page.locator('#plant-form [type=submit]').evaluate(el=>getComputedStyle(el).boxShadow),'none');
 await page.screenshot({path:`/tmp/517-form-${width}.png`});
 assert.deepEqual(errors,[]);console.log(`${width}px: hidden scientific names retain grouping and stored data; tag remove/cancel/undo/persistence; matching weather; soft controls passed`);await context.close();
}} finally {await browser.close()}
