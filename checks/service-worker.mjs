import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const events = new Map(), notifications = [], opened = [], messages = [];
let focused = false, existing = [];
const worker = {
 location: { origin: 'https://yaoyuping.github.io' },
 registration: { scope: 'https://yaoyuping.github.io/yiyu-plants/', showNotification: async (title, options) => notifications.push({ title, options }) },
 clients: { matchAll: async () => existing, openWindow: async url => opened.push(url) },
 addEventListener: (name, handler) => events.set(name, handler)
};
vm.runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), { self: worker, URL });
async function dispatch(name, props) {
 let pending; events.get(name)({ ...props, waitUntil(value) { pending = value; } }); await pending;
}
await dispatch('push', { data: { json: () => ({ title: '今日养护', body: '1 项待办', tag: 'care-test', url: 'https://unknown.example/' }) } });
assert.equal(notifications[0].title, '今日养护');
assert.equal(notifications[0].options.body, '1 项待办');
assert.equal(notifications[0].options.icon, 'https://yaoyuping.github.io/yiyu-plants/icon-192.png');
await dispatch('push', { data: { json: () => { throw Error('invalid'); } } });
assert.ok(notifications[1].options.body.includes('养护日历'));
await dispatch('notificationclick', { notification: { close() {} } });
assert.deepEqual(opened, ['https://yaoyuping.github.io/yiyu-plants/#care']);
existing = [{ url: 'https://yaoyuping.github.io/yiyu-plants/#home', focus: async () => { focused = true; }, postMessage: value => messages.push(value.type) }];
await dispatch('notificationclick', { notification: { close() {} } });
assert.equal(focused, true); assert.deepEqual(messages, ['YIYU_OPEN_CARE']); assert.equal(opened.length, 1);
console.log('Push notification content, malformed payload, icon scope, closed-site care link and existing-window focus passed.');
