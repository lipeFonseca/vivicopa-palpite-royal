create schema if not exists app_private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_.-]{3,32}$')
);

alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
grant update (username, updated_at) on public.profiles to authenticated;
grant all on public.profiles to service_role;

create or replace function app_private.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

revoke all on function app_private.is_admin(uuid) from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_admin(uuid) to authenticated;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or app_private.is_admin(auth.uid()));

drop policy if exists profiles_update_own_username on public.profiles;
create policy profiles_update_own_username
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function app_private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_username text;
  requested_role text;
begin
  requested_username := coalesce(
    nullif(new.raw_app_meta_data->>'username', ''),
    split_part(new.email, '@', 1)
  );

  requested_role := case
    when new.raw_app_meta_data->>'role' = 'admin' then 'admin'
    else 'user'
  end;

  insert into public.profiles (id, username, role)
  values (new.id, requested_username, requested_role)
  on conflict (id) do update
    set username = excluded.username,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function app_private.handle_new_user_profile();

insert into public.profiles (id, username, role)
select
  u.id,
  coalesce(nullif(u.raw_app_meta_data->>'username', ''), split_part(u.email, '@', 1)),
  case when u.raw_app_meta_data->>'role' = 'admin' then 'admin' else 'user' end
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);
