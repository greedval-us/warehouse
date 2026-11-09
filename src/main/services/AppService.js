import { SCHEMA_VERSION } from '../database/DatabaseService.js';

export class AppService {
  constructor({ database, settings, info }) { Object.assign(this, { database, settings, info }); }

  getBootstrap() {
    try {
      this.database.open();
      return { info: this.info, settings: this.settings.get(),
        storage: { ready: true, path: this.database.filePath, schemaVersion: SCHEMA_VERSION } };
    } catch (cause) {
      const error = new Error('Не удалось открыть локальное хранилище. Проверьте доступ к файлу и повторите попытку.', { cause });
      error.code = 'STORAGE_UNAVAILABLE';
      throw error;
    }
  }

  setTheme(theme) { return this.settings.setTheme(theme); }
}
