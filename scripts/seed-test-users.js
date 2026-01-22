/**
 * Seed test users into Supabase database via Management API
 * Run with: node scripts/seed-test-users.js
 */

const PROJECT_REF = 'dakmrkkuvygekpbksbpc';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_175b31e078959d05f2666759f366fcee83797f01';

async function executeQuery(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('Seeding test users...\n');

  // Step 1: Create test units
  console.log('1. Creating test units...');
  await executeQuery(`
    INSERT INTO public.units (id, unit_type, parent_id, name, designation, status)
    VALUES
      ('00000000-0000-0000-0000-100000000001', 'battalion', NULL, 'Test Battalion', 'TEST-BN', 'active'),
      ('00000000-0000-0000-0000-100000000002', 'company', '00000000-0000-0000-0000-100000000001', 'Alpha Company', 'A-CO', 'active'),
      ('00000000-0000-0000-0000-100000000003', 'platoon', '00000000-0000-0000-0000-100000000002', 'First Platoon', '1-PLT', 'active')
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('   Done.\n');

  // Step 2: Create test users in auth.users
  const testUsers = [
    { id: '00000000-0000-0000-0000-000000000001', email: 'test-admin@e2e.local', name: 'Test Admin' },
    { id: '00000000-0000-0000-0000-000000000002', email: 'test-leader@e2e.local', name: 'Test Leader' },
    { id: '00000000-0000-0000-0000-000000000003', email: 'test-user@e2e.local', name: 'Test User' },
    { id: '00000000-0000-0000-0000-000000000004', email: 'test-new@e2e.local', name: 'Test New User' },
    { id: '00000000-0000-0000-0000-000000000005', email: 'test-pending@e2e.local', name: 'Test Pending User' },
    { id: '00000000-0000-0000-0000-000000000006', email: 'test-declined@e2e.local', name: 'Test Declined User' },
  ];

  console.log('2. Creating auth.users...');
  for (const user of testUsers) {
    try {
      await executeQuery(`
        INSERT INTO auth.users (
          id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
          '${user.id}',
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          '${user.email}',
          crypt('TestPassword123!', gen_salt('bf')),
          now(),
          '{"provider": "email", "providers": ["email"]}',
          '{"full_name": "${user.name}"}',
          now(), now(), '', '', '', ''
        )
        ON CONFLICT (id) DO UPDATE SET
          encrypted_password = crypt('TestPassword123!', gen_salt('bf')),
          updated_at = now();
      `);
      console.log(`   Created: ${user.email}`);
    } catch (err) {
      console.log(`   Error creating ${user.email}: ${err.message}`);
    }
  }
  console.log('');

  // Step 2b: Create auth.identities (required for email/password login)
  console.log('2b. Creating auth.identities...');
  await executeQuery(`
    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    SELECT gen_random_uuid(), id, id, 'email',
           json_build_object('sub', id::text, 'email', email, 'email_verified', true),
           now(), now(), now()
    FROM auth.users WHERE email LIKE '%e2e.local'
    ON CONFLICT (provider, provider_id) DO NOTHING;
  `);
  console.log('   Done.\n');

  // Step 3: Create profiles
  console.log('3. Creating profiles...');
  await executeQuery(`
    INSERT INTO public.profiles (id, full_name, unit_id) VALUES
      ('00000000-0000-0000-0000-000000000001', 'Test Admin', '00000000-0000-0000-0000-100000000001'),
      ('00000000-0000-0000-0000-000000000002', 'Test Leader', '00000000-0000-0000-0000-100000000002'),
      ('00000000-0000-0000-0000-000000000003', 'Test User', '00000000-0000-0000-0000-100000000003'),
      ('00000000-0000-0000-0000-000000000004', 'Test New User', NULL),
      ('00000000-0000-0000-0000-000000000005', 'Test Pending User', NULL),
      ('00000000-0000-0000-0000-000000000006', 'Test Declined User', NULL)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, unit_id = EXCLUDED.unit_id;
  `);
  console.log('   Done.\n');

  // Step 4: Create user roles
  console.log('4. Creating user roles...');
  await executeQuery(`
    INSERT INTO public.user_roles (user_id, role) VALUES
      ('00000000-0000-0000-0000-000000000001', 'admin'),
      ('00000000-0000-0000-0000-000000000002', 'leader'),
      ('00000000-0000-0000-0000-000000000003', 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  `);
  console.log('   Done.\n');

  // Step 5: Create personnel records
  console.log('5. Creating personnel records...');
  await executeQuery(`
    INSERT INTO public.personnel (id, user_id, unit_id, service_number, rank, first_name, last_name, duty_position, email) VALUES
      ('00000000-0000-0000-0000-200000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-100000000001', 'E2E-ADMIN-001', 'COL', 'Test', 'Admin', 'System Administrator', 'test-admin@e2e.local'),
      ('00000000-0000-0000-0000-200000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-100000000002', 'E2E-LEADER-002', 'CPT', 'Test', 'Leader', 'Company Commander', 'test-leader@e2e.local'),
      ('00000000-0000-0000-0000-200000000003', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-100000000003', 'E2E-USER-003', 'SGT', 'Test', 'User', 'Squad Leader', 'test-user@e2e.local')
    ON CONFLICT (user_id) DO UPDATE SET rank = EXCLUDED.rank, duty_position = EXCLUDED.duty_position;
  `);
  console.log('   Done.\n');

  // Step 6: Create admin unit assignments
  console.log('6. Creating admin unit assignments...');
  await executeQuery(`
    INSERT INTO public.admin_unit_assignments (user_id, unit_id, unit_type) VALUES
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-100000000001', 'battalion'),
      ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-100000000002', 'company')
    ON CONFLICT DO NOTHING;
  `);
  console.log('   Done.\n');

  // Step 7: Create signup requests for all users
  console.log('7. Creating signup requests...');

  // Approved users need approved signup requests
  await executeQuery(`
    INSERT INTO public.signup_requests (id, user_id, full_name, email, phone, service_number, requested_unit_id, status, reviewed_by, reviewed_at) VALUES
      ('00000000-0000-0000-0000-300000000001', '00000000-0000-0000-0000-000000000001', 'Test Admin', 'test-admin@e2e.local', '+1-555-0101', 'E2E-ADMIN-001', '00000000-0000-0000-0000-100000000001', 'approved', '00000000-0000-0000-0000-000000000001', now()),
      ('00000000-0000-0000-0000-300000000002', '00000000-0000-0000-0000-000000000002', 'Test Leader', 'test-leader@e2e.local', '+1-555-0102', 'E2E-LEADER-002', '00000000-0000-0000-0000-100000000002', 'approved', '00000000-0000-0000-0000-000000000001', now()),
      ('00000000-0000-0000-0000-300000000003', '00000000-0000-0000-0000-000000000003', 'Test User', 'test-user@e2e.local', '+1-555-0103', 'E2E-USER-003', '00000000-0000-0000-0000-100000000003', 'approved', '00000000-0000-0000-0000-000000000001', now())
    ON CONFLICT (id) DO UPDATE SET status = 'approved';
  `);

  // Pending user
  await executeQuery(`
    INSERT INTO public.signup_requests (id, user_id, full_name, email, phone, service_number, requested_unit_id, status) VALUES
      ('00000000-0000-0000-0000-300000000005', '00000000-0000-0000-0000-000000000005', 'Test Pending User', 'test-pending@e2e.local', '+1-555-0105', 'E2E-PENDING-005', '00000000-0000-0000-0000-100000000003', 'pending')
    ON CONFLICT (id) DO UPDATE SET status = 'pending';
  `);

  // Declined user
  await executeQuery(`
    INSERT INTO public.signup_requests (id, user_id, full_name, email, phone, service_number, requested_unit_id, status, reviewed_by, reviewed_at, decline_reason) VALUES
      ('00000000-0000-0000-0000-300000000006', '00000000-0000-0000-0000-000000000006', 'Test Declined User', 'test-declined@e2e.local', '+1-555-0106', 'E2E-DECLINED-006', '00000000-0000-0000-0000-100000000003', 'declined', '00000000-0000-0000-0000-000000000001', now(), 'Test decline reason for E2E testing')
    ON CONFLICT (id) DO UPDATE SET status = 'declined', decline_reason = 'Test decline reason for E2E testing';
  `);

  // Note: test-new user has NO signup request (status will be 'none')
  console.log('   Done.\n');

  console.log('✅ Test users seeded successfully!');
  console.log('\nTest users:');
  console.log('  - test-admin@e2e.local (admin, approved)');
  console.log('  - test-leader@e2e.local (leader, approved)');
  console.log('  - test-user@e2e.local (user, approved)');
  console.log('  - test-new@e2e.local (no role, no request)');
  console.log('  - test-pending@e2e.local (no role, pending)');
  console.log('  - test-declined@e2e.local (no role, declined)');
  console.log('\nPassword for all: TestPassword123!');
}

main().catch(console.error);
