#!/usr/bin/env node
/**
 * Seed health tips from caremate-admin-portal/data/health-tips.json into Supabase.
 *
 * Usage:
 *   npm run seed:tips
 *   npm run seed:tips -w caremate-admin-portal
 *
 * Requires caremate-admin-portal/.env with:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tipsPath = path.join(portalRoot, 'data', 'health-tips.json');

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

if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in caremate-admin-portal/.env',
  );
  process.exit(1);
}

if (!fs.existsSync(tipsPath)) {
  console.error(`Missing seed file: ${tipsPath}`);
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEGACY_CATEGORY_ID_MAP = {
  heart: 'conditions',
  child: 'family',
  pregnancy: 'family',
  mental: 'mental',
  medication: 'medicines',
  nutrition: 'nutrition',
  fitness: 'nutrition',
  infectious: 'conditions',
};

function resolveCategoryId(rawId) {
  return LEGACY_CATEGORY_ID_MAP[rawId] ?? rawId;
}

const tips = JSON.parse(fs.readFileSync(tipsPath, 'utf8'));
const now = new Date().toISOString();
const rows = [];

for (const [rawCategoryId, bodies] of Object.entries(tips)) {
  if (!Array.isArray(bodies)) continue;
  const categoryId = resolveCategoryId(rawCategoryId);
  bodies.forEach((body, index) => {
    rows.push({
      id: `tip-${rawCategoryId}-${index + 1}`,
      category_id: categoryId,
      body,
      sort_order: index,
      is_active: true,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
  });
}

if (rows.length === 0) {
  console.error('No tips found in data/health-tips.json');
  process.exit(1);
}

const { error } = await admin.from('health_tips').upsert(rows);
if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Upserted ${rows.length} health tips from data/health-tips.json`);
