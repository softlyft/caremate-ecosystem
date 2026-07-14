#!/usr/bin/env node
/**
 * Bootstrap a staff role on an existing Auth user.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bootstrap-admin.mjs user@example.com admin
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const role = process.argv[3] || 'admin';

if (!url || !key || !email) {
  console.error(
    'Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bootstrap-admin.mjs <email> [admin|editor|support]',
  );
  process.exit(1);
}

if (!['admin', 'editor', 'support'].includes(role)) {
  console.error('Role must be admin, editor, or support');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) {
  console.error(error);
  process.exit(1);
}

const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No user found with email ${email}`);
  process.exit(1);
}

const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
  app_metadata: { ...user.app_metadata, role },
});

if (updateError) {
  console.error(updateError);
  process.exit(1);
}

console.log(`Assigned role "${role}" to ${email} (${user.id})`);
