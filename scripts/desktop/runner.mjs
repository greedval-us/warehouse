import { app } from 'electron';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createWindow } from '../../src/main/app.js';
import { createApplicationServices } from '../../src/main/createApplicationServices.js';
import { registerIpcHandlers } from '../../src/main/ipc/registerIpcHandlers.js';
import { ipcMain } from 'electron';

const [userData, phase, qa] = process.argv.slice(2);
if (!userData || !['first', 'restart', 'startup'].includes(phase) || !qa) throw new Error('Missing desktop check arguments');
app.setName('Warehouse smoke');
app.setPath('userData', userData);
let window;
let services;
const rendererErrors = [];
if (phase === 'startup') {
  // Exercise the production entry with a temporary appData root. Keep the QA
  // window hidden while preserving its real renderer and application lifecycle.
  app.setPath('appData', userData);
  app.once('browser-window-created', (_event, created) => {
    window = created;
    window.show = () => {};
    window.webContents.once('did-finish-load', async () => {
      try {
        const deadline = Date.now() + 12000;
        let ready = false;
        while (Date.now() < deadline) {
          ready = await window.webContents.executeJavaScript("Boolean(document.querySelector('.status-dot-ready'))");
          if (ready) break;
          await new Promise(resolve => setTimeout(resolve, 40));
        }
        assert.equal(ready, true, 'production startup must initialize storage');
        assert.equal(app.getName(), 'Warehouse');
        assert.equal(app.getPath('userData'), join(userData, 'Warehouse'));
        const result = await window.webContents.executeJavaScript('window.desktopAPI.getBootstrap()');
        assert.equal(result.ok, true);
        assert.equal(result.value.info.name, 'Warehouse');
        assert.equal(result.value.info.version, app.getVersion());
        assert.equal(result.value.storage.path, join(userData, 'Warehouse', 'data', 'warehouse.sqlite'));
        console.log('DESKTOP_OK:startup');
        app.quit();
      } catch (error) { console.error(error); app.exit(1); }
    });
  });
  import('../../src/main/index.js').catch(error => { console.error(error); app.exit(1); });
} else app.whenReady().then(async () => {
  const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  services = createApplicationServices({ userData, info: { name: 'Warehouse', version, platform: process.platform } });
  registerIpcHandlers({ ipcMain, getWindow: () => window, appService: services.appService, logger: { error: (...args) => console.error(...args) } });
  const created = createWindow({ show: false });
  window = created.window;
  window.webContents.on('console-message', (_event, _level, message) => {
    if (String(message).includes('[Vue warn]') || String(message).includes('Uncaught')) rendererErrors.push(message);
  });
  window.webContents.on('preload-error', (_event, _path, error) => rendererErrors.push(String(error)));
  await created.loaded;
  const evaluate = expression => window.webContents.executeJavaScript(expression);
  async function capture(filename) {
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    writeFileSync(join(qa, filename), (await window.webContents.capturePage()).toPNG());
  }
  async function waitFor(expression) {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error(`Renderer condition timed out: ${expression}`);
  }
  await waitFor("document.querySelector('h1')?.textContent === 'Склад' && document.querySelector('.status-dot-ready')");
  assert.equal(await evaluate('typeof window.require'), 'undefined');
  assert.equal(await evaluate('typeof window.process'), 'undefined');
  assert.deepEqual(await evaluate('Object.keys(window.desktopAPI).sort()'), ['getBootstrap', 'setTheme']);
  const preferences = window.webContents.getLastWebPreferences();
  assert.equal(preferences.sandbox, true);
  assert.equal(preferences.contextIsolation, true);
  assert.equal(preferences.nodeIntegration, false);
  const bootstrap = await evaluate('window.desktopAPI.getBootstrap()');
  assert.equal(bootstrap.ok, true);
  assert.equal(bootstrap.value.info.name, 'Warehouse');
  assert.equal(bootstrap.value.storage.path, join(userData, 'data', 'warehouse.sqlite'));
  assert.equal(bootstrap.value.settings.theme, phase === 'first' ? 'light' : 'dark');
  assert.equal(await evaluate('document.documentElement.dataset.appearance'), phase === 'first' ? 'light' : 'dark');
  if (phase === 'first') await capture('home-light.png');
  await evaluate("document.querySelector('a.nav-item[href=\"#/settings\"]').click()");
  await waitFor("document.querySelector('h1')?.textContent === 'Настройки'");
  if (phase === 'first') {
    await evaluate("document.querySelector('input[name=theme][value=dark]').click()");
    await waitFor("document.documentElement.dataset.appearance === 'dark' && !document.querySelector('fieldset').disabled");
    assert.equal((await evaluate('window.desktopAPI.getBootstrap()')).value.settings.theme, 'dark');
  }
  await capture('settings-dark.png');
  await evaluate("document.querySelector('a.nav-item[href=\"#/info\"]').click()");
  await waitFor("document.querySelector('h1')?.textContent === 'О приложении'");
  assert.equal(await evaluate(`document.body.textContent.includes(${JSON.stringify(version)})`), true);
  window.setSize(640, 560);
  await waitFor("document.querySelector('.sidebar-frame-collapsed')");
  await evaluate("document.querySelector('.toolbar-start button').click()");
  await waitFor("document.querySelector('[role=dialog]') && document.querySelector('.app-body').inert");
  await evaluate("document.querySelector('[role=dialog] .sidebar-close').click()");
  await waitFor("!document.querySelector('[role=dialog]') && !document.querySelector('.app-body').inert");
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await capture('compact-dark.png');
  assert.deepEqual(rendererErrors, []);
  console.log(`DESKTOP_OK:${phase}`);
  window.destroy();
  services.close();
  app.quit();
}).catch(error => {
  console.error(error);
  window?.destroy();
  services?.close();
  app.exit(1);
});
