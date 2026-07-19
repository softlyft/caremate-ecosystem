#!/usr/bin/env node
/**
 * Bootstrap a provider org membership (+ optional provider_profiles row).
 *
 * CareMate admin must seed membership before a user can sign in to the Provider Portal.
 *
 * Usage (from repo root):
 *   npm run bootstrap:member -w caremate-provider-portal -- <email> <organization-uuid> [owner|administrator|staff|viewer] [--create --password <secret>] [--display-name "Jane Doe"]
 *
 * Creates/updates:
 *   - auth user (optional --create)
 *   - provider_org_members row (deleted_at cleared)
 *   - provider_profiles stub if missing for the org
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
const organizationId = process.argv[3];
const roleArg = process.argv[4];
const role = roleArg && !roleArg.startsWith('--') ? roleArg : 'staff';
const createFlag = process.argv.includes('--create');
const passwordIdx = process.argv.indexOf('--password');
const password = passwordIdx >= 0 ? process.argv[passwordIdx + 1] : undefined;
const displayNameIdx = process.argv.indexOf('--display-name');
const displayName = displayNameIdx >= 0 ? process.argv[displayNameIdx + 1] : undefined;

const ROLES = ['owner', 'administrator', 'staff', 'viewer'];

if (!url || !key || !email || !organizationId) {
  console.error(
    'Usage: npm run bootstrap:member -w caremate-provider-portal -- <email> <organization-uuid> [role] [--create --password <secret>] [--display-name "Name"]',
  );
  console.error(
    'Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in caremate-provider-portal/.env',
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

const { data: org, error: orgError } = await admin
  .from('provider_organizations')
  .select('id, name')
  .eq('id', organizationId)
  .maybeSingle();

if (orgError) {
  console.error(orgError);
  process.exit(1);
}
if (!org) {
  console.error(`No provider_organizations row for ${organizationId}`);
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
        `  npm run bootstrap:member -w caremate-provider-portal -- ${email} ${organizationId} ${role} --create --password '<secret>'`,
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

const { error: memberError } = await admin.from('provider_org_members').upsert(
  {
    organization_id: organizationId,
    user_id: user.id,
    role,
    display_name: displayName ?? null,
    deleted_at: null,
  },
  { onConflict: 'organization_id,user_id' },
);

if (memberError) {
  console.error(memberError);
  process.exit(1);
}

const { data: existingProfile } = await admin
  .from('provider_profiles')
  .select('id')
  .eq('organization_id', organizationId)
  .maybeSingle();

if (!existingProfile) {
  const { error: profileError } = await admin.from('provider_profiles').insert({
    organization_id: organizationId,
    organization_type: 'clinic',
    verification_status: 'verified',
  });
  if (profileError) {
    console.error(profileError);
    process.exit(1);
  }
  console.log(`Created provider_profiles stub for org ${org.name}`);
}

console.log(
  `Assigned ${email} (${user.id}) as ${role} on ${org.name} (${organizationId})`,
);
