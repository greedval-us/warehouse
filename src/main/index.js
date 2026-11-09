import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'node:path';
import log from 'electron-log/main.js';
import { createWindow } from './app.js';
import { createApplicationServices } from './createApplicationServices.js';
import { registerIpcHandlers } from './ipc/registerIpcHandlers.js';

app.setName('Warehouse');
app.setPath('userData', join(app.getPath('appData'), 'Warehouse'));
app.setAppUserModelId('com.warehouse.desktop');
const hasLock = app.requestSingleInstanceLock();
let mainWindow;
let services;

if (!hasLock) app.quit();
else {
  log.initialize();
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.show();
    mainWindow?.focus();
  });
  app.whenReady().then(async () => {
    services = createApplicationServices({ userData: app.getPath('userData'),
      info: { name: app.getName(), version: app.getVersion(), platform: process.platform } });
    registerIpcHandlers({ ipcMain, getWindow: () => mainWindow, appService: services.appService, logger: log });
    await openWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) openWindow().catch(failStartup); });
  }).catch(failStartup);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('will-quit', () => services?.close());
}

async function openWindow() {
  const created = createWindow();
  mainWindow = created.window;
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('render-process-gone', (_event, details) => log.error('Renderer stopped', details));
  await created.loaded;
}

function failStartup(error) {
  log.error('Warehouse startup failed', error);
  dialog.showErrorBox('Warehouse', 'Не удалось запустить приложение. Попробуйте запустить Warehouse ещё раз.');
  app.quit();
}
