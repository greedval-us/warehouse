import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const APPLICATION_ID = 0x57485253;
export const SCHEMA_VERSION = 1;

export class DatabaseService {
  connection = null;

  constructor({ filePath }) { this.filePath = filePath; }

  open() {
    if (this.connection) return this.connection;
    mkdirSync(dirname(this.filePath), { recursive: true });
    const connection = new DatabaseSync(this.filePath);
    try {
      const version = connection.prepare('PRAGMA user_version').get().user_version;
      const applicationId = connection.prepare('PRAGMA application_id').get().application_id;
      const tables = connection.prepare("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all();
      const isEmpty = version === 0 && applicationId === 0 && tables.length === 0;
      if (!isEmpty && (applicationId !== APPLICATION_ID || version !== SCHEMA_VERSION)) {
        throw new Error('Несовместимый файл базы данных Warehouse.');
      }
      if (isEmpty) {
        connection.exec('BEGIN IMMEDIATE');
        try {
          connection.exec(`
            CREATE TABLE app_settings (
              key TEXT PRIMARY KEY CHECK (key = 'theme'),
              value TEXT NOT NULL CHECK (value IN ('light', 'dark'))
            ) STRICT;
            INSERT INTO app_settings (key, value) VALUES ('theme', 'light');
            PRAGMA application_id = ${APPLICATION_ID};
            PRAGMA user_version = ${SCHEMA_VERSION};
          `);
          connection.exec('COMMIT');
        } catch (error) {
          connection.exec('ROLLBACK');
          throw error;
        }
      } else validateSchema(connection);
      connection.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
      this.connection = connection;
      return connection;
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  close() {
    this.connection?.close();
    this.connection = null;
  }
}

function validateSchema(connection) {
  // Inspect table identity and columns before any write-oriented PRAGMA.
  const table = connection.prepare("SELECT type FROM sqlite_master WHERE name = 'app_settings'").get();
  const columns = connection.prepare('PRAGMA table_info(app_settings)').all();
  const definition = connection.prepare("PRAGMA table_list('app_settings')").get();
  const validColumns = columns.length === 2
    && columns[0].name === 'key' && columns[0].type === 'TEXT' && columns[0].pk === 1 && columns[0].notnull === 1
    && columns[1].name === 'value' && columns[1].type === 'TEXT' && columns[1].pk === 0 && columns[1].notnull === 1;
  if (table?.type !== 'table' || definition?.strict !== 1 || !validColumns) {
    throw new Error('Некорректная структура базы Warehouse.');
  }
  const rows = connection.prepare('SELECT key, value FROM app_settings').all();
  if (rows.length !== 1 || rows[0].key !== 'theme' || !['light', 'dark'].includes(rows[0].value)) {
    throw new Error('Повреждены настройки базы Warehouse.');
  }
}
