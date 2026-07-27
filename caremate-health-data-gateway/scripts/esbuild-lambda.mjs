/**
 * Bundle the Lambda handler into a single CommonJS file for AWS deployment.
 *
 * Important: entry must be Nest/tsc output (with emitDecoratorMetadata), not
 * TypeScript sources. esbuild does not emit design:paramtypes, so bundling .ts
 * directly breaks Nest DI (ConfigService etc. arrive as undefined → every route 500).
 *
 * Usage: nest build api && node scripts/esbuild-lambda.mjs
 */
import * as esbuild from 'esbuild';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const entry = join(root, 'dist/apps/api/src/lambda.js');
const outfile = join(root, 'dist-lambda', 'lambda.js');

if (!existsSync(entry)) {
  console.error(
    `Missing ${entry}. Run \`npm run build\` (nest build api) before build:lambda.`,
  );
  process.exit(1);
}

mkdirSync(dirname(outfile), { recursive: true });

await esbuild.build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
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
  logLevel: 'info',
});

console.log(`Lambda bundle written to ${outfile}`);
