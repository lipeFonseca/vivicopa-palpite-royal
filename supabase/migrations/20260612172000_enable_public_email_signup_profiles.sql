-- Ensure users created through Supabase Auth get a Vivicopa profile.
create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  sanitized_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'usuario');
  sanitized_username := lower(regexp_replace(requested_username, '[^a-zA-Z0-9_.-]+', '-', 'g'));
  sanitized_username := trim(both '-' from sanitized_username);

  if length(sanitized_username) < 3 then
    sanitized_username := 'usuario';
  end if;

  sanitized_username := left(sanitized_username, 24) || '-' || left(new.id::text, 6);

  insert into public.profiles (id, username, role, created_at, updated_at)
  values (new.id, sanitized_username, 'user', now(), now())
  on conflict (id) do update
    set updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_profile();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
    on public.profiles
    for insert
    to authenticated
    with check (auth.uid() = id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id and role = 'user');
  end if;
end;
$$;
