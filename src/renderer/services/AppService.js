import { callDesktop, DesktopError } from '../infrastructure/desktopApi.js';

const isTheme = theme => theme === 'light' || theme === 'dark';
const invalidResponse = () => new DesktopError('INVALID_RESPONSE', 'Не удалось прочитать настройки приложения. Повторите попытку.');

export async function getBootstrap() {
  const value = await callDesktop('getBootstrap');
  if (!value || !isTheme(value.settings?.theme)
    || typeof value.info?.name !== 'string' || typeof value.info?.version !== 'string'
    || typeof value.info?.platform !== 'string' || value.storage?.ready !== true
    || typeof value.storage?.path !== 'string' || value.storage?.schemaVersion !== 1) throw invalidResponse();
  return value;
}

export async function saveTheme(theme) {
  if (!isTheme(theme)) throw new DesktopError('INVALID_THEME', 'Выберите светлую или тёмную тему.');
  const value = await callDesktop('setTheme', theme);
  if (!isTheme(value?.theme) || value.theme !== theme) throw invalidResponse();
  return value;
}
