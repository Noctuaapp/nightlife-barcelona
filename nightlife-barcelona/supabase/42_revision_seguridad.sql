-- =====================================================================================
-- Noctua · Revisión de seguridad de la base de datos · 26/10/2026
-- SOLO LEE: no cambia nada. Ejecútalo en Supabase › SQL Editor y pásame el resultado
-- (captura o «Copy» de la tabla). Cada fila es algo que conviene mirar; si sale vacío, perfecto.
--
--   A · Tablas sin RLS (cualquiera con la clave pública podría leerlas o cambiarlas)
--   B · Reglas que dejan ESCRIBIR a cualquiera sin condición
--   C · Reglas que dejan LEER a todo el mundo tablas con datos personales
--   D · Vistas que se saltan las reglas de las tablas (y que la web pública puede consultar)
--   E · Funciones con permisos de administrador que puede llamar alguien sin sesión
--   F · Carpetas de fotos públicas que aceptan subidas de cualquiera
--   G · Columnas de perfiles que cualquiera puede leer
-- =====================================================================================

with
sensitive(t) as (values
  ('profiles'), ('contact_messages'), ('entry_denials'), ('analytics'), ('attendances'), ('favorites'),
  ('notifications'), ('club_checkin_reports'), ('venue_review_reports'), ('venue_review_thanks'),
  ('admin_notifications'), ('admin_audit_log'), ('site_feedback'), ('party_poll_votes'), ('xp_events')
),
a as (
  select 'A · Tabla sin RLS' as revision, c.relname::text as objeto, 'Activa RLS o bórrala si no se usa' as detalle
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
),
b as (
  select 'B · Escritura sin condición', p.tablename || ' · ' || p.policyname,
         p.cmd || ' para ' || array_to_string(p.roles, ',') || ' · ' || coalesce(p.with_check, p.qual, 'true')
  from pg_policies p
  where p.schemaname = 'public' and p.permissive = 'PERMISSIVE'
    and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and (coalesce(p.with_check, p.qual, 'true') = 'true')
    and (p.roles && array['public', 'anon', 'authenticated']::name[])
    and p.tablename not in ('site_feedback', 'analytics') -- abiertas a propósito (opinión anónima y contador de visitas)
),
c as (
  select 'C · Lectura abierta de datos personales', p.tablename || ' · ' || p.policyname,
         'SELECT para ' || array_to_string(p.roles, ',') || ' · ' || coalesce(p.qual, 'true')
  from pg_policies p join sensitive s on s.t = p.tablename
  where p.schemaname = 'public' and p.cmd in ('SELECT', 'ALL') and coalesce(p.qual, 'true') = 'true'
),
d as (
  select 'D · Vista que se salta RLS', c.relname::text,
         'La pueden leer: ' || concat_ws(', ',
           case when has_table_privilege('anon', c.oid, 'select') then 'sin sesión' end,
           case when has_table_privilege('authenticated', c.oid, 'select') then 'cualquier usuario' end)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and not coalesce((select bool_or(o = 'security_invoker=true' or o = 'security_invoker=on') from unnest(c.reloptions) o), false)
    and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'))
),
e as (
  select 'E · Función de administrador sin sesión', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         'SECURITY DEFINER ejecutable por anon'
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
    and p.prorettype <> 'trigger'::regtype
),
f as (
  select 'F · Subidas de fotos abiertas', p.policyname, p.cmd || ' · ' || coalesce(p.with_check, p.qual, 'true')
  from pg_policies p
  where p.schemaname = 'storage' and p.tablename = 'objects' and p.permissive = 'PERMISSIVE'
    and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and coalesce(p.with_check, p.qual, 'true') in ('true', '(bucket_id = ''club-images''::text)', '(bucket_id = ''club-photos''::text)',
      '(bucket_id = ''event-images''::text)', '(bucket_id = ''event-photos''::text)')
    and not exists (
      select 1 from pg_policies r where r.schemaname = 'storage' and r.tablename = 'objects'
        and r.permissive = 'RESTRICTIVE' and (r.cmd = p.cmd or r.cmd = 'ALL')
    )
),
g as (
  select 'G · Perfiles: columnas legibles por todos', string_agg(col.column_name, ', ' order by col.ordinal_position),
         'Comprueba que no salgan datos privados (año de nacimiento, bloqueo, género...)'
  from information_schema.columns col
  where col.table_schema = 'public' and col.table_name = 'profiles'
    and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'profiles'
                and p.cmd in ('SELECT', 'ALL') and coalesce(p.qual, 'true') = 'true')
    and has_column_privilege('anon', 'public.profiles', col.column_name, 'select')
  having count(*) > 0
)
select * from a union all select * from b union all select * from c union all select * from d
union all select * from e union all select * from f union all select * from g
order by 1, 2;
