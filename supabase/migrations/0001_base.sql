-- Sidequest, base schema.
--
-- Four things here are expensive to change once there is data, and they
-- are the reason this file looks heavier than the app needs today:
--
--   1. deleted_at on everything syncable. Without a tombstone, sync
--      cannot tell "deleted on my phone" from "not yet uploaded from my
--      phone", and deleted games resurrect on the next pull.
--   2. Two clocks. updated_at is server-assigned and is the PULL CURSOR;
--      client_updated_at is what the device believed and is used only to
--      resolve conflicts. One column cannot be both, because device
--      clocks drift and people change them.
--   3. games is shared, not copied per user. A thousand people saving
--      Zelda should be one row, not a thousand jsonb blobs.
--   4. profiles exists even though nothing reads it yet, because
--      auth.users must never be exposed to another user and a public
--      identity cannot be backfilled cheaply.
--
-- Sessions and drops are append-only. They count real life, and
-- last-write-wins on a counter silently discards a week logged on
-- another device.

-- ---------------------------------------------------------------- utils

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------- profiles

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  -- Null until someone shares something and needs a name on it. A handle
  -- is a public fact and belongs nowhere near auth.users.
  handle       text unique,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- games
-- A cache of public RAWG data, keyed by RAWG id. The client keeps its own
-- local snapshot regardless, so this table is not on the critical path
-- for anybody's library — it exists so that questions about the whole
-- population ("what do people actually finish") remain askable later.

create table public.games (
  id               integer primary key,
  slug             text,
  name             text not null,
  background_image text,
  released         date,
  playtime         real,
  metacritic       smallint,
  data             jsonb,
  updated_at       timestamptz not null default now()
);

create trigger games_touch before update on public.games
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------- library_entries

create table public.library_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  game_id           integer not null references public.games (id),

  status            text not null check (status in ('wishlist','playing','finished')),
  added_at          timestamptz not null,
  finished_at       timestamptz,
  hours_played      real,
  steam_app_id      integer,
  deadline          timestamptz,
  want              smallint check (want between 1 and 3),
  note              text,
  rating            smallint check (rating between 1 and 5),
  tags              text[],

  client_updated_at timestamptz not null,
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,

  unique (user_id, game_id)
);

create index library_entries_pull on public.library_entries (user_id, updated_at);
create trigger library_entries_touch before update on public.library_entries
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------- game_durations
-- Your own answer to "how long does this take", which beats every
-- estimate the app can find. Per user, per game.

create table public.game_durations (
  user_id           uuid not null references auth.users (id) on delete cascade,
  game_id           integer not null,
  hours             real not null,
  source            text,
  client_updated_at timestamptz not null,
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  primary key (user_id, game_id)
);

create index game_durations_pull on public.game_durations (user_id, updated_at);
create trigger game_durations_touch before update on public.game_durations
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------- play_sessions
-- Append-only. The id is generated on the DEVICE so that replaying an
-- unsynced queue is idempotent rather than double-counting an evening.

create table public.play_sessions (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  game_id    integer not null,
  started_at timestamptz not null,
  minutes    integer not null check (minutes > 0 and minutes <= 480),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index play_sessions_pull on public.play_sessions (user_id, updated_at);
create trigger play_sessions_touch before update on public.play_sessions
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------- drops
-- Also append-only, and for the same reason: this is the count of games
-- somebody gave themselves permission to stop playing, which is the
-- product's whole thesis. It should not be lossy.

create table public.drops (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  game_id    integer,
  reason     text not null,
  dropped_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index drops_pull on public.drops (user_id, updated_at);
create trigger drops_touch before update on public.drops
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------- preferences

create table public.preferences (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  pace              smallint,
  plan_window       text,
  steam             jsonb,
  client_updated_at timestamptz not null,
  updated_at        timestamptz not null default now()
);

create trigger preferences_touch before update on public.preferences
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------- RLS
-- Every table on. Without this an anon key is a public read of everyone's
-- library, which is the single worst thing this schema could ship with.

alter table public.profiles        enable row level security;
alter table public.games           enable row level security;
alter table public.library_entries enable row level security;
alter table public.game_durations  enable row level security;
alter table public.play_sessions   enable row level security;
alter table public.drops           enable row level security;
alter table public.preferences     enable row level security;

-- Own row only.
create policy "own profile read"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile write"  on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Games are public RAWG data. Readable by anyone signed in; writable by
-- them too, because the client upserts on save. Noted as a deliberate
-- trade: the client holds its own snapshot, so a corrupted row here
-- degrades future aggregates rather than anybody's library.
create policy "games read"  on public.games for select to authenticated using (true);
create policy "games write" on public.games for insert to authenticated with check (true);
create policy "games amend" on public.games for update to authenticated using (true) with check (true);

create policy "own entries"   on public.library_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own durations" on public.game_durations  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own sessions"  on public.play_sessions   for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own drops"     on public.drops           for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own prefs"     on public.preferences     for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
