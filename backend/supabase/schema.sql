create table profiles (
    id uuid primary key references auth.users(id),
    username text,
    created_at timestamp default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text,
  lat double precision,
  lng double precision,
  created_at timestamp default now()
);