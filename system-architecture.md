# System Architecture

```mermaid
flowchart LR
  user[User on Mobile or Browser]

  subgraph browser[Frontend]
    pages[EJS Pages<br/>index, drops, friend, account,<br/>login, register]
    client[index.js<br/>UI logic, compass flow, fetch calls]
    geo[Browser Geolocation API]
    orient[Browser Device Orientation API]
    publicSupabase[Supabase JS Client<br/>anon key]
    storage[localStorage and sessionStorage]
  end

  subgraph app[Node/Express Application]
    server[backend/server.js<br/>Express, EJS rendering, Vite middleware]
    authRoutes[/auth routes<br/>register, login, me, username lookup/]
    locationRoutes[/location routes<br/>save, list, update, delete, share, suggestions, votes/]
    friendRoutes[/friend routes<br/>requests, accept, reject, remove/]
    serviceClient[Supabase service-role client<br/>backend/supabase/db.js]
  end

  subgraph supabase[Supabase Cloud]
    supabaseAuth[Supabase Auth<br/>users and JWT verification]
    db[(Postgres Database)]
    profiles[(profiles)]
    locations[(locations)]
    friends[(friends)]
    shares[(location_shares)]
    votes[(location_votes)]
  end

  user --> pages
  pages --> client
  client --> geo
  client --> orient
  client --> storage
  client -->|HTTP fetch + bearer token| server
  client -->|uses SDK for auth session support| publicSupabase

  server --> authRoutes
  server --> locationRoutes
  server --> friendRoutes

  authRoutes --> serviceClient
  locationRoutes --> serviceClient
  friendRoutes --> serviceClient

  publicSupabase -. frontend auth client .-> supabase
  serviceClient --> supabaseAuth
  serviceClient --> db

  db --> profiles
  db --> locations
  db --> friends
  db --> shares
  db --> votes

  supabaseAuth -->|auth.users referenced by| profiles
  profiles -->|owns| locations
  profiles -->|user_id and friend_id| friends
  locations -->|shared location_id| shares
  profiles -->|shared_by and shared_with| shares
  locations -->|voted location_id| votes
  profiles -->|voter profile_id| votes
```

## Component Summary

- **Frontend:** EJS views in `frontend/` render the Compass, Drops, Social, Account, Login, and Register screens. `frontend/index.js` handles UI interactions, browser geolocation, device orientation, local/session storage, and API calls.
- **Backend:** `backend/server.js` runs Express, renders EJS pages, serves Vite middleware during development, and mounts `/auth`, `/location`, and `/friend` routers.
- **Authentication:** The backend uses Supabase Auth to register, log in, verify JWT bearer tokens, and connect authenticated users to `profiles`.
- **Data Storage:** Supabase Postgres stores user profiles, saved locations, friend relationships, shared locations, and location votes.
- **External Services:** The app depends on Supabase Cloud for authentication and database access, the browser Geolocation API for latitude/longitude, the browser Device Orientation API for compass heading, and the Supabase JS client loaded by `frontend/supabaseClient.js`.

## Main Request Flows

1. **Register/Login:** Browser submits credentials to `/auth/register` or `/auth/login`; Express calls Supabase Auth; the frontend stores the returned access token.
2. **Save Location:** Browser reads coordinates from Geolocation, sends them with the access token to `/location`; Express verifies the token and inserts a row in `locations`.
3. **Friends and Sharing:** Browser calls `/friend/*` to manage friend relationships, then `/location/share` to create `location_shares` records.
4. **Suggestions and Voting:** Browser sends current coordinates and filters to `/location/suggestions`; Express reads public locations, computes distance and ranking, joins vote totals, and returns suggestions. Votes are saved through `/location/:id/vote`.
5. **Compass Navigation:** Browser uses Geolocation and Device Orientation locally to render the live arrow and distance view for a selected destination.
