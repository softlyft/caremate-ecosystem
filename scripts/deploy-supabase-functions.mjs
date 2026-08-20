#!/usr/bin/env node
/**
 * Deploy every Edge Function under supabase/functions/ (skips _shared).
 * Uses --use-api so Docker is not required.
 *
 * Usage (from repo root, after supabase link):
 *   node scripts/deploy-supabase-functions.mjs
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(process.cwd(), 'supabase', 'functions');
const entries = readdirSync(root, { withFileTypes: true });
let failed = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const name = entry.name;
  if (name.startsWith('_')) continue;
  if (!existsSync(join(root, name, 'index.ts'))) continue;

  console.log(`\n=== Deploy ${name} ===`);
  const result = spawnSync(
    'supabase',
    ['functions', 'deploy', name, '--use-api', '--yes'],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (result.status !== 0) {
    failed = 1;
    console.error(`Failed to deploy ${name}`);
  }
}

process.exit(failed);
