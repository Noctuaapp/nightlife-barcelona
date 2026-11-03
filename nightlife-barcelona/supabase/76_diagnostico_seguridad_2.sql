-- =====================================================================================
-- Noctua · Diagnóstico de seguridad, segunda parte · 03/11/2026
-- Pegar entero en Supabase › SQL Editor. SOLO LEE: no cambia nada. Sale UNA fila con un JSON.
--
-- Sale de lo que enseñó el diagnóstico del 75:
--   perfiles_disparador   qué hace protect_profile_columns (¿protege xp, nivel y bloqueos?
--                         ¿también al CREAR el perfil?)
--   storage_politicas     reglas de subida completas (¿quién puede subir a essential-* y avatars?)
--   funciones_admin_sin_comprobar_admin
--                         funciones admin_* que cualquier cuenta puede llamar y que no mencionan
--                         is_noctua_admin (debería salir [])
--   funciones_sin_comprobar_quien_llama
--                         funciones que no miran quién las llama (ni sesión ni admin) y se pueden
--                         ejecutar desde fuera; la mayoría serán inofensivas, hay que mirarlas
--   funciones_a_revisar   cuerpo de las funciones que se pueden llamar sin sesión o borran datos
--   checkins              reglas, disparadores y columnas de club_checkins
--   encuestas_y_opiniones límites de site_feedback y de los votos sin cuenta
-- =====================================================================================

-- (la lista de funciones se calcula una sola vez, solo con funciones normales, para no fallar con otras)
with f as materialized (
  select p.oid, p.proname, p.prosecdef,
         p.prorettype = 'pg_catalog.trigger'::regtype as es_disparador,
         has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta,
         has_function_privilege('authenticated', p.oid, 'execute') as auth_ejecuta,
         pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
)
select jsonb_build_object(
  'perfiles_disparador', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'disparador', t.tgname, 'definicion', pg_get_triggerdef(t.oid), 'funcion', pg_get_functiondef(t.tgfoid))), '[]'::jsonb)
    from pg_trigger t
    where t.tgrelid = to_regclass('public.profiles') and not t.tgisinternal
      and t.tgname in ('protect_profile_columns_trg', 'cap_profile_xp_trigger', 'noctua_profile_age_guard')
  ),
  'storage_politicas', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'politica', policyname, 'tipo', permissive, 'cmd', cmd, 'roles', roles,
      'using', qual, 'check', with_check) order by policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'storage' and tablename = 'objects'
  ),
  'funciones_admin_sin_comprobar_admin', (
    select coalesce(jsonb_agg(proname order by proname), '[]'::jsonb)
    from f
    where prosecdef and auth_ejecuta
      and (proname like 'admin\_%' or proname = 'get_admin_stats')
      and def not ilike '%is_noctua_admin%'
      and def not ilike '%info@noctuaapp.com%'
  ),
  'funciones_a_revisar', (
    select coalesce(jsonb_object_agg(proname, def), '{}'::jsonb)
    from f
    where proname in (
      'club_live_checkins', 'get_night_plan', 'rsvp_night_plan', 'create_night_plan', 'delete_current_user',
      'restore_denied_venue', 'mark_perk_redemption_used', 'owner_item_stats', 'recompute_level',
      'noctua_review_author', 'noctua_can_upload'
    )
  ),
  'funciones_sin_comprobar_quien_llama', (
    select coalesce(jsonb_agg(proname order by proname), '[]'::jsonb)
    from f
    where prosecdef and not es_disparador and (auth_ejecuta or anon_ejecuta)
      and def not ilike '%is_noctua_admin%'
      and def not ilike '%auth.uid()%'
      and def not ilike '%auth.jwt()%'
      and def not ilike '%info@noctuaapp.com%'
  ),
  'checkins', jsonb_build_object(
    'politicas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'politica', policyname, 'tipo', permissive, 'cmd', cmd, 'roles', roles,
        'using', qual, 'check', with_check) order by policyname), '[]'::jsonb)
      from pg_policies where schemaname = 'public' and tablename = 'club_checkins'
    ),
    'disparadores', (
      select coalesce(jsonb_agg(t.tgname order by t.tgname), '[]'::jsonb)
      from pg_trigger t where t.tgrelid = to_regclass('public.club_checkins') and not t.tgisinternal
    ),
    'columnas', (
      select coalesce(jsonb_agg(column_name order by ordinal_position), '[]'::jsonb)
      from information_schema.columns where table_schema = 'public' and table_name = 'club_checkins'
    )
  ),
  'encuestas_y_opiniones', jsonb_build_object(
    'site_feedback_columnas', (
      select coalesce(jsonb_agg(column_name || ' ' || data_type order by ordinal_position), '[]'::jsonb)
      from information_schema.columns where table_schema = 'public' and table_name = 'site_feedback'
    ),
    'site_feedback_disparadores', (
      select coalesce(jsonb_agg(t.tgname order by t.tgname), '[]'::jsonb)
      from pg_trigger t where t.tgrelid = to_regclass('public.site_feedback') and not t.tgisinternal
    ),
    'votos_sin_cuenta_indices', (
      select coalesce(jsonb_agg(indexdef order by indexname), '[]'::jsonb)
      from pg_indexes where schemaname = 'public' and tablename = 'party_poll_anon_votes'
    ),
    'votos_sin_cuenta_disparadores', (
      select coalesce(jsonb_agg(t.tgname order by t.tgname), '[]'::jsonb)
      from pg_trigger t where t.tgrelid = to_regclass('public.party_poll_anon_votes') and not t.tgisinternal
    )
  )
) as diagnostico2;
