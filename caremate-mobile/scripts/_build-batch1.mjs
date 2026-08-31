#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '_batch1-all.json'), 'utf8'));

const lines = ['export const APPS_RAW_BATCH1 = ['];
for (const row of data) {
  lines.push(`  [${row.map((c) => JSON.stringify(c)).join(', ')}],`);
}
lines.push('];', '');

const outPath = path.join(__dirname, 'i18n-apps-phrases-batch1.mjs');
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
console.log(`Wrote ${data.length} rows to ${outPath}`);
