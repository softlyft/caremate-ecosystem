#!/usr/bin/env node
/**
 * Seed Learn articles from caremate-admin-portal/data/learn.json into Supabase.
 *
 * Usage:
 *   npm run seed:articles -w caremate-admin-portal
 *   npm run seed:articles   (from repo root)
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
const learnPath = path.join(portalRoot, 'data', 'learn.json');

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

const CATEGORY_NAMES = {
  prevention: 'Everyday Health & Prevention',
  conditions: 'Common Conditions',
  symptoms: 'Symptoms & When to Seek Care',
  family: 'Family Health',
  emergency: 'Emergency & First Aid',
  care_system: 'Healthcare Navigation',
  medicines: 'Medicines & Treatments',
  mental: 'Mental Health & Well-being',
  tests: 'Tests & Procedures',
  nutrition: 'Nutrition & Healthy Living',
};

function resolveCategoryId(rawId) {
  return LEGACY_CATEGORY_ID_MAP[rawId] ?? rawId;
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in caremate-admin-portal/.env',
  );
  process.exit(1);
}

if (!fs.existsSync(learnPath)) {
  console.error(`Missing seed file: ${learnPath}`);
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const learn = JSON.parse(fs.readFileSync(learnPath, 'utf8'));
const now = new Date().toISOString();
const rows = [];

for (const [rawCategoryId, items] of Object.entries(learn)) {
  if (!Array.isArray(items)) continue;
  const categoryId = resolveCategoryId(rawCategoryId);
  for (const item of items) {
    rows.push({
      id: item.id,
      title: item.title,
      summary: item.summary ?? null,
      content: item.content ?? null,
      content_type: 'article',
      category_id: categoryId,
      category_name: CATEGORY_NAMES[categoryId] ?? categoryId,
      image_url: null,
      source_url: null,
      published_at: now,
      deleted_at: null,
      attributes: {
        readingMinutes: item.readingMinutes ?? undefined,
        author: 'CareMate',
      },
      created_at: now,
      updated_at: now,
    });
  }
}

if (rows.length === 0) {
  console.error('No articles found in data/learn.json');
  process.exit(1);
}

const { error } = await admin.from('articles').upsert(rows);
if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Upserted ${rows.length} articles from data/learn.json`);
