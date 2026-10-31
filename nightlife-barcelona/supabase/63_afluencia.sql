-- =====================================================================================
-- Noctua · Cuándo sale la gente (Admin › Cuándo sale la gente) · 31/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Responde a: «¿qué días del mes sale más gente y menos, qué día de la semana y qué meses?».
-- Solo cuenta lo que Noctua ve de verdad, con tres medidas (cada una con sus gráficas):
--   · attend  → «Asistiré»: personas distintas que marcaron que iban a salir esa noche.
--   · checkin → check-ins: personas distintas que confirmaron que estaban en un local esa noche.
--   · visits  → visitas: visitantes distintos de la web esa noche.
-- Las noches cuentan hasta las 06:00 (a las 02:00 del domingo sigue siendo la noche del sábado).
-- Para que se pueda comparar, cada resultado trae el TOTAL y el nº de noches observadas; la
-- pantalla calcula la media por noche (un mes de 31 días o un martes que sale 5 veces no ganan
-- solo por tener más noches). Cada medida empieza el primer día en que hay datos de esa medida:
-- los días anteriores no cuentan como «cero personas».
-- No cuenta tu cuenta de admin. Solo devuelve números agregados, nunca personas.
-- Esta función solo la puede ejecutar el admin.
-- =====================================================================================

create or replace function public.admin_afluencia(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_today date := (now() at time zone 'Europe/Madrid')::date;
  v_to date := least(greatest(p_from, p_to), v_today);
  v_from date := least(p_from, p_to);
  t_from timestamptz;
  t_to timestamptz;
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;
  -- Máximo dos años de golpe.
  if v_to - v_from > 731 then
    v_from := v_to - 731;
  end if;
  t_from := (v_from::timestamp) at time zone 'Europe/Madrid';
  -- La noche del último día llega hasta las 06:00 del siguiente.
  t_to := ((v_to + 1)::timestamp + interval '6 hours') at time zone 'Europe/Madrid';

  with admin_ids as (
    select u.id from auth.users u where lower(coalesce(u.email, '')) = 'info@noctuaapp.com'
  ),
  raw as (
    select 'attend'::text as m, a.night::date as night, count(distinct a.user_id)::int as n
    from public.attendances a
    where a.night between v_from and v_to
      and a.user_id not in (select id from admin_ids)
    group by a.night
    union all
    select 'checkin', c.checkin_date::date, count(distinct c.user_id)::int
    from public.club_checkins c
    where c.checkin_date between v_from and v_to
      and c.user_id not in (select id from admin_ids)
    group by c.checkin_date
    union all
    select 'visits',
           (((a.created_at at time zone 'Europe/Madrid') - interval '6 hours')::date),
           count(distinct coalesce(a.visitor_id, a.session_id::text))::int
    from public.analytics a
    where a.created_at >= t_from and a.created_at < t_to
      and (a.user_id is null or a.user_id not in (select id from admin_ids))
    group by 2
  ),
  firsts as (
    select m, min(night) as first_night, sum(n)::int as total from raw group by m
  ),
  cal as (
    select f.m, g.day::date as night
    from firsts f
    cross join lateral generate_series(greatest(f.first_night, v_from)::timestamp, v_to::timestamp, interval '1 day') as g(day)
  ),
  joined as (
    select c.m, c.night, coalesce(r.n, 0) as n
    from cal c
    left join raw r on r.m = c.m and r.night = c.night
  ),
  by_dow as (
    select m, extract(isodow from night)::int as k, sum(n)::int as total, count(*)::int as nights
    from joined group by m, 2
  ),
  by_dom as (
    select m, extract(day from night)::int as k, sum(n)::int as total, count(*)::int as nights
    from joined group by m, 2
  ),
  by_month as (
    select m, extract(month from night)::int as k, sum(n)::int as total, count(*)::int as nights
    from joined group by m, 2
  ),
  metrics as (
    select m from (values ('attend'), ('checkin'), ('visits')) v(m)
  )
  select jsonb_build_object(
    'today', v_today,
    'from', v_from,
    'to', v_to,
    'metrics', (
      select jsonb_object_agg(
        mt.m,
        jsonb_build_object(
          'first', (select first_night from firsts f where f.m = mt.m),
          'total', coalesce((select total from firsts f where f.m = mt.m), 0),
          'nights', (select count(*) from joined j where j.m = mt.m),
          'dow', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'total', total, 'nights', nights) order by k) from by_dow b where b.m = mt.m), '[]'::jsonb),
          'dom', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'total', total, 'nights', nights) order by k) from by_dom b where b.m = mt.m), '[]'::jsonb),
          'month', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'total', total, 'nights', nights) order by k) from by_month b where b.m = mt.m), '[]'::jsonb)
        )
      )
      from metrics mt
    )
  ) into result;

  return result;
end $$;

revoke all on function public.admin_afluencia(date, date) from public, anon;
grant execute on function public.admin_afluencia(date, date) to authenticated;

-- Comprobación: debe salir la función y «authenticated» como único rol con permiso.
select p.proname,
       (select string_agg(grantee::text, ', ') from information_schema.routine_privileges
        where routine_schema = 'public' and routine_name = p.proname and privilege_type = 'EXECUTE') as quien_puede_ejecutar
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname = 'admin_afluencia';
