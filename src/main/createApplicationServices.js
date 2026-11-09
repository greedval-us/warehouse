import { join } from 'node:path';
import { DatabaseService } from './database/DatabaseService.js';
import { SettingsRepository } from './repositories/SettingsRepository.js';
import { AppService } from './services/AppService.js';

export function createApplicationServices({ userData, info }) {
  const database = new DatabaseService({ filePath: join(userData, 'data', 'warehouse.sqlite') });
  const settings = new SettingsRepository(database);
  return { appService: new AppService({ database, settings, info }), close: () => database.close() };
}
