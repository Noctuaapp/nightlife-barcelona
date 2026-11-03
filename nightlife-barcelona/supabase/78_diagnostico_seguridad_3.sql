-- =====================================================================================
-- Noctua · Diagnóstico de seguridad, tercera parte · 03/11/2026
-- Pegar entero en Supabase › SQL Editor. SOLO LEE: no cambia nada. Sale UNA fila con un JSON.
--
-- Qué falta por mirar tras los diagnósticos 75 y 76:
--   reglas_de_escritura_solo_con_sesion
--       El 75 solo listó las reglas de escritura abiertas a «anon/public». Faltan las que son
--       solo para cuentas con sesión (authenticated): hay que ver que ninguna deje a un usuario
--       escribir lo que no debe (como pasaba con profiles).
--   xp_events
--       _grant_xp evita repetir puntos con un error de «duplicado»; eso solo funciona si la tabla
--       tiene un índice único. Aquí se comprueba, y que nadie pueda escribir en ella a mano.
-- =====================================================================================

select jsonb_build_object(
  'reglas_de_escritura_solo_con_sesion', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabla', tablename, 'politica', policyname, 'tipo', permissive, 'cmd', cmd,
      'using', qual, 'check', with_check) order by tablename, cmd, policyname), '[]'::jsonb)
    from pg_policies
    where schemaname = 'public'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and 'authenticated'::name = any (roles)
      and not (roles && array['anon', 'public']::name[])
      and coalesce(qual, '') not ilike '%is_noctua_admin()%'
      and coalesce(with_check, '') not ilike '%is_noctua_admin()%'
  ),
  'xp_events', jsonb_build_object(
    'indices', (
      select coalesce(jsonb_agg(indexdef order by indexname), '[]'::jsonb)
      from pg_indexes where schemaname = 'public' and tablename = 'xp_events'
    ),
    'reglas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'politica', policyname, 'tipo', permissive, 'cmd', cmd, 'roles', roles,
        'using', qual, 'check', with_check) order by policyname), '[]'::jsonb)
      from pg_policies where schemaname = 'public' and tablename = 'xp_events'
    ),
    'disparadores', (
      select coalesce(jsonb_agg(t.tgname order by t.tgname), '[]'::jsonb)
      from pg_trigger t where t.tgrelid = to_regclass('public.xp_events') and not t.tgisinternal
    )
  )
) as diagnostico3;
