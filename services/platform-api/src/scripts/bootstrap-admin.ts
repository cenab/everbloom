/**
 * Bootstrap script to create an admin user.
 *
 * Usage:
 *   npx ts-node src/scripts/bootstrap-admin.ts <sub> <email> [role]
 *
 * Example:
 *   npx ts-node src/scripts/bootstrap-admin.ts "abc123-uuid" "admin@example.com" owner
 *
 * How to get your sub:
 *   1. Sign in to the platform UI with Supabase Auth
 *   2. Open browser DevTools → Application → Local Storage
 *   3. Find the Supabase auth token and decode the JWT
 *   4. The 'sub' claim is your Supabase user ID
 *
 * Or use: supabase auth get-user (if you have Supabase CLI)
 */

import { createClient } from '@supabase/supabase-js';

type AdminRole = 'owner' | 'admin' | 'readonly';

async function bootstrapAdmin(sub: string, email: string, role: AdminRole = 'owner') {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`\nBootstrapping admin...`);
  console.log(`  Sub: ${sub}`);
  console.log(`  Email: ${email}`);
  console.log(`  Role: ${role}`);

  // Check if admin already exists by sub
  const { data: existingBySub } = await supabase
    .from('admins')
    .select('sub, email, role')
    .eq('sub', sub)
    .single();

  if (existingBySub) {
    console.log(`\nAdmin already exists with this sub:`);
    console.log(`  Sub: ${existingBySub.sub}`);
    console.log(`  Email: ${existingBySub.email}`);
    console.log(`  Role: ${existingBySub.role}`);
    console.log(`\nNo changes made.`);
    return;
  }

  // Check if email is already in use
  const { data: existingByEmail } = await supabase
    .from('admins')
    .select('sub, email, role')
    .eq('email', email)
    .single();

  if (existingByEmail) {
    console.error(`\nError: Email ${email} is already used by another admin (sub: ${existingByEmail.sub})`);
    process.exit(1);
  }

  // Insert new admin
  const { data, error } = await supabase
    .from('admins')
    .insert({
      sub,
      email,
      role,
    })
    .select()
    .single();

  if (error) {
    console.error('\nFailed to create admin:', error.message);
    process.exit(1);
  }

  console.log(`\nAdmin created successfully!`);
  console.log(`  Sub: ${data.sub}`);
  console.log(`  Email: ${data.email}`);
  console.log(`  Role: ${data.role}`);
}

// CLI entry point
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx ts-node src/scripts/bootstrap-admin.ts <sub> <email> [role]');
  console.log('');
  console.log('Arguments:');
  console.log('  sub    - Supabase Auth user ID (from JWT sub claim)');
  console.log('  email  - Admin email address');
  console.log('  role   - Admin role: owner, admin, readonly (default: owner)');
  console.log('');
  console.log('Example:');
  console.log('  npx ts-node src/scripts/bootstrap-admin.ts "abc123-uuid" "admin@example.com" owner');
  console.log('');
  console.log('To find your sub:');
  console.log('  1. Sign in to the platform');
  console.log('  2. Open DevTools → Application → Local Storage');
  console.log('  3. Find the Supabase auth token, decode the JWT');
  console.log('  4. The "sub" claim is your Supabase user ID');
  process.exit(1);
}

const sub = args[0];
const email = args[1];
const role = (args[2] as AdminRole) || 'owner';

if (!['owner', 'admin', 'readonly'].includes(role)) {
  console.error(`Invalid role: ${role}. Must be one of: owner, admin, readonly`);
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`Invalid email: ${email}`);
  process.exit(1);
}

// Basic sub validation (should be a UUID-like string)
if (sub.length < 10) {
  console.error(`Invalid sub: ${sub} (should be Supabase Auth user ID)`);
  process.exit(1);
}

bootstrapAdmin(sub, email, role).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
