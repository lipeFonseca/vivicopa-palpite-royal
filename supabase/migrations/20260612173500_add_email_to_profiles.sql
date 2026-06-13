-- Store the public profile e-mail used by Supabase Auth signups.
alter table public.profiles
add column if not exists email text;

create unique index if not exists profiles_email_unique_idx
on public.profiles (lower(email))
where email is not null;

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

  insert into public.profiles (id, username, email, role, created_at, updated_at)
  values (new.id, sanitized_username, lower(new.email), 'user', now(), now())
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email),
        updated_at = excluded.updated_at;

  return new;
end;
$$;
