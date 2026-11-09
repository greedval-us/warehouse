import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// A lost settings write or destructive migration must fail these checks.
import { DatabaseService } from '../../src/main/database/DatabaseService.js';
import { SettingsRepository } from '../../src/main/repositories/SettingsRepository.js';

function fixture(t) {
  const temporaryRoot = resolve(tmpdir());
  const directory = mkdtempSync(join(temporaryRoot, 'warehouse-test-'));
  t.after(() => {
    assert.ok(resolve(directory).startsWith(temporaryRoot + sep));
    rmSync(directory, { recursive: true, force: true });
  });
  return join(directory, 'data', 'warehouse.sqlite');
}

test('a new SQLite database defaults to light and persists a saved theme after reopening', t => {
  let database;
  t.after(() => database?.close());
  const filePath = fixture(t);
  database = new DatabaseService({ filePath });
  database.open();
  let settings = new SettingsRepository(database);
  assert.deepEqual(settings.get(), { theme: 'light' });
  assert.deepEqual(settings.setTheme('dark'), { theme: 'dark' });
  assert.equal(database.connection.prepare('PRAGMA user_version').get().user_version, 1);
  database.close();
  database.open();
  settings = new SettingsRepository(database);
  assert.deepEqual(settings.get(), { theme: 'dark' });
  assert.throws(() => settings.setTheme('system'));
  assert.deepEqual(settings.get(), { theme: 'dark' });
});

test('foreign SQLite and newer schemas are rejected without changing the file', t => {
  const filePath = fixture(t);
  const database = new DatabaseService({ filePath });
  database.open();
  database.close();
  for (const sql of ['PRAGMA user_version = 99', 'PRAGMA user_version = 0; PRAGMA application_id = 0; CREATE TABLE foreign_data (value TEXT)']) {
    const connection = new DatabaseSync(filePath);
    connection.exec(sql);
    connection.close();
    const before = readFileSync(filePath);
    assert.throws(() => database.open());
    assert.equal(database.connection, null);
    assert.deepEqual(readFileSync(filePath), before);
  }
});

test('a corrupt database is not silently replaced', t => {
  const filePath = fixture(t);
  const database = new DatabaseService({ filePath });
  database.open();
  database.close();
  writeFileSync(filePath, 'not a sqlite database');
  assert.throws(() => database.open());
  assert.equal(readFileSync(filePath, 'utf8'), 'not a sqlite database');
});

test('malformed v1 tables or views are rejected before any journal changes', t => {
  const filePath = fixture(t);
  const database = new DatabaseService({ filePath });
  database.open();
  database.close();
  const malformed = [
    "CREATE VIEW app_settings AS SELECT 'theme' AS key, 'light' AS value",
    "CREATE TABLE app_settings (key TEXT, value TEXT) STRICT; INSERT INTO app_settings VALUES ('theme', 'light'), ('theme', 'dark')",
  ];
  for (const sql of malformed) {
    const connection = new DatabaseSync(filePath);
    connection.exec('PRAGMA journal_mode = DELETE; DROP ' + (connection.prepare("SELECT type FROM sqlite_master WHERE name = 'app_settings'").get().type === 'view' ? 'VIEW' : 'TABLE') + ' app_settings; ' + sql);
    connection.close();
    const before = readFileSync(filePath);
    let rejected = false;
    try { database.open(); }
    catch { rejected = true; }
    finally { database.close(); }
    assert.equal(rejected, true, 'malformed v1 schema must be rejected');
    assert.deepEqual(readFileSync(filePath), before);
  }
});
