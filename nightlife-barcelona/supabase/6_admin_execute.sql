-- =====================================================================================
-- Noctua · Tanda H (aviso "Function Execute Access" del Security Advisor) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Las 7 funciones admin_* ya llevan dentro su propia comprobación (is_noctua_admin() o el
-- email exacto), así que aunque cualquiera pudiera llamarlas, solo el admin recibe datos de
-- verdad — a cualquier otra persona le sale un error "forbidden"/"No autorizado". Revisé el
-- código de las 7 antes de tocar nada: ninguna devuelve datos sin pasar antes por esa
-- comprobación.
--
-- Aun así, no hace falta dejar que cualquiera (ni siquiera sin haber iniciado sesión) pueda
-- intentar llamarlas. Esto quita ese permiso de "cualquiera"/"público" y lo deja solo para
-- quien ha iniciado sesión (el mínimo que ya hacía falta para pasar la comprobación de
-- dentro) — no cambia nada de cómo funciona el panel de admin.
-- =====================================================================================

do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'admin_data_audience', 'admin_data_item_detail', 'admin_data_items',
        'admin_data_overview', 'admin_data_searches', 'admin_list_users', 'admin_ride_clicks'
      )
  loop
    execute format('revoke all on function %I.%I(%s) from public, anon', r.nspname, r.proname, r.args);
    execute format('grant execute on function %I.%I(%s) to authenticated', r.nspname, r.proname, r.args);
  end loop;
end $$;

-- Comprobación: cada función debería salir con "authenticated" como único rol con permiso.
select p.proname,
       (select string_agg(grantee::text, ', ') from information_schema.routine_privileges
        where routine_schema = 'public' and routine_name = p.proname and privilege_type = 'EXECUTE') as quien_puede_ejecutar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'admin_data_audience', 'admin_data_item_detail', 'admin_data_items',
    'admin_data_overview', 'admin_data_searches', 'admin_list_users', 'admin_ride_clicks'
  );
