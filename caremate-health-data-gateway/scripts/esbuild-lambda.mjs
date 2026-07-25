/**
 * Bundle the Lambda handler into a single CommonJS file for AWS deployment.
 * Usage: node scripts/esbuild-lambda.mjs
 */
import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outfile = join(root, 'dist-lambda', 'lambda.js');

mkdirSync(dirname(outfile), { recursive: true });

await esbuild.build({
  entryPoints: [join(root, 'apps/api/src/lambda.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  minify: false,
  // Nest / reflect-metadata need keepNames for DI in some cases
  keepNames: true,
  // Optional Nest peer modules — not installed; core requires them lazily.
  external: [
    '@nestjs/websockets',
    '@nestjs/websockets/socket-module',
    '@nestjs/microservices',
    '@nestjs/microservices/microservices-module',
    'class-transformer/storage',
  ],
  alias: {
    '@caremate/common': join(root, 'libs/common/src'),
    '@caremate/supabase-client': join(root, 'libs/supabase-client/src'),
    '@caremate/encryption': join(root, 'libs/encryption/src'),
    '@caremate/profile': join(root, 'libs/profile/src'),
    '@caremate/emergency': join(root, 'libs/emergency/src'),
  },
  logLevel: 'info',
});

console.log(`Lambda bundle written to ${outfile}`);
