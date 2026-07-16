import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { Platform } from 'react-native';

import * as schema from '@/database/schema';
import migrations from '@/database/migrations/migrations';

const DATABASE_NAME = 'caremate.db';

let sqliteDb: SQLite.SQLiteDatabase | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let initPromise: Promise<void> | null = null;

function isWebBrowser(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

function assertDatabaseReady(): void {
  if (!sqliteDb || !drizzleDb) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() before accessing repositories.',
    );
  }
}

export function getSQLiteDatabase(): SQLite.SQLiteDatabase {
  assertDatabaseReady();
  return sqliteDb!;
}

export function getDatabase() {
  assertDatabaseReady();
  return drizzleDb!;
}

export function isDatabaseInitialized(): boolean {
  return Boolean(sqliteDb && drizzleDb);
}

async function applyPragmas(database: SQLite.SQLiteDatabase): Promise<void> {
  const sql = `
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `;
  if (isWebBrowser()) {
    await database.execAsync(sql);
    return;
  }
  database.execSync(sql);
}

/**
 * Devices that already had tables from the old hand-written MIGRATION_SQL
 * must not re-run the initial Drizzle CREATE TABLE migration.
 * Mark the current journal as applied when a legacy schema is detected.
 */
async function baselineLegacySchemaIfNeeded(database: SQLite.SQLiteDatabase): Promise<void> {
  const listSql = `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('profiles', '__drizzle_migrations')`;
  const tables = isWebBrowser()
    ? await database.getAllAsync<{ name: string }>(listSql)
    : database.getAllSync<{ name: string }>(listSql);
  const names = new Set(tables.map((row) => row.name));

  if (!names.has('profiles')) {
    return;
  }

  const createJournal = `
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    );
  `;
  if (isWebBrowser()) {
    await database.execAsync(createJournal);
  } else {
    database.execSync(createJournal);
  }

  const countSql = `SELECT COUNT(*) AS count FROM __drizzle_migrations`;
  const counted = isWebBrowser()
    ? await database.getFirstAsync<{ count: number }>(countSql)
    : database.getFirstSync<{ count: number }>(countSql);

  if ((counted?.count ?? 0) > 0) {
    return;
  }

  // Only mark the initial schema dump as applied. Later journal entries
  // (e.g. notifications) must still run via migrate().
  const initialWhen =
    migrations.journal.entries.find((entry) => entry.idx === 0)?.when ??
    migrations.journal.entries[0]?.when ??
    0;
  const insertSql = `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`;
  if (isWebBrowser()) {
    await database.runAsync(insertSql, ['', initialWhen]);
  } else {
    database.runSync(insertSql, ['', initialWhen]);
  }
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await applyPragmas(database);
  await baselineLegacySchemaIfNeeded(database);

  const db = drizzle(database, { schema });
  await migrate(db, migrations);
}

export async function initializeDatabase(): Promise<void> {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return;
  }

  if (drizzleDb) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      if (isWebBrowser()) {
        // openDatabaseSync blocks on a web worker and commonly times out on web.
        sqliteDb = await SQLite.openDatabaseAsync(DATABASE_NAME);
      } else {
        sqliteDb = SQLite.openDatabaseSync(DATABASE_NAME);
      }

      await runMigrations(sqliteDb);
      drizzleDb = drizzle(sqliteDb, { schema });
    })();
  }

  await initPromise;
}
