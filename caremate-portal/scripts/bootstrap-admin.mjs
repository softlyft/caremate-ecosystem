#!/usr/bin/env node
/**
 * Bootstrap a staff role on an existing Auth user.
 *
 * Usage (from repo root or caremate-portal):
 *   npm run bootstrap:admin -w caremate-portal -- user@example.com admin
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(portalRoot, '.env'));
loadEnvFile(path.join(portalRoot, '.env.local'));

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const roleArg = process.argv[3];
const role = roleArg && !roleArg.startsWith('--') ? roleArg : 'admin';
const createFlag = process.argv.includes('--create');
const passwordIdx = process.argv.indexOf('--password');
const password = passwordIdx >= 0 ? process.argv[passwordIdx + 1] : undefined;

if (!url || !key || !email) {
  console.error(
    'Usage: npm run bootstrap:admin -w caremate-portal -- <email> [admin|editor|support] [--create --password <secret>]',
  );
  console.error(
    'Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in caremate-portal/.env',
  );
  process.exit(1);
}

if (!['admin', 'editor', 'support'].includes(role)) {
  console.error('Role must be admin, editor, or support');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) {
  console.error(error);
  process.exit(1);
}

const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  if (!createFlag || !password) {
    console.error(
      `No Auth user found with email ${email}.\n` +
        `Create one, then re-run:\n` +
        `  npm run bootstrap:admin -w caremate-portal -- ${email} ${role} --create --password '<secret>'`,
    );
    process.exit(1);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });

  if (createError) {
    console.error(createError);
    process.exit(1);
  }

  console.log(`Created user and assigned role "${role}" to ${email} (${created.user.id})`);
  process.exit(0);
}

const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
  app_metadata: { ...user.app_metadata, role },
});

if (updateError) {
  console.error(updateError);
  process.exit(1);
}

console.log(`Assigned role "${role}" to ${email} (${user.id})`);
