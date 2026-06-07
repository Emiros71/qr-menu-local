alter table public.profiles
    add column if not exists venue_ids uuid[] default '{}'::uuid[];

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'venue_id'
    ) then
        execute $sql$
            update public.profiles
            set venue_ids = case
                when venue_id is not null and (venue_ids is null or cardinality(venue_ids) = 0)
                    then array[venue_id]
                else coalesce(venue_ids, '{}'::uuid[])
            end
        $sql$;
    end if;
end $$;

alter table public.profiles
    alter column venue_ids set default '{}'::uuid[];

create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name, role, venue_ids)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        'VENUE_MANAGER'::public.user_role,
        '{}'::uuid[]
    )
    on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

alter table public.audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.audit_logs;
create policy "Admins can view audit logs"
    on public.audit_logs for select
    using (auth.role() = 'authenticated');

drop policy if exists "Admins can insert audit logs" on public.audit_logs;
create policy "Admins can insert audit logs"
    on public.audit_logs for insert
    with check (auth.role() = 'authenticated');
