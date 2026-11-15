-- =====================================================================================
-- Noctua · Datos por ciudad (parte 2) · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor DESPUÉS del 104. Se puede repetir sin problema.
--
-- Qué hace: lo mismo que el 104, para las cuatro funciones de Admin › Datos que faltaban:
--   · admin_data_overview   (Resumen de Datos y Resumen del admin: visitas, fichas vistas, clics, búsquedas, asistiré, check-ins...)
--   · admin_data_searches   (Búsquedas)
--   · admin_data_audience   (Audiencia: edad, género y país de las cuentas activas)
--   · admin_ride_clicks     (clics en Uber / Cabify / FREE NOW)
-- Cada una recibe un parámetro opcional p_city ('barcelona' | 'madrid'; si no se pasa, cuenta toda la web, como hasta ahora).
-- Usa lo mismo que el 104: cada visita es de una sola ciudad; asistiré y check-ins se reparten por la ciudad del club o
-- del evento. admin_data_items y admin_data_item_detail no cambian: ya son de un club o evento concreto.
--
-- Seguridad: no cambia ninguna tabla ni ningún dato. Las comprobaciones de «solo el admin» de cada función siguen igual.
-- Antes de cada función nueva se borra su versión sin p_city (si no, Supabase no sabría cuál llamar).
-- =====================================================================================

-- admin_data_overview
drop function if exists public.admin_data_overview(date, date);
CREATE OR REPLACE FUNCTION public.admin_data_overview(p_from date, p_to date, p_city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  v_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  r jsonb;
begin
  if not public.is_noctua_admin() then raise exception 'forbidden'; end if;
  with analytics as materialized (
    select * from public.analytics_of_city(p_city) a
    where a.created_at >= v_from and a.created_at < v_to
  )
  select jsonb_build_object(
    'sessions',   (select count(distinct session_id) from analytics where created_at >= v_from and created_at < v_to and session_id is not null),
    'page_views', (select count(*) from analytics where event_type = 'page_view' and created_at >= v_from and created_at < v_to),
    'tickets',    (select count(*) from analytics where event_type = 'tickets_click' and created_at >= v_from and created_at < v_to),
    'directions', (select count(*) from analytics where event_type = 'directions_click' and created_at >= v_from and created_at < v_to),
    'shares',     (select count(*) from analytics where event_type = 'share_click' and created_at >= v_from and created_at < v_to),
    'searches',   (select count(*) from analytics where event_type = 'search' and created_at >= v_from and created_at < v_to),
    'searches_zero', (select count(*) from analytics where event_type = 'search' and results_count = 0 and created_at >= v_from and created_at < v_to),
    'attendances', (select count(*) from attendances where night between p_from and p_to and public.item_in_city(item_type::text, item_id::text, p_city)),
    'checkins',   (select count(*) from club_checkins where checkin_date between p_from and p_to and public.item_in_city('club', club_id::text, p_city)),
    'daily', coalesce((select jsonb_agg(x order by x->>'d') from (
        select jsonb_build_object('d', to_char((created_at at time zone 'Europe/Madrid')::date, 'YYYY-MM-DD'),
               'sessions', count(distinct session_id),
               'views', count(*) filter (where event_type = 'page_view')) as x
        from analytics where created_at >= v_from and created_at < v_to group by (created_at at time zone 'Europe/Madrid')::date ) t), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'sessions', n) order by n desc) from (
        select coalesce(source, 'sin dato') as source, count(distinct session_id) as n
        from analytics where event_type = 'session_start' and created_at >= v_from and created_at < v_to group by 1) s), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('device', device, 'sessions', n) order by n desc) from (
        select coalesce(device, 'sin dato') as device, count(distinct session_id) as n
        from analytics where event_type = 'session_start' and created_at >= v_from and created_at < v_to group by 1) s), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h) from (
        select extract(hour from created_at at time zone 'Europe/Madrid')::int as h, count(*) as n
        from analytics where event_type = 'page_view' and created_at >= v_from and created_at < v_to group by 1) s), '[]'::jsonb),
    'weekdays', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d) from (
        select extract(isodow from created_at at time zone 'Europe/Madrid')::int as d, count(*) as n
        from analytics where event_type = 'page_view' and created_at >= v_from and created_at < v_to group by 1) s), '[]'::jsonb)
  ) into r;
  return r;
