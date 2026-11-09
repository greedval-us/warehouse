export class DesktopError extends Error {
  constructor(code, message) { super(message); this.name = 'DesktopError'; this.code = code; }
}

export async function callDesktop(method, ...args) {
  const bridge = globalThis.window?.desktopAPI;
  if (!bridge || typeof bridge[method] !== 'function') {
    throw new DesktopError('BRIDGE_UNAVAILABLE', 'Откройте Warehouse в настольном приложении.');
  }
  let response;
  try { response = await bridge[method](...args); }
  catch { throw new DesktopError('TRANSPORT_ERROR', 'Не удалось связаться с приложением. Повторите попытку.'); }
  if (response?.ok === true && Object.hasOwn(response, 'value')) return response.value;
  if (response?.ok === false && typeof response.error?.message === 'string' && response.error.message.trim()) {
    throw new DesktopError(response.error.code, response.error.message);
  }
  throw new DesktopError('INVALID_RESPONSE', 'Приложение вернуло некорректный ответ. Повторите попытку.');
}
