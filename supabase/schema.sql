-- SalahBond — buddy system schema
-- Run this once in the Supabase Dashboard → SQL Editor.

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Brother',
  invite_code text not null unique
    default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "users manage their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Auto-create a profile on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Brother'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ buddies ============
create table if not exists public.buddies (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee),
  unique (requester, addressee)
);

alter table public.buddies enable row level security;

create policy "see own buddy rows"
  on public.buddies for select to authenticated
  using (auth.uid() in (requester, addressee));

create policy "request a buddy"
  on public.buddies for insert to authenticated
  with check (auth.uid() = requester);

create policy "addressee accepts"
  on public.buddies for update to authenticated
  using (auth.uid() = addressee);

create policy "either side removes"
  on public.buddies for delete to authenticated
  using (auth.uid() in (requester, addressee));

-- ============ daily prayer status (what buddies see) ============
create table if not exists public.prayer_status (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  prayed_count int not null default 0 check (prayed_count between 0 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.prayer_status enable row level security;

create policy "own status full access"
  on public.prayer_status for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "buddies see today's status"
  on public.prayer_status for select to authenticated
  using (
    exists (
      select 1 from public.buddies b
      where b.status = 'accepted'
        and ((b.requester = auth.uid() and b.addressee = user_id)
          or (b.addressee = auth.uid() and b.requester = user_id))
    )
  );

-- ============ nudges ============
create table if not exists public.nudges (
  id bigint generated always as identity primary key,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  window_key text not null check (window_key in ('fajr', 'zuhrayn', 'maghribayn')),
  date date not null default current_date,
  message text not null,
  created_at timestamptz not null default now(),
  -- one nudge per buddy per prayer window per day
  unique (from_user, to_user, window_key, date)
);

alter table public.nudges enable row level security;

create policy "see nudges involving me"
  on public.nudges for select to authenticated
  using (auth.uid() in (from_user, to_user));

create policy "send nudges only to accepted buddies"
  on public.nudges for insert to authenticated
  with check (
    auth.uid() = from_user
    and exists (
      select 1 from public.buddies b
      where b.status = 'accepted'
        and ((b.requester = from_user and b.addressee = to_user)
          or (b.addressee = from_user and b.requester = to_user))
    )
  );
