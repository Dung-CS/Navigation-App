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

alter table location_votes enable row level security;

drop policy if exists "location_votes_select_public" on location_votes;
create policy "location_votes_select_public"
on location_votes
for select
to authenticated
using (
  exists (
    select 1
    from locations
    where locations.id = location_votes.location_id
      and locations.is_public = true
  )
);

drop policy if exists "location_votes_insert_own_public" on location_votes;
create policy "location_votes_insert_own_public"
on location_votes
for insert
to authenticated
with check (
  auth.uid() = profile_id
  and exists (
    select 1
    from locations
    where locations.id = location_votes.location_id
      and locations.is_public = true
  )
);

drop policy if exists "location_votes_update_own_public" on location_votes;
create policy "location_votes_update_own_public"
on location_votes
for update
to authenticated
using (auth.uid() = profile_id)
with check (
  auth.uid() = profile_id
  and exists (
    select 1
    from locations
    where locations.id = location_votes.location_id
      and locations.is_public = true
  )
);

drop policy if exists "location_votes_delete_own" on location_votes;
create policy "location_votes_delete_own"
on location_votes
for delete
to authenticated
using (auth.uid() = profile_id);
