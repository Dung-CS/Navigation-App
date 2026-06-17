-- Draft data for testing public destination suggestions and votes.
-- Run this in the Supabase SQL editor after schema.sql and location_votes_migration.sql.
-- Safe to re-run: fixed ids and upserts keep the sample data stable.

create extension if not exists pgcrypto;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'seed-local@example.com',
    crypt('seed-password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'seed-traveler@example.com',
    crypt('seed-password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  )
on conflict (id) do update set
  updated_at = excluded.updated_at;

insert into profiles (id, username)
values
  ('10000000-0000-0000-0000-000000000001', 'seed_local'),
  ('10000000-0000-0000-0000-000000000002', 'seed_traveler')
on conflict (id) do update set
  username = excluded.username;

insert into locations (
  id,
  profile_id,
  name,
  lat,
  lng,
  category,
  is_public,
  created_at
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Turtle Lake Quiet Steps',
    10.782905,
    106.695339,
    'quiet',
    true,
    now() - interval '7 days'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Alley Coffee Only Locals Know',
    10.775810,
    106.700981,
    'local_secret',
    true,
    now() - interval '6 days'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Old Apartment Rooftop View',
    10.772196,
    106.699425,
    'hidden_gem',
    true,
    now() - interval '5 days'
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    'Book Street Corner',
    10.780079,
    106.699023,
    'attraction',
    true,
    now() - interval '4 days'
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    'Canal Sunset Bench',
    10.789692,
    106.707741,
    'nature',
    true,
    now() - interval '3 days'
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000002',
    'Private Draft Spot',
    10.790900,
    106.701600,
    'hidden_gem',
    false,
    now() - interval '2 days'
  )
on conflict (id) do update set
  profile_id = excluded.profile_id,
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  category = excluded.category,
  is_public = excluded.is_public,
  created_at = excluded.created_at;

insert into location_votes (location_id, profile_id, vote)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 1),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 1),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', -1),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 1)
on conflict (location_id, profile_id) do update set
  vote = excluded.vote,
  updated_at = now();
