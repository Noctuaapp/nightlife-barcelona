-- =====================================================================================
-- Noctua · Estado del correo de cada cuenta en Admin › Usuarios · 06/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema. NO cambia datos.
--
-- Para qué: «Sin aceptar términos» salía también en quien se registró con correo y todavía no ha
-- pulsado el enlace de confirmación (esa cuenta aún no tiene perfil, y la aceptación se apunta
-- ahora en los metadatos del alta). Con esta función, Admin › Usuarios distingue:
--   · «Correo sin confirmar»  → se registró pero no ha entrado todavía.
--   · «Sin aceptar términos»  → ya tiene cuenta activa y no ha completado «Antes de continuar».
-- Solo la puede llamar el admin (is_noctua_admin). Hasta que se ejecute, la web sigue como antes.
-- =====================================================================================

create or replace function public.admin_users_auth_status()
returns table (
  user_id uuid,
  email_confirmed_at timestamptz,
  provider text,
  signup_terms_at text
)
language plpgsql
security definer
set search_path to 'public'
stable
as $$
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select
    u.id,
    u.email_confirmed_at,
    coalesce(u.raw_app_meta_data->>'provider', 'email'),
    nullif(u.raw_user_meta_data->>'terms_accepted_at', '')
  from auth.users u;
end;
$$;

revoke all on function public.admin_users_auth_status() from public, anon;
grant execute on function public.admin_users_auth_status() to authenticated;

select 'ok' as estado, 'admin_users_auth_status creada' as detalle;
