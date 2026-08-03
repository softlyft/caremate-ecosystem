#!/usr/bin/env node
/**
 * Seed articles, providers, and health_tips.
 * Articles come from caremate-admin-portal/data/learn.json; providers/tips from caremate bundles.
 *
 * Usage:
 *   npm run seed:catalogs -w caremate-admin-portal
 * For articles only: npm run seed:articles -w caremate-admin-portal
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caremateRoot = path.resolve(portalRoot, '../caremate');
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

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

async function seedArticles() {
  const learn = readJson(learnPath);
  const rows = [];
  const now = new Date().toISOString();

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
        attributes: { readingMinutes: item.readingMinutes ?? undefined, author: 'CareMate' },
        created_at: now,
        updated_at: now,
      });
    }
  }

  const { error } = await admin.from('articles').upsert(rows);
  if (error) throw error;
  console.log(`Upserted ${rows.length} articles`);
}

async function seedProviders() {
  const bundle = readJson(path.join(caremateRoot, 'src/domains/providers/data/providers.json'));
  const entries = Array.isArray(bundle?.entry) ? bundle.entry : [];
  const now = new Date().toISOString();
  const rows = [];

  for (const entry of entries) {
    const resource = entry.resource;
    if (!resource || resource.resourceType !== 'Organization') continue;
    const id = resource.id || entry.fullUrl;
    if (!id) continue;

    const typeCoding = resource.type?.[0]?.coding?.[0]?.code ?? 'clinic';
    const telecom = resource.telecom ?? [];
    const phone = telecom.find((t) => t.system === 'phone')?.value ?? null;
    const email = telecom.find((t) => t.system === 'email')?.value ?? null;
    const address = resource.address?.[0];
    const addressText = address
      ? [address.line?.join(' '), address.city, address.state, address.country]
          .filter(Boolean)
          .join(', ')
      : null;
    const pos = address?.extension?.find((e) => e.url?.includes('position'))?.extension;
    const lat = pos?.find((e) => e.url === 'latitude')?.valueDecimal ?? null;
    const lng = pos?.find((e) => e.url === 'longitude')?.valueDecimal ?? null;

    rows.push({
      id: String(id),
      name: resource.name ?? 'Provider',
      type: String(typeCoding).toLowerCase().replace(/-/g, '_'),
      address: addressText,
      phone,
      email,
      latitude: lat,
      longitude: lng,
      distance_km: null,
      attributes: {},
      created_at: now,
      updated_at: now,
    });
  }

  if (rows.length === 0) {
    console.log('No FHIR Organization entries found — skipping providers seed');
    return;
  }

  const { error } = await admin.from('providers').upsert(rows);
  if (error) throw error;
  console.log(`Upserted ${rows.length} providers`);
}

async function seedTips() {
  const tips = readJson(path.join(portalRoot, 'data', 'health-tips.json'));
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

  const { error } = await admin.from('health_tips').upsert(rows);
  if (error) throw error;
  console.log(`Upserted ${rows.length} health tips`);
}

await seedArticles();
await seedProviders();
await seedTips();
console.log('Catalog seed complete');
