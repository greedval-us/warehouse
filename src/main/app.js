import { app, BrowserWindow, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import { DEV_SERVER_URL } from '../shared/runtime.js';

export function createWindow({ show = true } = {}) {
  const devUrl = !app.isPackaged && process.env.WAREHOUSE_DEV_SERVER_URL;
  if (devUrl && devUrl !== DEV_SERVER_URL) throw new Error('Недопустимый адрес сервера разработки Warehouse.');
  const window = new BrowserWindow({
    title: 'Warehouse', width: 1280, height: 820, minWidth: 640, minHeight: 480,
    backgroundColor: '#edeef2', show: false,
    icon: fileURLToPath(new URL('../../build/renderer/icons/app-256.png', import.meta.url)),
    webPreferences: {
      preload: fileURLToPath(new URL('../../build/main/preload.cjs', import.meta.url)),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.once('ready-to-show', () => { if (show) window.show(); });
  const loaded = devUrl ? window.loadURL(devUrl)
    : window.loadFile(fileURLToPath(new URL('../../build/renderer/index.html', import.meta.url)));
  if (devUrl && process.env.WAREHOUSE_DEVTOOLS === '1') window.webContents.openDevTools({ mode: 'detach' });
  return { window, loaded };
}
