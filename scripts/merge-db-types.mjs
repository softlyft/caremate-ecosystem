#!/usr/bin/env node
/**
 * After `supabase gen types`, merge aliases CareMate apps expect
 * onto packages/db-types/src/database.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const genPath = path.join(root, 'packages/db-types/src/database.gen.ts');
const outPath = path.join(root, 'packages/db-types/src/database.ts');

execSync(`supabase gen types typescript --linked > "${genPath}"`, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

if (!fs.existsSync(genPath)) {
  console.error('Missing database.gen.ts — supabase gen types failed');
  process.exit(1);
}

const generated = fs.readFileSync(genPath, 'utf8');
const aliases = `
export type Article = Database['public']['Tables']['articles']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type HealthTip = Database['public']['Tables']['health_tips']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
`;

fs.writeFileSync(outPath, `${generated.trim()}\n${aliases}`);
fs.unlinkSync(genPath);
console.log('Wrote packages/db-types/src/database.ts');
