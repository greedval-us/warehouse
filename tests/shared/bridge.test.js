import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesktopBridge } from '../../src/shared/bridge.js';

test('bridge exposes named operations and forwards only a valid theme', async () => {
  const calls = [];
  const bridge = createDesktopBridge(async (...args) => { calls.push(args); return { ok: true, value: { theme: 'dark' } }; });
  assert.deepEqual(Object.keys(bridge).sort(), ['getBootstrap', 'setTheme']);
  assert.equal(Object.isFrozen(bridge), true);
  await bridge.getBootstrap();
  await bridge.setTheme('dark');
  assert.deepEqual(calls, [['app:bootstrap'], ['settings:set-theme', 'dark']]);
  assert.throws(() => bridge.setTheme({ theme: 'dark', channel: 'anything' }));
  assert.equal(calls.length, 2);
});
