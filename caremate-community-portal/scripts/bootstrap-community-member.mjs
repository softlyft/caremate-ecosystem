#!/usr/bin/env node
/**
 * Bootstrap a community membership for an existing CareMate user.
 *
 * Usage (from repo root):
 *   npm run bootstrap:member -w caremate-community-portal -- <email> <chapter-uuid> [member|lead|deputy] [--create --password <secret>] [--full-name "Jane Doe"]
 *
 * Creates/updates:
 *   - auth user (optional --create)
 *   - canonical profiles row if missing (--create)
 *   - community_memberships row (approved)
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const chapterId = process.argv[3];
const roleArg = process.argv[4];
const role = roleArg && !roleArg.startsWith('--') ? roleArg : 'member';
const createFlag = process.argv.includes('--create');
const passwordIdx = process.argv.indexOf('--password');
const password = passwordIdx >= 0 ? process.argv[passwordIdx + 1] : undefined;
const fullNameIdx = process.argv.indexOf('--full-name');
const fullName = fullNameIdx >= 0 ? process.argv[fullNameIdx + 1] : undefined;

const ROLES = ['member', 'lead', 'deputy'];

if (!url || !key || !email || !chapterId) {
  console.error(
    'Usage: npm run bootstrap:member -w caremate-community-portal -- <email> <chapter-uuid> [role] [--create --password <secret>] [--full-name "Name"]',
  );
  console.error(
    'Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in caremate-community-portal/.env',
  );
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`Role must be one of: ${ROLES.join(', ')}`);
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: chapter, error: chapterError } = await admin
  .from('community_chapters')
  .select('id, name')
  .eq('id', chapterId)
  .maybeSingle();

if (chapterError) {
  console.error(chapterError);
  process.exit(1);
}
if (!chapter) {
  console.error(`No community_chapters row for ${chapterId}`);
  process.exit(1);
}

const { data: listed, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) {
  console.error(listError);
  process.exit(1);
}

let user = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  if (!createFlag || !password) {
    console.error(
      `No Auth user found with email ${email}.\n` +
        `Create one, then re-run:\n` +
        `  npm run bootstrap:member -w caremate-community-portal -- ${email} ${chapterId} ${role} --create --password '<secret>' --full-name 'Name'`,
    );
    process.exit(1);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    console.error(createError);
    process.exit(1);
  }
  user = created.user;
  console.log(`Created auth user ${email} (${user.id})`);
}

const { error: memberError } = await admin.from('community_memberships').upsert(
  {
    chapter_id: chapterId,
    user_id: user.id,
    role,
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  },
  { onConflict: 'user_id,chapter_id' },
);

if (memberError) {
  console.error(memberError);
  process.exit(1);
}

const { data: existingProfile } = await admin
  .from('profiles')
  .select('user_id')
  .eq('user_id', user.id)
  .maybeSingle();

if (!existingProfile) {
  const { error: profileError } = await admin.from('profiles').insert({
    id: user.id,
    user_id: user.id,
    full_name: fullName || email.split('@')[0],
    email,
  });
  if (profileError) {
    console.error(profileError);
    process.exit(1);
  }
  console.log(`Created canonical profiles row for ${email}`);
} else if (fullName) {
  await admin.from('profiles').update({ full_name: fullName }).eq('user_id', user.id);
}

if (role === 'lead') {
  await admin.from('community_chapters').update({ lead_user_id: user.id }).eq('id', chapterId);
} else if (role === 'deputy') {
  await admin.from('community_chapters').update({ deputy_user_id: user.id }).eq('id', chapterId);
}

console.log(
  `Assigned ${email} (${user.id}) as ${role} on ${chapter.name} (${chapterId})`,
);