end $function$;

revoke all on function public.admin_data_overview(date, date, text) from public, anon;
grant execute on function public.admin_data_overview(date, date, text) to authenticated;

-- admin_data_searches
drop function if exists public.admin_data_searches(date, date);
CREATE OR REPLACE FUNCTION public.admin_data_searches(p_from date, p_to date, p_city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  v_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  r jsonb;
begin
  if not public.is_noctua_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(x order by (x->>'n')::int desc), '[]'::jsonb) into r from (
    select jsonb_build_object('term', item_name, 'n', count(*),
           'avg_results', round(avg(results_count)::numeric, 1),
           'zero', count(*) filter (where results_count = 0)) as x
    from public.analytics_of_city(p_city) analytics
    where event_type = 'search' and item_name is not null and created_at >= v_from and created_at < v_to
    group by item_name order by count(*) desc limit 300
  ) q;
  return r;
end $function$;

revoke all on function public.admin_data_searches(date, date, text) from public, anon;
grant execute on function public.admin_data_searches(date, date, text) to authenticated;

-- admin_data_audience
drop function if exists public.admin_data_audience(date, date, text, bigint);
CREATE OR REPLACE FUNCTION public.admin_data_audience(p_from date, p_to date, p_type text DEFAULT NULL::text, p_id bigint DEFAULT NULL::bigint, p_city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  v_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  r jsonb;
begin
  if not public.is_noctua_admin() then raise exception 'forbidden'; end if;
  with u as (
    select distinct user_id as id from public.analytics_of_city(p_city) analytics
    where user_id is not null and created_at >= v_from and created_at < v_to
      and (p_type is null or (item_type = p_type and (p_id is null or item_id = p_id)))
  ),
  prof as (select p.* from u join profiles p on p.id = u.id)
  select jsonb_build_object(
    'users', (select count(*) from u),
    'ages', coalesce((select jsonb_agg(jsonb_build_object('label', g, 'n', case when n >= 5 then n end) order by g) from (
        select case
          when birth_year is null then 'sin dato'
          when extract(year from now())::int - birth_year < 25 then '18-24'
          when extract(year from now())::int - birth_year < 30 then '25-29'
          when extract(year from now())::int - birth_year < 40 then '30-39'
          when extract(year from now())::int - birth_year < 50 then '40-49'
          else '50+' end as g, count(*) as n
        from prof group by 1) s), '[]'::jsonb),
    'genders', coalesce((select jsonb_agg(jsonb_build_object('label', g, 'n', case when n >= 5 then n end) order by n desc) from (
        select coalesce(gender, 'sin dato') as g, count(*) as n from prof group by 1) s), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('label', g, 'n', n) order by n desc) from (
        select coalesce(country, 'sin dato') as g, count(*) as n from prof group by 1 having count(*) >= 5 limit 15) s), '[]'::jsonb)
  ) into r;
  return r;
end $function$;

revoke all on function public.admin_data_audience(date, date, text, bigint, text) from public, anon;
grant execute on function public.admin_data_audience(date, date, text, bigint, text) to authenticated;

-- admin_ride_clicks
drop function if exists public.admin_ride_clicks(date, date);
CREATE OR REPLACE FUNCTION public.admin_ride_clicks(p_from date, p_to date, p_city text DEFAULT NULL::text)
 RETURNS TABLE(provider text, n bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (auth.jwt() ->> 'email') is distinct from 'info@noctuaapp.com' then
    return;
  end if;

  return query
  select coalesce(meta->>'provider', 'otro') as provider, count(*) as n
  from public.analytics_of_city(p_city) analytics
  where event_type = 'ride_click'
    and created_at::date >= p_from
    and created_at::date <= p_to
  group by 1
  order by n desc;
end;
$function$;

revoke all on function public.admin_ride_clicks(date, date, text) from public, anon;
grant execute on function public.admin_ride_clicks(date, date, text) to authenticated;

-- Avisa a la API de Supabase de que las funciones han cambiado.
notify pgrst, 'reload schema';

-- Comprobación: debe salir una fila por función, todas con p_city.
select p.proname as funcion, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('admin_data_overview', 'admin_data_searches', 'admin_data_audience', 'admin_ride_clicks')
order by 1;
