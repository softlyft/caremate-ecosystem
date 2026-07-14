#!/usr/bin/env node
/**
 * Seed articles, providers, and health_tips from CareMate mobile JSON bundles.
 *
 * Usage (from caremate-portal):
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-catalogs.mjs
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const caremateRoot = path.resolve(__dirname, '../../caremate');

const CATEGORY_NAMES = {
  heart: 'Heart Health',
  child: 'Child Health',
  pregnancy: 'Pregnancy',
  mental: 'Mental Health',
  medication: 'Medication',
  nutrition: 'Nutrition',
  fitness: 'Fitness',
  infectious: 'Infectious Diseases',
};

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(caremateRoot, rel), 'utf8'));
}

async function seedArticles() {
  const learn = readJson('src/domains/articles/data/learn.json');
  const rows = [];
  const now = new Date().toISOString();

  for (const [categoryId, items] of Object.entries(learn)) {
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
  const bundle = readJson('src/domains/providers/data/providers.json');
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
  const tips = readJson('src/features/home/data/health-tips.json');
  const now = new Date().toISOString();
  const rows = [];

  for (const [categoryId, bodies] of Object.entries(tips)) {
    bodies.forEach((body, index) => {
      rows.push({
        id: `tip-${categoryId}-${index + 1}`,
        category_id: categoryId,
        body,
        sort_order: index,
        is_active: true,
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
