export function validateTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') {
    const error = new Error('Выберите светлую или тёмную тему.');
    error.code = 'INVALID_INPUT';
    throw error;
  }
  return theme;
}
