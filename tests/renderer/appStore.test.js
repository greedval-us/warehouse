import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useAppStore } from '../../src/renderer/stores/appStore.js';
import { createPinia, setActivePinia } from 'pinia';

const bootstrap = (theme = 'light') => ({
  info: { name: 'Warehouse', version: '0.1.0', platform: 'win32' },
  settings: { theme },
  storage: { ready: true, path: 'test-data/warehouse.sqlite', schemaVersion: 1 },
});
const ok = value => ({ ok: true, value });
const fail = { ok: false, error: { code: 'STORAGE_ERROR', message: 'Не удалось сохранить настройки.' } };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => { setActivePinia(createPinia()); delete globalThis.window; });

test('loads actual bootstrap info, storage and persisted theme', async () => {
  globalThis.window = { desktopAPI: { getBootstrap: async () => ok(bootstrap('dark')) } };
  const store = useAppStore();
  await store.initialize();
  assert.equal(store.theme, 'dark');
  assert.equal(store.info.version, '0.1.0');
  assert.equal(store.storage.path, 'test-data/warehouse.sqlite');
  assert.equal(store.loading, false);
  assert.equal(store.error, null);
});

test('missing bridge produces a recoverable startup error', async () => {
  const store = useAppStore();
  await store.initialize();
  assert.match(store.error, /настольном приложении/i);
  assert.equal(store.storage, null);
  globalThis.window = { desktopAPI: { getBootstrap: async () => ok(bootstrap()) } };
  await store.initialize();
  assert.equal(store.error, null);
  assert.equal(store.storage.ready, true);
});

test('save failure retains persisted theme and retry saves the requested theme', async () => {
  let succeeds = false;
  globalThis.window = { desktopAPI: {
    getBootstrap: async () => ok(bootstrap()),
    setTheme: async theme => succeeds ? ok({ theme }) : fail,
  } };
  const store = useAppStore();
  await store.initialize();
  await store.setTheme('dark');
  assert.equal(store.theme, 'light');
  assert.equal(store.error, fail.error.message);
  succeeds = true;
  await store.retry();
  assert.equal(store.theme, 'dark');
  assert.equal(store.error, null);
  assert.equal(store.saving, false);
});

test('does not optimistically apply theme or overlap save with load or another save', async () => {
  const loading = deferred();
  const saving = deferred();
  let loads = 0;
  let saves = 0;
  globalThis.window = { desktopAPI: {
    getBootstrap: () => { loads++; return loading.promise; },
    setTheme: () => { saves++; return saving.promise; },
  } };
  const store = useAppStore();
  const firstLoad = store.initialize();
  await store.initialize();
  await store.setTheme('dark');
  assert.equal(loads, 1);
  assert.equal(saves, 0);
  loading.resolve(ok(bootstrap()));
  await firstLoad;
  const firstSave = store.setTheme('dark');
  assert.equal(store.theme, 'light');
  assert.equal(store.saving, true);
  await store.setTheme('light');
  await store.initialize();
  assert.equal(saves, 1);
  assert.equal(loads, 1);
  saving.resolve(ok({ theme: 'dark' }));
  await firstSave;
  assert.equal(store.theme, 'dark');
});

test('rejects invalid themes before accessing the bridge', async () => {
  globalThis.window = { desktopAPI: { getBootstrap: async () => ok(bootstrap()), setTheme: () => assert.fail('invalid theme crossed bridge') } };
  const store = useAppStore();
  await store.initialize();
  await store.setTheme('system');
  assert.equal(store.theme, 'light');
  assert.ok(store.error);
});

test('malformed and rejected bridge responses surface safe errors and allow retry', async () => {
  let response = null;
  globalThis.window = { desktopAPI: { getBootstrap: async () => response } };
  const store = useAppStore();
  await store.initialize();
  assert.ok(store.error);
  assert.equal(store.loading, false);
  globalThis.window.desktopAPI.getBootstrap = async () => { throw new Error('internal sensitive detail'); };
  await store.retry();
  assert.ok(store.error);
  assert.doesNotMatch(store.error, /sensitive/);
  globalThis.window.desktopAPI.getBootstrap = async () => ok(bootstrap());
  await store.retry();
  assert.equal(store.error, null);
});
