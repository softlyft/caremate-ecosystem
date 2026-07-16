import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { Platform } from 'react-native';

import * as schema from '@/database/schema';

const DATABASE_NAME = 'caremate.db';

const MIGRATION_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth TEXT,
    avatar_url TEXT,
    country_code TEXT,
    language_code TEXT,
    state TEXT,
    patient_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS emergency_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    photo_url TEXT,
    blood_group TEXT,
    genotype TEXT,
    allergies TEXT NOT NULL DEFAULT '[]',
    current_medications TEXT NOT NULL DEFAULT '[]',
    chronic_conditions TEXT NOT NULL DEFAULT '[]',
    emergency_contacts TEXT NOT NULL DEFAULT '[]',
    preferred_hospital TEXT,
    insurance_provider TEXT,
    notes TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    latitude REAL,
    longitude REAL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    distance_km REAL,
    attributes TEXT NOT NULL DEFAULT '{}',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'article',
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    image_url TEXT,
    source_url TEXT,
    published_at TEXT,
    attributes TEXT NOT NULL DEFAULT '{}',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY NOT NULL,
    article_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS health_tips (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL,
    body TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'system',
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    subscribed_category_ids TEXT NOT NULL DEFAULT '[]',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mini_app_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    app_key TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS family_households (
    id TEXT PRIMARY KEY NOT NULL,
    created_by_user_id TEXT NOT NULL,
    name TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY NOT NULL,
    household_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    linked_user_id TEXT,
    full_name TEXT NOT NULL,
    date_of_birth TEXT,
    gender TEXT,
    notes TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS family_connection_requests (
    id TEXT PRIMARY KEY NOT NULL,
    household_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT,
    to_email TEXT,
    to_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    invite_token TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscription_entitlements (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    household_id TEXT,
    plan_type TEXT NOT NULL,
    billing_interval TEXT NOT NULL,
    currency TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_end TEXT,
    sync_status TEXT NOT NULL DEFAULT 'synced',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

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

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  if (isWebBrowser()) {
    await database.execAsync(MIGRATION_SQL);
    await addColumnIfMissingAsync(database, 'articles', 'source_url', 'TEXT');
    await addColumnIfMissingAsync(
      database,
      'articles',
      'content_type',
      "TEXT NOT NULL DEFAULT 'article'",
    );
    await addColumnIfMissingAsync(database, 'articles', 'attributes', "TEXT NOT NULL DEFAULT '{}'");
    await addColumnIfMissingAsync(database, 'profiles', 'country_code', 'TEXT');
    await addColumnIfMissingAsync(database, 'profiles', 'language_code', 'TEXT');
    await addColumnIfMissingAsync(database, 'profiles', 'state', 'TEXT');
    await addColumnIfMissingAsync(database, 'profiles', 'patient_id', 'TEXT');
    await addColumnIfMissingAsync(
      database,
      'providers',
      'attributes',
      "TEXT NOT NULL DEFAULT '{}'",
    );
    return;
  }
  database.execSync(MIGRATION_SQL);
  addColumnIfMissingSync(database, 'articles', 'source_url', 'TEXT');
  addColumnIfMissingSync(database, 'articles', 'content_type', "TEXT NOT NULL DEFAULT 'article'");
  addColumnIfMissingSync(database, 'articles', 'attributes', "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissingSync(database, 'profiles', 'country_code', 'TEXT');
  addColumnIfMissingSync(database, 'profiles', 'language_code', 'TEXT');
  addColumnIfMissingSync(database, 'profiles', 'state', 'TEXT');
  addColumnIfMissingSync(database, 'profiles', 'patient_id', 'TEXT');
  addColumnIfMissingSync(database, 'providers', 'attributes', "TEXT NOT NULL DEFAULT '{}'");
}

async function addColumnIfMissingAsync(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  try {
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  } catch {
    // Column already exists on upgraded databases.
  }
}

function addColumnIfMissingSync(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): void {
  try {
    database.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  } catch {
    // Column already exists on upgraded databases.
  }
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

      drizzleDb = drizzle(sqliteDb, { schema });
      await runMigrations(sqliteDb);
    })();
  }

  await initPromise;
}
