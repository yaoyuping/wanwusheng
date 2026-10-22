/* Opt-in Web Push. Only reminder dates and the device subscription leave this browser. */
(() => {
  'use strict';
  const key = 'yiyu-phone-reminders-v59';
  let busy = false, status = '', timer, flight = null, dirty = false, lastWarning = 0;
  const read = () => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const write = value => localStorage.setItem(key, JSON.stringify(value));
  const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function paint(message = status) {
    status = message;
    const box = document.getElementById('v59-push-status'); if (box) box.textContent = status;
    document.querySelectorAll('[data-action^="v59-push-"]').forEach(button => {
      if (button.dataset.action === 'v59-push-enable') button.textContent = read().enabled ? '重新同步手机提醒' : '开启手机提醒';
      button.disabled = busy || (button.dataset.action !== 'v59-push-enable' && !read().enabled && !read().pendingRemoval);
    });
  }
  const previousSettings = settingsView;
  settingsView = function() {
    const enabled = Boolean(read().enabled);
    return `<section class="panel v59-push-panel" aria-label="手机养护提醒"><h2>手机养护提醒</h2><p>开启后，每天北京时间上午 9–10 点汇总提醒到期的浇水检查与未完成待办，网站关闭后也可收到。</p><p>开启会同步提醒日期和本机推送订阅；植物照片、名称和笔记保存在本机。</p>${ios() && !installed() ? '<p class="v59-push-install">iPhone：请用 Safari 打开网站，点“分享 → 添加到主屏幕”，再从主屏幕打开并开启提醒。需要 iOS 16.4 或以上。</p>' : ''}<div class="setting-actions"><button type="button" class="primary-btn" data-action="v59-push-enable" ${busy ? 'disabled' : ''}>${enabled ? '重新同步手机提醒' : '开启手机提醒'}</button><button type="button" class="outlined-btn" data-action="v59-push-test" ${busy || !enabled ? 'disabled' : ''}>发送测试通知</button><button type="button" class="outlined-btn" data-action="v59-push-disable" ${busy || (!enabled && !read().pendingRemoval) ? 'disabled' : ''}>关闭手机提醒</button></div><p id="v59-push-status" role="status" aria-live="polite">${esc(status || (enabled ? '已开启；修改养护记录或待办后会自动同步提醒日期。' : '尚未开启，只有主动点击开启才会请求通知权限。'))}</p></section>` + previousSettings();
  };
  async function request(body) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const text = body ? JSON.stringify(body) : '';
      const response = await fetch(yiyuAPILink('/api/reminders'), body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Yiyu-Password': yiyuPassword() }, body: text, keepalive: text.length < 60000, signal: controller.signal } : { signal: controller.signal, cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { const error = Error(data.error || '手机提醒服务暂时不可用'); error.status = response.status; throw error; }
      return data;
    } finally { clearTimeout(timeout); }
  }
  const hash = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n => n.toString(16).padStart(2, '0')).join('');
  async function identity(subscription) {
    const value = subscription.toJSON();
    return { deviceId: await hash(value.endpoint), token: await hash(value.keys.auth + '|' + value.keys.p256dh), subscription: value };
  }
  async function items() {
    const result = [];
    for (const plant of state.plants) {
      if (plant.reminder === false || !plant.lastWatered || window.yiyuCare.dismissed(plant)) continue;
      result.push({ id: await hash('water|' + plant.id), date: v2plusDate(plant.lastWatered, Math.max(1, Number(plant.interval) || 7)), kind: 'water' });
    }
    for (const task of state.tasks || []) if (!task.done && task.date) result.push({ id: await hash('task|' + task.id), date: task.date, kind: 'task' });
    return result;
  }
  function checkSupport() {
    if (ios() && !installed()) throw Error('请先用 Safari 将网站添加到主屏幕，再从主屏幕开启手机提醒。');
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw Error('当前浏览器不支持手机推送。iPhone 请使用 iOS 16.4 及以上，并从主屏幕打开网站。');
  }
  async function registration() {
    const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    await reg.update();
    const worker = reg.installing || reg.waiting;
    if (worker && worker.state !== 'activated') await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { worker.removeEventListener('statechange', changed); reject(Error('网站更新尚未完成，请稍后重试开启提醒。')); }, 20000);
      function changed() {
        if (worker.state === 'activated') { clearTimeout(timeout); worker.removeEventListener('statechange', changed); resolve(); }
        if (worker.state === 'redundant') { clearTimeout(timeout); worker.removeEventListener('statechange', changed); reject(Error('网站更新未完成，请刷新后重试。')); }
      }
      worker.addEventListener('statechange', changed); changed();
    });
    return reg;
  }
  const bytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
  async function enable() {
    checkSupport();
    const permission = Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission();
    clearTimeout(timer); busy = true; paint('正在开启手机提醒…');
    try {
      if (await permission !== 'granted') throw Error('未获得通知权限。请在手机系统通知设置中允许“万物生”发送通知。');
      const config = await request();
      if (!config.ready || !config.publicKey) throw Error('后台推送尚未就绪，请稍后重试。');
      const reg = await registration();
      let subscription = await reg.pushManager.getSubscription();
      const publicKey = bytes(config.publicKey);
      if (subscription?.options?.applicationServerKey && String(new Uint8Array(subscription.options.applicationServerKey)) !== String(publicKey)) { await subscription.unsubscribe(); subscription = null; }
      if (!subscription) subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
      const device = await identity(subscription);
      if (flight) await flight.catch(() => {});
      write({ deviceId: device.deviceId, token: device.token, enabled: false });
      const data = await request({ op: 'subscribe', ...device, items: await items() });
      write({ deviceId: device.deviceId, token: device.token, enabled: true });
      paint(`手机提醒已开启，已同步 ${data.count} 项提醒。可点击“发送测试通知”检查锁屏和通知栏。`);
    } finally { busy = false; paint(); }
  }
  async function flush() {
    if (flight) { dirty = true; return flight; }
    if (!read().enabled) return;
    flight = (async () => {
      do {
        dirty = false;
        const device = read(); if (!device.enabled) return;
        const reg = await navigator.serviceWorker.getRegistration(), subscription = await reg?.pushManager.getSubscription();
        if (!subscription) {
          await request({ op: 'unsubscribe', ...device }); write({ ...device, enabled: false });
          paint('手机订阅已失效，请重新开启手机提醒。'); return;
        }
        const data = await request({ op: 'subscribe', ...device, subscription: subscription.toJSON(), items: await items() });
        if (read().enabled) paint(`已同步 ${data.count} 项手机提醒，每天北京时间上午 9–10 点汇总推送。`);
      } while (dirty && read().enabled);
    })();
    try { await flight; } finally { flight = null; }
  }
  function scheduleSync() {
    if (!read().enabled) return;
    dirty = true; clearTimeout(timer);
    timer = setTimeout(() => flush().catch(() => {
      paint('本机已保存，手机提醒尚未同步；下次联网或返回网站时重试。');
      if (Date.now() - lastWarning > 60000) { lastWarning = Date.now(); toast('本机已保存，手机提醒待联网同步'); }
    }), 300);
  }
  async function disable() {
    const device = read(); write({ ...device, enabled: false, pendingRemoval: true });
    clearTimeout(timer); busy = true; paint('正在关闭手机提醒…');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const subscription = await reg?.pushManager.getSubscription();
      if (subscription && !await subscription.unsubscribe()) throw Error('手机订阅暂时无法关闭，请重试。');
      if (flight) await flight.catch(() => {});
      await request({ op: 'unsubscribe', ...device });
      localStorage.removeItem(key); paint('手机提醒已关闭，云端订阅已删除。');
    } finally { busy = false; paint(); }
  }
  const previousAct = act;
  act = async function(action, element) {
    if (!action.startsWith('v59-push-')) return previousAct(action, element);
    if (busy) return;
    try {
      if (action === 'v59-push-enable') return await enable();
      if (action === 'v59-push-disable') return await disable();
      if (action === 'v59-push-test') {
        busy = true; paint('正在发送测试通知…');
        await flush(); await request({ op: 'test', ...read() }); paint('测试通知已提交给手机推送服务，请查看锁屏或通知栏。');
      }
    } catch (error) { paint(error.name === 'AbortError' ? '连接手机提醒服务超时，请重试。' : error.message); }
    finally { busy = false; paint(); }
  };
  window.yiyuPush = { scheduleSync, items };
  addEventListener('online', () => read().pendingRemoval ? disable().catch(error => paint(error.message)) : scheduleSync());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleSync();
    else if (dirty && read().enabled) { clearTimeout(timer); void flush().catch(() => {}); }
  });
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type !== 'YIYU_OPEN_CARE') return;
    if (document.querySelector('#modal-root form')) toast('养护提醒已到达。保存当前内容后，可在养护日历查看。'); else go('care');
  });
  if (read().pendingRemoval) void disable().catch(error => paint(error.message));
  else if (read().enabled) scheduleSync();
})();
