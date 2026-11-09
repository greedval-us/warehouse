import test from 'node:test';
import assert from 'node:assert/strict';
import { registerIpcHandlers } from '../../src/main/ipc/registerIpcHandlers.js';

function setup() {
  const handlers = new Map();
  const mainFrame = {};
  const webContents = { mainFrame, isDestroyed: () => false };
  const window = { webContents, isDestroyed: () => false };
  const event = { sender: webContents, senderFrame: mainFrame };
  let theme = 'light';
  registerIpcHandlers({ ipcMain: { handle: (channel, callback) => handlers.set(channel, callback) }, getWindow: () => window,
    appService: { getBootstrap: () => ({ settings: { theme } }), setTheme: value => { theme = value; return { theme }; } }, logger: { error() {} } });
  return { handlers, event, getTheme: () => theme };
}

test('IPC rejects another sender and a subframe before privileged operations', async () => {
  const { handlers, event, getTheme } = setup();
  const handler = handlers.get('settings:set-theme');
  for (const untrusted of [{ ...event, sender: {} }, { ...event, senderFrame: {} }]) {
    const result = await handler(untrusted, 'dark');
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'FORBIDDEN');
    assert.equal(getTheme(), 'light');
  }
  assert.deepEqual(await handler(event, 'dark'), { ok: true, value: { theme: 'dark' } });
});

test('IPC validates themes even if preload is bypassed and hides unexpected errors', async () => {
  const { handlers, event, getTheme } = setup();
  assert.equal((await handlers.get('settings:set-theme')(event, 'system')).error.code, 'INVALID_INPUT');
  assert.equal(getTheme(), 'light');
  const broken = new Map();
  registerIpcHandlers({ ipcMain: { handle: (channel, callback) => broken.set(channel, callback) },
    getWindow: () => ({ webContents: event.sender, isDestroyed: () => false }),
    appService: { getBootstrap() { throw new Error('SELECT secret FROM C:/private.sqlite'); } }, logger: { error() {} } });
  const result = await broken.get('app:bootstrap')(event);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(result.error.message, /SELECT|private|sqlite/i);
});
