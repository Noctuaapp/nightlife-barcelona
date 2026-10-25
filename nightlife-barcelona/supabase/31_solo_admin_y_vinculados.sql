-- =====================================================================================
-- Noctua · Nadie crea páginas salvo el admin o alguien vinculado · 24/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- "Ningún usuario debería poder crear ninguna página ni nada que no sea yo el admin o alguien
-- vinculado." Estas reglas son RESTRICTIVAS: se cumplen siempre, aunque en Supabase haya reglas
-- antiguas más permisivas (por ejemplo, "cualquier usuario con sesión puede insertar tickets").
-- Las tareas automáticas del servidor (service role) no se ven afectadas.
--
--   clubs            crear y borrar: solo el admin (el dueño edita el suyo, no crea otros)
--   events           crear: el admin, o un organizador que Noctua YA ha vinculado a algún evento
--                    (y siempre a su nombre). Borrar: el admin o su organizador.
--   club_events      crear/borrar noches: el admin o el dueño de ese club
--   club_sessions    crear/borrar sesiones: el admin o el dueño de ese club
--   event_sessions   crear/editar/borrar: el admin o el organizador de ese evento
--   essentials       crear/editar/borrar: solo el admin
--   tickets          crear/editar/borrar: solo el admin
--
-- Lo que sigue igual: lo que cada usuario guarda de sí mismo (favoritos, check-ins, asistencias,
-- votos, mensajes de contacto, opiniones, avisos...).
-- =====================================================================================

create or replace function public.noctua_owns_club(p_club_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clubs where id = p_club_id and owner_user_id = auth.uid())
$$;

create or replace function public.noctua_owns_event(p_event_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = p_event_id and owner_user_id = auth.uid())
$$;

-- Organizador vinculado = tiene al menos un evento a su nombre (lo vincula Noctua desde el admin).
create or replace function public.noctua_is_organizer()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.events where owner_user_id = auth.uid())
$$;

-- Aplica una regla restrictiva a una tabla si existe (algunas pueden no existir en tu proyecto).
create or replace function pg_temp.noctua_restrict(p_table text, p_cmd text, p_name text, p_expr text)
returns void language plpgsql as $$
begin
  if to_regclass('public.' || p_table) is null then
    raise notice 'La tabla % no existe, se salta', p_table;
    return;
  end if;
  execute format('drop policy if exists %I on public.%I', p_name, p_table);
  if p_cmd = 'insert' then
    execute format('create policy %I on public.%I as restrictive for insert with check (%s)', p_name, p_table, p_expr);
  elsif p_cmd = 'update' then
    execute format('create policy %I on public.%I as restrictive for update using (%s) with check (%s)', p_name, p_table, p_expr, p_expr);
  else
    execute format('create policy %I on public.%I as restrictive for delete using (%s)', p_name, p_table, p_expr);
  end if;
end $$;

-- clubs
select pg_temp.noctua_restrict('clubs', 'insert', 'Solo admin crea clubs', 'public.is_noctua_admin()');
select pg_temp.noctua_restrict('clubs', 'delete', 'Solo admin borra clubs', 'public.is_noctua_admin()');

-- events
select pg_temp.noctua_restrict('events', 'insert', 'Solo admin u organizador vinculado crea eventos',
  'public.is_noctua_admin() or (owner_user_id = auth.uid() and public.noctua_is_organizer())');
select pg_temp.noctua_restrict('events', 'delete', 'Solo admin u organizador borra su evento',
  'public.is_noctua_admin() or owner_user_id = auth.uid()');

-- club_events (noches de club)
select pg_temp.noctua_restrict('club_events', 'insert', 'Solo admin o dueño crea noches',
  'public.is_noctua_admin() or public.noctua_owns_club(club_id)');
select pg_temp.noctua_restrict('club_events', 'delete', 'Solo admin o dueño borra noches',
  'public.is_noctua_admin() or public.noctua_owns_club(club_id)');

-- club_sessions (sesiones semanales)
select pg_temp.noctua_restrict('club_sessions', 'insert', 'Solo admin o dueño crea sesiones',
  'public.is_noctua_admin() or public.noctua_owns_club(club_id)');
select pg_temp.noctua_restrict('club_sessions', 'delete', 'Solo admin o dueño borra sesiones',
  'public.is_noctua_admin() or public.noctua_owns_club(club_id)');

-- event_sessions (line-up / días de un festival)
select pg_temp.noctua_restrict('event_sessions', 'insert', 'Solo admin u organizador crea sesiones de evento',
  'public.is_noctua_admin() or public.noctua_owns_event(event_id)');
select pg_temp.noctua_restrict('event_sessions', 'update', 'Solo admin u organizador edita sesiones de evento',
  'public.is_noctua_admin() or public.noctua_owns_event(event_id)');
select pg_temp.noctua_restrict('event_sessions', 'delete', 'Solo admin u organizador borra sesiones de evento',
  'public.is_noctua_admin() or public.noctua_owns_event(event_id)');

-- essentials y tickets: solo el admin
select pg_temp.noctua_restrict('essentials', 'insert', 'Solo admin crea esenciales', 'public.is_noctua_admin()');
select pg_temp.noctua_restrict('essentials', 'update', 'Solo admin edita esenciales', 'public.is_noctua_admin()');
select pg_temp.noctua_restrict('essentials', 'delete', 'Solo admin borra esenciales', 'public.is_noctua_admin()');
select pg_temp.noctua_restrict('tickets', 'insert', 'Solo admin crea tickets', 'public.is_noctua_admin()');
select pg_temp.noctua_restrict('tickets', 'update', 'Solo admin edita tickets', 'public.is_noctua_admin()');
select pg_temp.noctua_restrict('tickets', 'delete', 'Solo admin borra tickets', 'public.is_noctua_admin()');

-- Comprobación: las reglas creadas.
select tablename as tabla, policyname as regla, cmd as accion
from pg_policies
where schemaname = 'public' and permissive = 'RESTRICTIVE' and policyname like 'Solo %'
order by tablename, cmd;
