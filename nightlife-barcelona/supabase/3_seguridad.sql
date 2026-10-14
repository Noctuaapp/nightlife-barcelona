-- =====================================================================================
-- Noctua · Tanda F (seguridad) · 14/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
-- =====================================================================================

-- 1) ¿La persona que hace la petición está bloqueada? (lo usan las políticas de abajo)
create or replace function public.is_blocked_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
$$;
grant execute on function public.is_blocked_user() to anon, authenticated;

-- 2) Una cuenta bloqueada no puede escribir en estas tablas: reseñas, "asistiré", check-ins,
--    favoritos, denegaciones de entrada. Son políticas RESTRICTIVAS: se suman a las que ya hay (no las
--    sustituyen). El formulario de contacto sigue abierto a propósito, para poder reclamar.
do $$
declare
  t text;
begin
  foreach t in array array[
    'club_reviews', 'event_reviews', 'essential_reviews', 'attendances', 'club_checkins',
    'favorites', 'favorite_collections', 'entry_denials', 'club_live_notes'
  ] loop
    -- Solo tablas de verdad (club_live_notes, por ejemplo, es una vista: se salta).
    if exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relkind in ('r', 'p')
    ) then
      execute format('drop policy if exists no_blocked_insert on public.%I', t);
      execute format(
        'create policy no_blocked_insert on public.%I as restrictive for insert to authenticated with check (not public.is_blocked_user())', t);
      execute format('drop policy if exists no_blocked_update on public.%I', t);
      execute format(
        'create policy no_blocked_update on public.%I as restrictive for update to authenticated using (not public.is_blocked_user())', t);
    end if;
  end loop;
end $$;

-- 3) Columnas que solo decide Noctua. Un dueño edita su ficha desde /mi-club, pero no puede
--    marcarse "verificado", "en tendencia", cambiarse la valoración ni pasar la ficha a otra
--    cuenta, aunque lo intente enviando la petición a mano. El admin y las tareas del servidor
--    (service role) no se ven afectados.
create or replace function public.protect_club_columns()
returns trigger
language plpgsql
as $$
declare
  safe jsonb;
begin
  if current_user in ('anon', 'authenticated') and not public.is_noctua_admin() then
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into safe
    from jsonb_each(to_jsonb(old))
    where key in ('verified', 'trending', 'rating', 'owner_user_id', 'featured', 'place_id')
       or key like 'google\_%';
    new := jsonb_populate_record(new, safe);
  end if;
  return new;
end $$;

drop trigger if exists protect_club_columns_trg on public.clubs;
create trigger protect_club_columns_trg
  before update on public.clubs
  for each row execute function public.protect_club_columns();

-- Lo mismo para los festivales que gestiona su organizador desde /mi-festival.
create or replace function public.protect_event_columns()
returns trigger
language plpgsql
as $$
declare
  safe jsonb;
begin
  if current_user in ('anon', 'authenticated') and not public.is_noctua_admin() then
    if tg_op = 'INSERT' then
      -- Un organizador crea su festival sin destacar y sin ocultar.
      safe := jsonb_build_object('featured', false, 'hidden', false);
    else
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into safe
      from jsonb_each(to_jsonb(old))
      where key in ('featured', 'hidden', 'owner_user_id', 'place_id')
         or key like 'google\_%';
    end if;
    new := jsonb_populate_record(new, safe);
  end if;
  return new;
end $$;

drop trigger if exists protect_event_columns_trg on public.events;
create trigger protect_event_columns_trg
  before insert or update on public.events
  for each row execute function public.protect_event_columns();

-- 4) Analítica: se borran las filas de más de 13 meses (lo llama cada lunes la tarea
--    /api/cron/purge-analytics). Solo la puede ejecutar el servidor.
create or replace function public.purge_old_analytics(p_months int default 13)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.analytics where created_at < now() - make_interval(months => greatest(p_months, 6));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.purge_old_analytics(int) from public, anon, authenticated;
grant execute on function public.purge_old_analytics(int) to service_role;

-- 5) Comprobación: debe devolver 2 filas de triggers y las políticas creadas.
select tgname, tgrelid::regclass as tabla from pg_trigger where tgname in ('protect_club_columns_trg', 'protect_event_columns_trg');
select tablename, policyname from pg_policies where policyname in ('no_blocked_insert', 'no_blocked_update') order by 1, 2;
