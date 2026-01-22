-- ============================================
-- DUTY APP - E2E Test Users Seed Script
-- ============================================
-- Run this script to create test users for E2E testing.
-- These users have predictable UUIDs and credentials.
--
-- IMPORTANT: Only run this in development/test environments!
-- Test users use @e2e.local domain (non-routable).
--
-- Usage with Supabase CLI:
--   npx supabase db reset (runs all migrations + seed)
--   OR
--   psql <connection-string> -f supabase/seed-test-users.sql
--
-- All test users share the same password: TestPassword123!
-- ============================================

-- Create a test battalion first (needed for unit references)
INSERT INTO public.units (id, unit_type, parent_id, name, designation, status)
VALUES (
  '00000000-0000-0000-0000-100000000001',
  'battalion',
  NULL,
  'Test Battalion',
  'TEST-BN',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Create a test company under the battalion
INSERT INTO public.units (id, unit_type, parent_id, name, designation, status)
VALUES (
  '00000000-0000-0000-0000-100000000002',
  'company',
  '00000000-0000-0000-0000-100000000001',
  'Alpha Company',
  'A-CO',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Create a test platoon under the company
INSERT INTO public.units (id, unit_type, parent_id, name, designation, status)
VALUES (
  '00000000-0000-0000-0000-100000000003',
  'platoon',
  '00000000-0000-0000-0000-100000000002',
  'First Platoon',
  '1-PLT',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEST USER 1: Admin (approved, admin role)
-- Email: test-admin@e2e.local
-- ============================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test-admin@e2e.local',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('TestPassword123!', gen_salt('bf')),
  updated_at = now();

-- Admin profile (auto-created by trigger, but ensure it exists)
INSERT INTO public.profiles (id, full_name, unit_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Admin',
  '00000000-0000-0000-0000-100000000001'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Test Admin',
  unit_id = '00000000-0000-0000-0000-100000000001';

-- Admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Admin personnel record
INSERT INTO public.personnel (id, user_id, unit_id, service_number, rank, first_name, last_name, duty_position, email)
VALUES (
  '00000000-0000-0000-0000-200000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-100000000001',
  'E2E-ADMIN-001',
  'COL',
  'Test',
  'Admin',
  'System Administrator',
  'test-admin@e2e.local'
)
ON CONFLICT (user_id) DO UPDATE SET
  rank = 'COL',
  duty_position = 'System Administrator';

-- Admin unit assignment (battalion level)
INSERT INTO public.admin_unit_assignments (user_id, unit_id, unit_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-100000000001',
  'battalion'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- TEST USER 2: Leader (approved, leader role)
-- Email: test-leader@e2e.local
-- ============================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test-leader@e2e.local',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Leader"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('TestPassword123!', gen_salt('bf')),
  updated_at = now();

INSERT INTO public.profiles (id, full_name, unit_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Test Leader',
  '00000000-0000-0000-0000-100000000002'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Test Leader',
  unit_id = '00000000-0000-0000-0000-100000000002';

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', 'leader')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.personnel (id, user_id, unit_id, service_number, rank, first_name, last_name, duty_position, email)
VALUES (
  '00000000-0000-0000-0000-200000000002',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-100000000002',
  'E2E-LEADER-002',
  'CPT',
  'Test',
  'Leader',
  'Company Commander',
  'test-leader@e2e.local'
)
ON CONFLICT (user_id) DO UPDATE SET
  rank = 'CPT',
  duty_position = 'Company Commander';

-- Leader unit assignment (company level)
INSERT INTO public.admin_unit_assignments (user_id, unit_id, unit_type)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-100000000002',
  'company'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- TEST USER 3: Regular User (approved, user role)
-- Email: test-user@e2e.local
-- ============================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test-user@e2e.local',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('TestPassword123!', gen_salt('bf')),
  updated_at = now();

INSERT INTO public.profiles (id, full_name, unit_id)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Test User',
  '00000000-0000-0000-0000-100000000003'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Test User',
  unit_id = '00000000-0000-0000-0000-100000000003';

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000003', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.personnel (id, user_id, unit_id, service_number, rank, first_name, last_name, duty_position, email)
VALUES (
  '00000000-0000-0000-0000-200000000003',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-100000000003',
  'E2E-USER-003',
  'SGT',
  'Test',
  'User',
  'Squad Leader',
  'test-user@e2e.local'
)
ON CONFLICT (user_id) DO UPDATE SET
  rank = 'SGT',
  duty_position = 'Squad Leader';

-- ============================================
-- TEST USER 4: New User (no signup request, no role)
-- Email: test-new@e2e.local
-- ============================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test-new@e2e.local',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test New User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('TestPassword123!', gen_salt('bf')),
  updated_at = now();

INSERT INTO public.profiles (id, full_name)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Test New User'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Test New User';

-- No user_roles entry (new user)
-- No personnel entry (not approved)
-- No signup_requests entry (hasn't submitted yet)

-- ============================================
-- TEST USER 5: Pending User (pending signup request)
-- Email: test-pending@e2e.local
-- ============================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test-pending@e2e.local',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Pending User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('TestPassword123!', gen_salt('bf')),
  updated_at = now();

INSERT INTO public.profiles (id, full_name)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'Test Pending User'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Test Pending User';

-- Pending signup request
INSERT INTO public.signup_requests (id, user_id, full_name, email, phone, service_number, requested_unit_id, status)
VALUES (
  '00000000-0000-0000-0000-300000000005',
  '00000000-0000-0000-0000-000000000005',
  'Test Pending User',
  'test-pending@e2e.local',
  '+1-555-0105',
  'E2E-PENDING-005',
  '00000000-0000-0000-0000-100000000003',
  'pending'
)
ON CONFLICT (id) DO UPDATE SET
  status = 'pending';

-- ============================================
-- TEST USER 6: Declined User (declined signup request)
-- Email: test-declined@e2e.local
-- ============================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test-declined@e2e.local',
  crypt('TestPassword123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Declined User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('TestPassword123!', gen_salt('bf')),
  updated_at = now();

INSERT INTO public.profiles (id, full_name)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'Test Declined User'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Test Declined User';

-- Declined signup request
INSERT INTO public.signup_requests (id, user_id, full_name, email, phone, service_number, requested_unit_id, status, reviewed_by, reviewed_at, decline_reason)
VALUES (
  '00000000-0000-0000-0000-300000000006',
  '00000000-0000-0000-0000-000000000006',
  'Test Declined User',
  'test-declined@e2e.local',
  '+1-555-0106',
  'E2E-DECLINED-006',
  '00000000-0000-0000-0000-100000000003',
  'declined',
  '00000000-0000-0000-0000-000000000001', -- Reviewed by admin
  now(),
  'Test decline reason for E2E testing'
)
ON CONFLICT (id) DO UPDATE SET
  status = 'declined',
  decline_reason = 'Test decline reason for E2E testing';

-- ============================================
-- GRANT EXTENSION USAGE (required for password hashing)
-- ============================================
-- Note: This extension should already exist in Supabase.
-- If running locally, ensure pgcrypto is enabled:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT 'Test users seeded successfully!' AS status;
