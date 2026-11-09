import { IPC_CHANNELS } from '../../shared/channels.js';
import { validateTheme } from '../../shared/settings.js';

const PUBLIC_ERRORS = Object.freeze({
  FORBIDDEN: 'Запрос отклонён.',
  INVALID_INPUT: 'Выберите светлую или тёмную тему.',
  STORAGE_UNAVAILABLE: 'Не удалось открыть локальное хранилище. Проверьте доступ к файлу и повторите попытку.',
  INTERNAL_ERROR: 'Не удалось выполнить действие. Повторите попытку.',
});

export function registerIpcHandlers({ ipcMain, getWindow, appService, logger }) {
  function handle(channel, action) {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        const window = getWindow();
        if (!window || window.isDestroyed() || window.webContents.isDestroyed()
          || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) {
          const error = new Error('Untrusted IPC sender');
          error.code = 'FORBIDDEN';
          throw error;
        }
        return { ok: true, value: await action(...args) };
      } catch (error) {
        logger.error(`IPC ${channel}`, error);
        const code = Object.hasOwn(PUBLIC_ERRORS, error?.code) ? error.code : 'INTERNAL_ERROR';
        return { ok: false, error: { code, message: PUBLIC_ERRORS[code] } };
      }
    });
  }
  handle(IPC_CHANNELS.BOOTSTRAP, () => appService.getBootstrap());
  handle(IPC_CHANNELS.SET_THEME, theme => appService.setTheme(validateTheme(theme)));
}
