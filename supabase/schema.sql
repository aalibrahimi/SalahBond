-- SalahBond — buddy system schema
-- Safe to run more than once: every statement is idempotent.
-- Run in the Supabase Dashboard → SQL Editor.
--
-- Auth: the app signs users in anonymously (Authentication → Sign In / Up →
-- "Allow anonymous sign-ins" must be ON) and passes a display_name in the
-- user metadata; the trigger below turns that into a profile + invite code.

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Brother',
  invite_code text not null unique
    default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users manage their own profile" on public.profiles;
create policy "users manage their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Auto-create a profile on signup (anonymous users included).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Brother'))
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

drop policy if exists "see own buddy rows" on public.buddies;
create policy "see own buddy rows"
  on public.buddies for select to authenticated
  using (auth.uid() in (requester, addressee));

drop policy if exists "request a buddy" on public.buddies;
create policy "request a buddy"
  on public.buddies for insert to authenticated
  with check (auth.uid() = requester);

drop policy if exists "addressee accepts" on public.buddies;
create policy "addressee accepts"
  on public.buddies for update to authenticated
  using (auth.uid() = addressee);

drop policy if exists "either side removes" on public.buddies;
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

drop policy if exists "own status full access" on public.prayer_status;
create policy "own status full access"
  on public.prayer_status for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Buddies see today only (±1 day of server date to absorb timezones) —
-- never a history of misses.
drop policy if exists "buddies see today's status" on public.prayer_status;
create policy "buddies see today's status"
  on public.prayer_status for select to authenticated
  using (
    date between current_date - 1 and current_date + 1
    and exists (
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

drop policy if exists "see nudges involving me" on public.nudges;
create policy "see nudges involving me"
  on public.nudges for select to authenticated
  using (auth.uid() in (from_user, to_user));

drop policy if exists "send nudges only to accepted buddies" on public.nudges;
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

-- ============ RPCs used by the app ============

-- Add a brother by invite code. Looks the code up server-side so profiles
-- never need to be searchable by the client. If they already requested us,
-- this accepts instead of creating a second row.
create or replace function public.add_buddy_by_code(code text)
returns table (buddy_row_id bigint, status text, display_name text)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target uuid;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;

  select id into target from profiles where invite_code = upper(trim(code));
  if target is null then raise exception 'NO_SUCH_CODE'; end if;
  if target = me then raise exception 'SELF'; end if;

  -- They asked first → accept.
  update buddies set status = 'accepted'
   where requester = target and addressee = me and status = 'pending';
  if found then
    return query
      select b.id, b.status, p.display_name
      from buddies b join profiles p on p.id = target
      where b.requester = target and b.addressee = me;
    return;
  end if;

  -- Already linked in either direction → return it as-is.
  if exists (select 1 from buddies where requester = target and addressee = me) then
    return query
      select b.id, b.status, p.display_name
      from buddies b join profiles p on p.id = target
      where b.requester = target and b.addressee = me;
    return;
  end if;

  insert into buddies (requester, addressee) values (me, target)
  on conflict (requester, addressee) do nothing;

  return query
    select b.id, b.status, p.display_name
    from buddies b join profiles p on p.id = target
    where b.requester = me and b.addressee = target;
end $$;

-- Everyone I'm linked to (pending or accepted) plus their status for the
-- given local date. The client passes its own date so midnight is right in
-- the user's timezone, not the server's.
create or replace function public.buddy_overview(p_date date)
returns table (
  buddy_row_id bigint,
  user_id uuid,
  display_name text,
  status text,
  direction text,
  prayed_today int,
  status_updated_at timestamptz
)
language sql security invoker stable as $$
  select
    b.id,
    p.id,
    p.display_name,
    b.status,
    case when b.requester = auth.uid() then 'outgoing' else 'incoming' end,
    coalesce(s.prayed_count, 0),
    s.updated_at
  from public.buddies b
  join public.profiles p
    on p.id = case when b.requester = auth.uid() then b.addressee else b.requester end
  left join public.prayer_status s
    on s.user_id = p.id and s.date = p_date
  where auth.uid() in (b.requester, b.addressee)
  order by b.status asc, b.created_at asc;
$$;

grant execute on function public.add_buddy_by_code(text) to authenticated;
grant execute on function public.buddy_overview(date) to authenticated;
