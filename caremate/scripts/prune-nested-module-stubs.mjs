#!/usr/bin/env node
/**
 * Gradle/Android Studio can create empty package shells under caremate/node_modules
 * (no package.json) that shadow monorepo-hoisted deps. That breaks Expo autolinking
 * (e.g. ExpoFetchModule never links because the local `expo` stub has no module config).
 *
 * Keep real installs (package.json present); delete the rest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = path.join(root, 'node_modules');

if (!fs.existsSync(nm)) {
  process.exit(0);
}

function pruneDir(dir) {
  let removed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('@')) {
      removed += pruneDir(full);
      if (fs.existsSync(full) && fs.readdirSync(full).length === 0) {
        fs.rmSync(full, { recursive: true, force: true });
      }
      continue;
    }
    if (!fs.existsSync(path.join(full, 'package.json'))) {
      fs.rmSync(full, { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}

const removed = pruneDir(nm);
if (removed > 0) {
  console.log(`[prune-nested-module-stubs] removed ${removed} empty package stub(s)`);
}
