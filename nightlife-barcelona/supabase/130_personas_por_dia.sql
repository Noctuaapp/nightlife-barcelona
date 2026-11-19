-- =====================================================================================
-- Noctua · Personas y cuentas por día · 20/11/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 129). Se puede repetir sin problema.
--
-- Para qué: el Resumen del admin enseñaba «visitas» (cada vez que alguien entra cuenta una) y lo que importa es cuánta GENTE entra.
-- Esta función da, para cada día, dos cifras:
--   · people   = personas distintas (el código anónimo del día de la tabla analytics; si una visita no lo tiene, cuenta por su visita).
--   · accounts = cuentas registradas que han entrado ese día (las que tenían la sesión iniciada).
-- Y, para todo el periodo, cuántas cuentas distintas han entrado (accounts_total).
-- Ojo: el código anónimo cambia cada día a propósito (privacidad), así que «personas» solo se puede sumar día a día: quien entra
-- lunes y martes cuenta dos veces. Las cuentas sí son las mismas de un día a otro, por eso accounts_total no se suma.
--
-- Seguridad: no cambia ninguna tabla ni dato. Solo el admin puede llamarla (igual que admin_data_overview).
-- p_city: 'barcelona' | 'madrid'; sin ella cuenta toda la web.
-- =====================================================================================

drop function if exists public.admin_people_by_day(date, date, text);
create or replace function public.admin_people_by_day(p_from date, p_to date, p_city text default null)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  v_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  r jsonb;
begin
  if not public.is_noctua_admin() then raise exception 'forbidden'; end if;
  with a as materialized (
    select coalesce(x.visitor_id, x.session_id::text) as pid,
           x.user_id,
           (x.created_at at time zone 'Europe/Madrid')::date as d
    from public.analytics_of_city(p_city) x
    where x.created_at >= v_from and x.created_at < v_to
  )
  select jsonb_build_object(
    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(t.d, 'YYYY-MM-DD'), 'people', t.people, 'accounts', t.accounts) order by t.d)
                       from (select d, count(distinct pid) as people, count(distinct user_id) as accounts from a group by d) t), '[]'::jsonb),
    'accounts_total', (select count(distinct user_id) from a)
  ) into r;
  return r;
end $function$;

revoke all on function public.admin_people_by_day(date, date, text) from public, anon;
grant execute on function public.admin_people_by_day(date, date, text) to authenticated;
