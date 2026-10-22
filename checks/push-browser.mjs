import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/workspace/.cloud-tools/browser/node_modules/playwright-core/index.mjs');
const key = Buffer.alloc(65, 4).toString('base64url');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
 for (const [device, width] of [['iPhone',390],['desktop',1440]]) {
  const context = await browser.newContext({ viewport:{width,height:1000}, serviceWorkers:'block', ...(device==='iPhone'?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'}:{}) });
  const page = await context.newPage(), errors=[], operations=[];let record=null,testSent=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(publicKey=>{
   window.permissionCalls=0;
   Object.defineProperty(navigator,'standalone',{value:false,writable:true,configurable:true});
   const notification={permission:'default',requestPermission:async()=>{window.permissionCalls++;notification.permission='granted';return 'granted';}};
   Object.defineProperty(window,'Notification',{value:notification,configurable:true});
   Object.defineProperty(window,'PushManager',{value:function(){},configurable:true});
   let sub=null;
   const value={endpoint:'https://web.push.apple.com/synthetic-browser-test',keys:{p256dh:publicKey,auth:btoa(String.fromCharCode(...new Uint8Array(16).fill(1))).replace(/=/g,'')}};
   const subscription={toJSON:()=>value,unsubscribe:async()=>{sub=null;return true;},options:{applicationServerKey:Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-publicKey.length%4)%4)),c=>c.charCodeAt(0)).buffer}};
   const reg={update:async()=>{},pushManager:{getSubscription:async()=>sub,subscribe:async()=>{sub=subscription;return sub;}}};
   Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>reg,ready:Promise.resolve(reg),getRegistration:async()=>reg,addEventListener:()=>{}},configurable:true});
  },key);
  await page.route('**/api/status',r=>r.fulfill({json:{ready:true}}));
  await page.route('**/api/reminders',r=>{
   if(r.request().method()==='GET')return r.fulfill({json:{ready:true,publicKey:key}});
   const body=r.request().postDataJSON();operations.push(body);
   if(body.op==='subscribe'){record=body;return r.fulfill({json:{ok:true,count:body.items.length}});}
   if(body.op==='test'){testSent++;return r.fulfill({json:{ok:true}});}
   if(body.op==='unsubscribe'){record=null;return r.fulfill({json:{ok:true}});}
   return r.fulfill({status:400,json:{error:'invalid test operation'}});
  });
  await page.goto(process.env.YIYU_TEST_URL||'http://127.0.0.1:8005/');
  await page.waitForFunction(()=>typeof state==='object'&&state!==null);
  await page.evaluate(async()=>{state.plants=[{id:'p1',name:'不上传的植物名字',notes:'不上传的私密笔记',interval:7,lastWatered:stamp(),logs:[]}];state.tasks=[{id:'t1',date:stamp(),type:'修剪',name:'不上传的任务名字',done:false}];await save();ui.tab='settings';render();});
  assert.equal(await page.evaluate(()=>window.permissionCalls),0);
  assert.equal(operations.length,0);
  if(device==='iPhone'){
   assert.equal(await page.locator('.v59-push-install').count(),1);
   await page.locator('[data-action="v59-push-enable"]').click();
   await page.locator('#v59-push-status').filter({hasText:'添加到主屏幕'}).waitFor();
   assert.equal(await page.evaluate(()=>window.permissionCalls),0);
   await page.evaluate(()=>{navigator.standalone=true;render();});
  }
  await page.locator('[data-action="v59-push-enable"]').click();
  await page.locator('#v59-push-status').filter({hasText:'手机提醒已开启'}).waitFor();
  assert.equal(await page.evaluate(()=>window.permissionCalls),1);
  assert.equal(record.items.length,2);
  assert.doesNotMatch(JSON.stringify(record),/不上传/);
  assert.deepEqual(Object.keys(record.items[0]).sort(),['date','id','kind']);
  await page.locator('[data-action="v59-push-test"]').click();
  await page.locator('#v59-push-status').filter({hasText:'测试通知已提交'}).waitFor();
  assert.equal(testSent,1);
  await page.evaluate(async()=>{state.tasks[0].done=true;await save();});
  await page.waitForFunction(()=>document.getElementById('v59-push-status').textContent.includes('已同步 1 项'));
  assert.equal(record.items.length,1);
  await page.evaluate(async()=>{state.plants[0].reminder=false;await save();});
  await page.waitForFunction(()=>document.getElementById('v59-push-status').textContent.includes('已同步 0 项'));
  assert.equal(record.items.length,0);
  const backup=await page.evaluate(async()=>JSON.parse(await(await yiyuBuildFile()).file.text()));
  assert.doesNotMatch(JSON.stringify(backup),/synthetic-browser-test|"token"|"subscription"/);
  await page.locator('.v59-push-panel').screenshot({path:`/tmp/yiyu-v59-${width}-push.png`});
  await page.locator('[data-action="v59-push-disable"]').click();
  await page.locator('#v59-push-status').filter({hasText:'云端订阅已删除'}).waitFor();
  assert.equal(record,null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('yiyu-phone-reminders-v59')),null);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  console.log(device+': install gate, explicit permission, subscribe, test, automatic task/plant sync, private backup and unsubscribe passed (push API simulated)');
  await context.close();
 }
}finally{await browser.close();}
