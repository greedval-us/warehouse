import { validateTheme } from '../../shared/settings.js';

export class SettingsRepository {
  constructor(database) { this.database = database; }

  get() {
    const row = this.database.open().prepare("SELECT value FROM app_settings WHERE key = 'theme'").get();
    return { theme: validateTheme(row?.value) };
  }

  setTheme(theme) {
    validateTheme(theme);
    this.database.open().prepare("UPDATE app_settings SET value = ? WHERE key = 'theme'").run(theme);
    return this.get();
  }
}
