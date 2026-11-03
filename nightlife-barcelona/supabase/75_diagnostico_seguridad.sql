-- =====================================================================================
-- Noctua · Diagnóstico de seguridad del estado REAL de la base de datos · 02/11/2026
-- Pegar entero en Supabase › SQL Editor. SOLO LEE: no cambia nada.
--
-- Por qué: las migraciones del repositorio dicen cómo debería estar la base de datos, pero hay
-- tablas y funciones que se crearon a mano antes (profiles, analytics, _grant_xp...) y solo se
-- pueden revisar mirando la base de datos de verdad. Sale UNA fila con un JSON: cópialo entero.
--
--   tablas_sin_rls       tablas sin protección de filas (debería salir [])
--   vistas_sin_invoker   vistas que se saltan las reglas de quien consulta (debería salir [])
--   escritura_anonima    reglas que dejan escribir sin cuenta (esperadas: opiniones del sitio,
--                        votos de la encuesta, analítica)
--   perfiles             reglas, disparadores y columnas de profiles (¿puede alguien tocar su
--                        propio xp o su bloqueo?)
--   funciones_para_anon  funciones «security definer» que se pueden llamar SIN sesión
--   funciones_para_auth  funciones «security definer» que se pueden llamar con cualquier cuenta
--   is_noctua_admin      cómo se decide quién es admin
--   buckets              tipos y tamaño máximo permitidos en cada bucket de fotos
--   politicas_storage    reglas de subida de archivos
-- =====================================================================================

select jsonb_build_object(
  'tablas_sin_rls', (
    select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  ),
  'vistas_sin_invoker', (
    select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and not coalesce(c.reloptions::text[] && array['security_invoker=true', 'security_invoker=on'], false)
  ),
  'escritura_anonima', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabla', tablename, 'politica', policyname, 'cmd', cmd, 'roles', roles,
      'using', qual, 'check', with_check) order by tablename, policyname), '[]'::jsonb)
    from pg_policies
    where schemaname = 'public'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and roles && array['anon', 'public']::name[]
  ),
  'perfiles', jsonb_build_object(
    'politicas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'politica', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check)
        order by policyname), '[]'::jsonb)
      from pg_policies where schemaname = 'public' and tablename = 'profiles'
    ),
    'disparadores', (
      select coalesce(jsonb_agg(t.tgname order by t.tgname), '[]'::jsonb)
      from pg_trigger t
      where t.tgrelid = to_regclass('public.profiles') and not t.tgisinternal
    ),
    'columnas', (
      select coalesce(jsonb_agg(column_name order by ordinal_position), '[]'::jsonb)
      from information_schema.columns where table_schema = 'public' and table_name = 'profiles'
    )
  ),
  'funciones_para_anon', (
    select coalesce(jsonb_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'pg_catalog.trigger'::regtype
      and has_function_privilege('anon', p.oid, 'execute')
  ),
  'funciones_para_auth', (
    select coalesce(jsonb_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'pg_catalog.trigger'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute')
  ),
  'is_noctua_admin', (
    select pg_get_functiondef(p.oid)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_noctua_admin'
    limit 1
  ),
  'buckets', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'public', public, 'max_bytes', file_size_limit, 'tipos', allowed_mime_types) order by id), '[]'::jsonb)
    from storage.buckets
  ),
  'politicas_storage', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'politica', policyname, 'cmd', cmd, 'roles', roles) order by policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'storage' and tablename = 'objects'
  )
) as diagnostico;
