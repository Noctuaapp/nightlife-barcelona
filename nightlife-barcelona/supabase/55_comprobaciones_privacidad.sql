-- =====================================================================================
-- Noctua · Comprobaciones para la revisión de privacidad y analítica · 30/10/2026
-- SOLO LEE: no cambia nada. Ejecútalo entero en Supabase › SQL Editor y pásame el resultado
-- (captura o «Copy» de la tabla).
--
-- Hay cosas que la web promete o enseña y cuyo código no está en el repositorio (viven solo en Supabase).
-- Esto las comprueba:
--   1 · Qué borra de verdad «Eliminar mi cuenta» (función delete_current_user).
--   2 · Qué tablas se borran solas al borrar un usuario (y cuáles no).
--   3 · Tablas con una columna de usuario SIN enlace: sus filas podrían quedarse tras borrar la cuenta.
--   4 · Cuántos mensajes de contacto llevan más de 12 meses (la política dice que se conservan hasta 12).
--   5 · Que la limpieza de analítica (13 meses) funciona: fila más antigua guardada.
--   6 · Que se guardan visitas de fichas de «noche de club» (club_event) y de qué tipos hay.
--   7 · Si las estadísticas de Datos › Eventos incluyen las noches de club.
-- =====================================================================================

with
fn as (
  select p.proname::text as proname, pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('delete_current_user', 'admin_data_items', 'admin_data_overview', 'admin_data_audience')
),
fks as (
  select c.conrelid::regclass::text as tabla,
         a.attname::text as columna,
         c.confrelid::regclass::text as apunta_a,
         case c.confdeltype
           when 'c' then 'se borra en cascada'
           when 'n' then 'se pone a null'
           when 'a' then 'no action (puede bloquear el borrado)'
           when 'r' then 'restrict (bloquea el borrado)'
           else 'otro'
         end as al_borrar
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
  where c.contype = 'f'
    and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
    and c.connamespace = 'public'::regnamespace
),
loose as (
  select t.table_name::text as table_name, c.column_name::text as column_name
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and c.column_name in ('user_id', 'owner_user_id', 'created_by', 'author_id')
    and not exists (
      select 1 from fks f
      where f.tabla in (c.table_name, 'public.' || c.table_name) and f.columna = c.column_name
    )
)
select * from (
  select '1 · delete_current_user' as comprobacion, left(def, 1800) as detalle
    from fn where proname = 'delete_current_user'
  union all
  select '2 · enlace a usuarios: ' || tabla || '.' || columna, 'apunta a ' || apunta_a || ' · ' || al_borrar
    from fks
  union all
  select '3 · columna de usuario SIN enlace (puede quedar al borrar la cuenta)', table_name || '.' || column_name
    from loose
  union all
  select '4 · mensajes de contacto de más de 12 meses', count(*)::text
    from public.contact_messages where created_at < now() - interval '12 months'
  union all
  select '5 · analítica: fila más antigua y total', coalesce(min(created_at)::text, '-') || ' · ' || count(*) || ' filas'
    from public.analytics
  union all
  select '6 · fichas vistas en 30 días, tipo: ' || coalesce(item_type, '(sin tipo)'), count(*)::text
    from public.analytics
    where event_type = 'page_view' and created_at > now() - interval '30 days'
    group by item_type
  union all
  select '7 · admin_data_items menciona club_event', (position('club_event' in def) > 0)::text
    from fn where proname = 'admin_data_items'
  union all
  select '8 · funciones admin_data_* que existen', coalesce(string_agg(proname, ', '), 'ninguna')
    from fn where proname like 'admin\_data\_%'
) r
order by 1;
