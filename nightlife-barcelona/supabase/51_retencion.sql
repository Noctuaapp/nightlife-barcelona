-- =====================================================================================
-- Noctua · Retención: ¿vuelve la gente? (cuentas registradas + app instalada) · 29/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
-- (Funciona con o sin el 50; con el 50 las "personas" de la app son más exactas.)
--
-- Admin › Retención. Dos formas de medir si la gente vuelve SIN guardar nada en el móvil de nadie:
--   1. Cuentas registradas: de las que se registran, cuántas vuelven al día siguiente, en la primera
--      semana o en el primer mes (mirando los eventos que ya llevan user_id). Más cuántas cuentas
--      están activas cada día, nuevas o ya existentes, y cuántos días distintos vuelven.
--   2. App instalada: personas que abren Noctua desde el icono cada día (origen "pwa"), instalaciones
--      confirmadas (Android) y cuentas que abren la app en 2 o más días distintos.
-- Solo la puede ejecutar el admin. La cuenta de admin (info@noctuaapp.com) no cuenta.
-- =====================================================================================

alter table public.analytics add column if not exists visitor_id text;

create or replace function public.admin_retention(p_days int default 60)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_today date := (now() at time zone 'Europe/Madrid')::date;
  v_cohort date := (now() at time zone 'Europe/Madrid')::date - (greatest(7, least(coalesce(p_days, 60), 365)) - 1);
  v_start date;
  t_start timestamptz;
  t_30 timestamptz;
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;
  v_start := least(v_cohort, v_today - 29);
  t_start := (v_start::timestamp) at time zone 'Europe/Madrid';
  t_30 := ((v_today - 29)::timestamp) at time zone 'Europe/Madrid';

  with users_all as (
    select u.id, (u.created_at at time zone 'Europe/Madrid')::date as signup_day
    from auth.users u
    where coalesce(lower(u.email), '') <> 'info@noctuaapp.com'
  ),
  -- Días en que cada cuenta hizo algo en la web.
  act as (
    select distinct a.user_id as id, (a.created_at at time zone 'Europe/Madrid')::date as day
    from public.analytics a
    join users_all u on u.id = a.user_id
    where a.created_at >= t_start
  ),
  -- Cuentas creadas en el periodo y si volvieron.
  cohort as (
    select u.id, u.signup_day,
      coalesce(bool_or(a.day - u.signup_day = 1), false) as d1,
      coalesce(bool_or(a.day - u.signup_day between 1 and 7), false) as w1,
      coalesce(bool_or(a.day - u.signup_day between 1 and 30), false) as m1,
      coalesce(bool_or(a.day > u.signup_day), false) as ever
    from users_all u
    left join act a on a.id = u.id
    where u.signup_day >= v_cohort
    group by u.id, u.signup_day
  ),
  days as (
    select generate_series(v_today - 29, v_today, interval '1 day')::date as day
  ),
  daily as (
    select d.day,
      count(a.id) as active,
      count(a.id) filter (where u.signup_day = d.day) as fresh,
      count(a.id) filter (where u.signup_day < d.day) as back
    from days d
    left join act a on a.day = d.day
    left join users_all u on u.id = a.id
    group by d.day
  ),
  freq as (
    select a.id, count(*) as n from act a where a.day >= v_today - 29 group by a.id
  ),
  av as (
    select (a.created_at at time zone 'Europe/Madrid')::date as day,
      count(distinct coalesce(a.visitor_id, a.session_id::text)) filter (where a.source = 'pwa') as app_people,
      count(distinct a.session_id) filter (where a.source = 'pwa') as app_visits,
      count(distinct coalesce(a.visitor_id, a.session_id::text)) as all_people,
      count(*) filter (where a.event_type = 'app_installed') as installs
    from public.analytics a
    where a.created_at >= t_30
    group by 1
  ),
  app_acc as (
    select a.user_id, count(distinct (a.created_at at time zone 'Europe/Madrid')::date) as n
    from public.analytics a
    join users_all u on u.id = a.user_id
    where a.source = 'pwa' and a.created_at >= t_30
    group by a.user_id
  )
  select jsonb_build_object(
    'today', v_today,
    'cohort_days', (v_today - v_cohort + 1),
    'accounts', (select count(*) from cohort),
    'd1', jsonb_build_object(
      'eligible', (select count(*) from cohort where signup_day <= v_today - 1),
      'returned', (select count(*) from cohort where signup_day <= v_today - 1 and d1)),
    'w1', jsonb_build_object(
      'eligible', (select count(*) from cohort where signup_day <= v_today - 7),
      'returned', (select count(*) from cohort where signup_day <= v_today - 7 and w1)),
    'm1', jsonb_build_object(
      'eligible', (select count(*) from cohort where signup_day <= v_today - 30),
      'returned', (select count(*) from cohort where signup_day <= v_today - 30 and m1)),
    'ever', jsonb_build_object(
      'eligible', (select count(*) from cohort where signup_day <= v_today - 1),
      'returned', (select count(*) from cohort where signup_day <= v_today - 1 and ever)),
    'active_today', (select count(*) from act where day = v_today),
    'active_7d', (select count(distinct id) from act where day >= v_today - 6),
    'active_30d', (select count(distinct id) from act where day >= v_today - 29),
    'old_active_7d', (
      select count(distinct a.id) from act a join users_all u on u.id = a.id
      where a.day >= v_today - 6 and u.signup_day < v_today - 6),
    'freq', jsonb_build_object(
      'one', (select count(*) from freq where n = 1),
      'few', (select count(*) from freq where n between 2 and 3),
      'many', (select count(*) from freq where n between 4 and 7),
      'lots', (select count(*) from freq where n >= 8)),
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
        'day', day, 'active', active, 'fresh', fresh, 'back', back) order by day) from daily), '[]'::jsonb),
    'app', jsonb_build_object(
      'installs_total', (select count(*) from public.analytics where event_type = 'app_installed'),
      'installs_30d', (select coalesce(sum(installs), 0) from av),
      'accounts', (select count(*) from app_acc),
      'accounts_multi', (select count(*) from app_acc where n >= 2),
      'daily', coalesce((select jsonb_agg(jsonb_build_object(
          'day', d.day,
          'app_people', coalesce(v.app_people, 0),
          'app_visits', coalesce(v.app_visits, 0),
          'all_people', coalesce(v.all_people, 0),
          'installs', coalesce(v.installs, 0)) order by d.day)
        from days d left join av v on v.day = d.day), '[]'::jsonb))
  ) into result;

  return result;
end $$;

revoke all on function public.admin_retention(int) from public, anon;
grant execute on function public.admin_retention(int) to authenticated;

select 'Retención lista' as resultado;
