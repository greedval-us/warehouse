import { IPC_CHANNELS } from './channels.js';
import { validateTheme } from './settings.js';

export function createDesktopBridge(invoke) {
  return Object.freeze({
    getBootstrap: () => invoke(IPC_CHANNELS.BOOTSTRAP),
    setTheme: theme => invoke(IPC_CHANNELS.SET_THEME, validateTheme(theme)),
  });
}
