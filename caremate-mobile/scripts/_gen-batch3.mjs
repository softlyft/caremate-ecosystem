#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const phrases = JSON.parse(fs.readFileSync(path.join(__dirname, '_apps-batch-3.json'), 'utf8'));
const locales = ['fr', 'es', 'yo', 'ha', 'ig', 'sw', 'tw', 'zh', 'hi'];
const transDir = path.join(__dirname, '../src/domains/localization/translations');

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, p));
    else out[p] = v;
  }
  return out;
}

const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(transDir, 'en/apps.json'), 'utf8')));
const localeFlat = Object.fromEntries(
  locales.map((loc) => [loc, flatten(JSON.parse(fs.readFileSync(path.join(transDir, `${loc}/apps.json`), 'utf8')))])
);

function lookupLocale(en) {
  const row = [en];
  for (const loc of locales) {
    let found = null;
    for (const [k, v] of Object.entries(enFlat)) {
      if (v === en && localeFlat[loc][k] && localeFlat[loc][k] !== en) {
        found = localeFlat[loc][k];
        break;
      }
    }
    row.push(found);
  }
  return row.every((v, i) => i === 0 || v) ? row : null;
}

const manualParts = [];
for (let i = 1; i <= 4; i++) {
  const p = path.join(__dirname, `_batch3-translations-part${i}.json`);
  if (fs.existsSync(p)) manualParts.push(...JSON.parse(fs.readFileSync(p, 'utf8')));
}
const manual = Object.fromEntries(manualParts.map((row) => [row[0], row]));

const rows = [];
for (const en of phrases) {
  const fromLocale = lookupLocale(en);
  if (fromLocale) {
    rows.push(fromLocale);
    continue;
  }
  const m = manual[en];
  if (!m || m.length !== 10) {
    console.error('Missing translation for:', en);
    process.exit(1);
  }
  rows.push(m);
}

if (rows.length !== 155) {
  console.error('Expected 155 rows, got', rows.length);
  process.exit(1);
}

const out = ['export const APPS_RAW_BATCH3 = ['];
for (const row of rows) {
  const cells = row.map((c) => JSON.stringify(c)).join(', ');
  out.push(`  [${cells}],`);
}
out.push('];', '');

const outPath = path.join(__dirname, 'i18n-apps-phrases-batch3.mjs');
fs.writeFileSync(outPath, out.join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length} rows to ${outPath}`);
