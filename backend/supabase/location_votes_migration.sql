alter table locations
drop constraint if exists locations_category_check;

-- Run backend/supabase/suggestion_seed.sql after this file if you want draft
-- public locations and votes for testing the suggestion feature.

alter table locations
add constraint locations_category_check
check (category in (
  'hidden_gem',
  'local_secret',
  'attraction',
  'food',
  'drink',
  'entertain',
  'nature',
  'quiet',
  'other'
));

create table if not exists location_votes (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  vote smallint check (vote in (-1, 1)),
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(location_id, profile_id)
);
