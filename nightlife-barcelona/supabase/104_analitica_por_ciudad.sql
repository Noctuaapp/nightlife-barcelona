-- =====================================================================================
-- Noctua · Analítica por ciudad (Barcelona | Madrid) · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace: el selector Barcelona | Madrid del admin ya filtra Clubs, Eventos, Esenciales... Esto hace lo mismo con la
-- analítica: Visitas, Retención, Cuándo sale la gente y las pestañas de Datos. Cada función admin_* recibe un parámetro
-- opcional p_city ('barcelona' | 'madrid'; si no se pasa, cuenta toda la web, como hasta ahora).
--
-- Cómo se reparte: cada VISITA (sesión) es de una sola ciudad. Es de Madrid si en algún momento pisó una página de Madrid
-- (una dirección que empieza por /madrid, o la ficha de un club de Madrid); todo lo demás es de Barcelona. Así Barcelona +
-- Madrid suman exactamente el total, sin contar nada dos veces. Un club es de Madrid con el mismo criterio que la web
-- (src/lib/cities.ts: ciudad «Madrid…» o coordenadas dentro del rectángulo de Madrid).
--
-- Retención: las cuentas no tienen ciudad. En Madrid cuentan las que han dejado actividad allí; en Barcelona, todas menos las
-- que solo han usado Madrid (las cuentas que nunca han hecho nada siguen contando en Barcelona, como hasta ahora).
-- Favoritos, asistencias y check-ins: se reparten por la ciudad del club / noche de club / evento al que pertenecen.
--
-- Seguridad: no cambia ninguna tabla, ni ningún dato, ni lo que ve el público. Solo lo ejecuta el admin (is_noctua_admin()).
-- Antes de cada función nueva se borra su versión sin p_city (si no, Supabase no sabría cuál llamar).
-- =====================================================================================

-- Índice para encontrar rápido las visitas que han pisado /madrid.
create index if not exists analytics_madrid_path_idx
  on public.analytics (session_id)
  where path = '/madrid' or path like '/madrid/%';

-- ¿Es de Madrid este lugar? Mismo criterio que la web (src/lib/cities.ts › cityOfClub): el texto de la ciudad empieza por
-- «Madrid» o las coordenadas caen dentro del rectángulo de Madrid. Todo lo demás es Barcelona (y su área).
create or replace function public.is_madrid_place(p_city text, p_lat double precision, p_lng double precision)
returns boolean
language sql
immutable
as $$
  select lower(btrim(coalesce(p_city, ''))) like 'madrid%'
      or (p_lat is not null and p_lng is not null
          and p_lat > 40.2 and p_lat < 40.7 and p_lng > -4.0 and p_lng < -3.4)
$$;

revoke all on function public.is_madrid_place(text, double precision, double precision) from public, anon, authenticated;

-- Ciudad de algo que tiene ficha: un club, una noche de club o un evento. Un evento sin coordenadas es de Madrid si es en un
-- local de Madrid (por el nombre, y solo si ese nombre no está también en Barcelona). Lo que no se encuentra es de Barcelona.
create or replace function public.item_city(p_type text, p_id text)
returns text
language sql
stable
as $$
  select case
    when p_type = 'club' then
      coalesce((select case when public.is_madrid_place(c.city, c.latitude::double precision, c.longitude::double precision) then 'madrid' else 'barcelona' end
                from public.clubs c where c.id::text = p_id limit 1), 'barcelona')
    when p_type = 'club_event' then
      coalesce((select case when public.is_madrid_place(c.city, c.latitude::double precision, c.longitude::double precision) then 'madrid' else 'barcelona' end
                from public.club_events ce join public.clubs c on c.id = ce.club_id
                where ce.id::text = p_id limit 1), 'barcelona')
    when p_type = 'event' then
      coalesce((select case
                  when e.latitude is not null and e.longitude is not null then
                    case when public.is_madrid_place(null, e.latitude::double precision, e.longitude::double precision) then 'madrid' else 'barcelona' end
                  when exists (select 1 from public.clubs m
                               where lower(btrim(m.name)) = lower(btrim(coalesce(e.club_name, '')))
                                 and public.is_madrid_place(m.city, m.latitude::double precision, m.longitude::double precision))
                       and not exists (select 1 from public.clubs b
                               where lower(btrim(b.name)) = lower(btrim(coalesce(e.club_name, '')))
                                 and not public.is_madrid_place(b.city, b.latitude::double precision, b.longitude::double precision))
                    then 'madrid'
                  else 'barcelona'
                end
                from public.events e where e.id::text = p_id limit 1), 'barcelona')
    else 'barcelona'
  end
$$;

revoke all on function public.item_city(text, text) from public, anon, authenticated;

-- ¿Es este club/evento de la ciudad pedida? Sin ciudad pedida (null), todo vale.
create or replace function public.item_in_city(p_type text, p_id text, p_city text)
returns boolean
language sql
stable
as $$
  select p_city is null or p_city not in ('madrid', 'barcelona') or public.item_city(p_type, p_id) = p_city
$$;

revoke all on function public.item_in_city(text, text, text) from public, anon, authenticated;

-- Visitas de Madrid (ids de sesión). Es una vista interna: nadie fuera de las funciones admin la lee.
create or replace view public.analytics_madrid_sessions as
  select distinct a.session_id
  from public.analytics a
  where a.session_id is not null
    and (a.path = '/madrid' or a.path like '/madrid/%')
  union
  select distinct a.session_id
  from public.analytics a
  join public.clubs c on c.id::text = a.item_id::text
  where a.session_id is not null
    and a.item_type = 'club'
    and public.is_madrid_place(c.city, c.latitude::double precision, c.longitude::double precision);

revoke all on public.analytics_madrid_sessions from public, anon, authenticated;

-- Las filas de analítica de una ciudad. p_city = null (o cualquier otra cosa) → todas, como siempre.
-- Es una función SQL sencilla (sin SET ni security definer) para que Postgres la «absorba» en la consulta que la llama y
-- siga usando los índices de fecha.
create or replace function public.analytics_of_city(p_city text)
returns setof public.analytics
language sql
stable
as $$
  select a.*
  from public.analytics a
  where p_city is null
     or p_city not in ('madrid', 'barcelona')
     or coalesce(a.session_id in (select m.session_id from public.analytics_madrid_sessions m), false) = (p_city = 'madrid')
$$;

revoke all on function public.analytics_of_city(text) from public, anon, authenticated;

-- admin_sessions
drop function if exists public.admin_sessions(date, date, int);
create or replace function public.admin_sessions(p_from date, p_to date, p_limit int default 300, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  t_from timestamptz := (p_from::timestamp) at time zone 'Europe/Madrid';
  t_to timestamptz := ((p_to + 1)::timestamp) at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with ev as (
    select a.session_id, a.visitor_id, a.event_type, a.item_type, a.item_name, a.path, a.source, a.device, a.user_id,
           a.results_count, a.meta, a.created_at
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to and a.session_id is not null
  ),
  sess as (
    select session_id,
           (array_agg(visitor_id order by created_at) filter (where visitor_id is not null))[1] as visitor_id,
           min(created_at) as started_at,
           max(created_at) as ended_at,
           (array_agg(source order by created_at) filter (where source is not null))[1] as source,
           (array_agg(device order by created_at) filter (where device is not null))[1] as device,
           (array_agg(user_id order by created_at) filter (where user_id is not null))[1] as user_id,
           coalesce((array_agg(path order by created_at) filter (where event_type = 'session_start'))[1],
                    (array_agg(path order by created_at))[1]) as landing,
           1 + count(*) filter (where event_type = 'page_nav') as pages,
           count(*) filter (where event_type like '%\_click' or event_type in ('search', 'filter_used', 'party_poll_vote', 'tab_open')) as actions
    from ev group by session_id
  ),
  people as (
    select coalesce(visitor_id, session_id::text) as pid, count(*) as visits
    from sess group by 1
  ),
  recent as (
    select * from sess order by started_at desc limit greatest(1, least(coalesce(p_limit, 300), 1000))
  )
  select jsonb_build_object(
    'total_sessions', (select count(*) from sess),
    'visitors', (select count(*) from people),
    'returning', (select count(*) from people where visits > 1),
    'with_account', (select count(*) from sess where user_id is not null),
    'bounced', (select count(*) from sess where pages = 1 and actions = 0),
    'avg_pages', (select round(avg(pages)::numeric, 1) from sess),
    'landings', coalesce((select jsonb_agg(jsonb_build_object('path', landing, 'n', n) order by n desc)
                          from (select landing, count(*) n from sess group by landing order by count(*) desc limit 15) x), '[]'::jsonb),
    'top_pages', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'name', name, 'n', n) order by n desc)
                          from (select path, max(item_name) filter (where event_type = 'page_view') as name, count(distinct session_id) n
                                from ev where event_type in ('session_start', 'page_nav', 'page_view') and path is not null
                                group by path order by count(distinct session_id) desc limit 20) x), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', left(r.session_id, 8),
        'visitor', r.visitor_id,
        'started_at', r.started_at,
        'minutes', round(extract(epoch from (r.ended_at - r.started_at)) / 60.0, 1),
        'source', r.source,
        'device', r.device,
        'username', (select p.username from public.profiles p where p.id = r.user_id),
        'user_id', r.user_id,
        'landing', r.landing,
        'pages', r.pages,
        'actions', r.actions,
        'events', (select jsonb_agg(jsonb_build_object(
                      't', e.created_at, 'type', e.event_type, 'path', e.path, 'name', e.item_name,
                      'item_type', e.item_type, 'results', e.results_count, 'meta', e.meta) order by e.created_at)
                   from ev e where e.session_id = r.session_id)
      ) order by r.started_at desc) from recent r), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_sessions(date, date, int, text) from public, anon;
grant execute on function public.admin_sessions(date, date, int, text) to authenticated;

-- admin_afluencia
drop function if exists public.admin_afluencia(date, date);
create or replace function public.admin_afluencia(p_from date, p_to date, p_city text default null)
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
      and public.item_in_city(a.item_type::text, a.item_id::text, p_city)
      and a.user_id not in (select id from admin_ids)
    group by a.night
    union all
    select 'checkin', c.checkin_date::date, count(distinct c.user_id)::int
    from public.club_checkins c
    where c.checkin_date between v_from and v_to
      and public.item_in_city('club', c.club_id::text, p_city)
      and c.user_id not in (select id from admin_ids)
    group by c.checkin_date
    union all
    select 'visits',
           (((a.created_at at time zone 'Europe/Madrid') - interval '6 hours')::date),
           count(distinct coalesce(a.visitor_id, a.session_id::text))::int
    from public.analytics_of_city(p_city) a
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

revoke all on function public.admin_afluencia(date, date, text) from public, anon;
grant execute on function public.admin_afluencia(date, date, text) to authenticated;

-- admin_retention
drop function if exists public.admin_retention(int);
create or replace function public.admin_retention(p_days int default 60, p_city text default null)
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
      and (p_city is null or p_city not in ('madrid', 'barcelona')
           or u.id in (select c.user_id from public.analytics_of_city(p_city) c where c.user_id is not null)
           or (p_city = 'barcelona' and u.id not in (select x.user_id from public.analytics x where x.user_id is not null)))
  ),
  -- Días en que cada cuenta hizo algo en la web.
  act as (
    select distinct a.user_id as id, (a.created_at at time zone 'Europe/Madrid')::date as day
    from public.analytics_of_city(p_city) a
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
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_30
    group by 1
  ),
  app_acc as (
    select a.user_id, count(distinct (a.created_at at time zone 'Europe/Madrid')::date) as n
    from public.analytics_of_city(p_city) a
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
      'installs_total', (select count(*) from public.analytics_of_city(p_city) where event_type = 'app_installed'),
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

revoke all on function public.admin_retention(int, text) from public, anon;
grant execute on function public.admin_retention(int, text) to authenticated;

-- admin_funnel
drop function if exists public.admin_funnel(date, date);
create or replace function public.admin_funnel(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with ev as (
    select coalesce(a.visitor_id, a.session_id::text) as pid, a.event_type::text as event_type,
           a.item_type::text as item_type, a.meta as meta
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to
      and coalesce(a.visitor_id, a.session_id::text) is not null
  ),
  everyone as (select distinct pid from ev),
  ficha as (
    select distinct pid from ev
    where event_type = 'page_view' and item_type in ('club', 'event', 'club_event')
  ),
  interest as (
    -- cualquier clic de interés en una ficha (web, redes, llamar, taxi, entradas, cómo llegar, compartir, favorito)
    select distinct pid from ev
    where event_type in ('tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
                         'phone_click', 'ride_click', 'share_click', 'favorite_click')
  ),
  intent as (
    -- clics de quien ya casi va: entradas, cómo llegar, taxi/VTC o llamar al taxi
    select distinct pid from ev
    where event_type in ('tickets_click', 'directions_click', 'ride_click')
       or (event_type = 'phone_click' and meta ->> 'category' = 'taxi')
  ),
  chose as (
    select distinct pid from ev where event_type in ('signup_email_open', 'google_click')
  ),
  signup_steps as (
    select s.ord, s.step, count(distinct e.pid) as n
    from (values
      (1, 'join_view'), (2, 'signup_view'), (3, 'choose'), (4, 'signup_submit'), (5, 'signup_ok'), (6, 'signup_error')
    ) as s(ord, step)
    left join ev e on (
      e.event_type = s.step
      or (s.step = 'choose' and e.event_type in ('signup_email_open', 'google_click'))
    )
    group by s.ord, s.step
  ),
  errors as (
    select coalesce(nullif(meta ->> 'step', ''), 'sin dato') as step,
           coalesce(nullif(meta ->> 'reason', ''), 'sin dato') as reason,
           count(distinct pid) as n
    from ev where event_type = 'signup_error'
    group by 1, 2
    order by count(distinct pid) desc
    limit 8
  )
  select jsonb_build_object(
    'browse', jsonb_build_array(
      jsonb_build_object('step', 'visitors', 'n', (select count(*) from everyone)),
      jsonb_build_object('step', 'ficha', 'n', (select count(*) from ficha)),
      jsonb_build_object('step', 'interest', 'n', (select count(*) from interest i join ficha f using (pid))),
      jsonb_build_object('step', 'intent', 'n', (select count(*) from intent i join ficha f using (pid)))
    ),
    'signup', coalesce((select jsonb_agg(jsonb_build_object('step', step, 'n', n) order by ord) from signup_steps), '[]'::jsonb),
    'errors', coalesce((select jsonb_agg(jsonb_build_object('step', step, 'reason', reason, 'n', n)) from errors), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_funnel(date, date, text) from public, anon;
grant execute on function public.admin_funnel(date, date, text) to authenticated;

-- admin_source_quality
drop function if exists public.admin_source_quality(date, date);
create or replace function public.admin_source_quality(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with ev as (
    select coalesce(a.visitor_id, a.session_id::text) as pid, a.event_type::text as event_type,
           a.item_type::text as item_type, a.source::text as source, a.meta as meta, a.created_at
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to
      and coalesce(a.visitor_id, a.session_id::text) is not null
  ),
  per_person as (
    select pid,
           -- el origen con el que llegó la primera vez en el periodo (si no consta, directo)
           coalesce((array_agg(source order by created_at) filter (where source is not null))[1], 'direct') as source,
           bool_or(event_type = 'page_view' and item_type in ('club', 'event', 'club_event')) as ficha,
           bool_or(event_type in ('tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
                                  'phone_click', 'ride_click', 'share_click', 'favorite_click')) as clicked,
           bool_or(event_type in ('tickets_click', 'directions_click', 'ride_click')
                   or (event_type = 'phone_click' and meta ->> 'category' = 'taxi')) as intent,
           bool_or(event_type = 'signup_ok') as signed,
           -- rebote: no hizo nada más que abrir (sin cambiar de página, buscar, filtrar ni hacer clic)
           not bool_or(event_type not in ('session_start', 'page_view', 'page_time')) as bounced
    from ev group by pid
  ),
  by_source as (
    select source,
           count(*) as people,
           count(*) filter (where ficha) as ficha,
           count(*) filter (where clicked) as clicked,
           count(*) filter (where intent) as intent,
           count(*) filter (where signed) as signed,
           count(*) filter (where bounced) as bounced
    from per_person group by source
    order by count(*) desc
    limit 15
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'source', source, 'people', people, 'ficha', ficha, 'clicked', clicked,
    'intent', intent, 'signed', signed, 'bounced', bounced) order by people desc), '[]'::jsonb)
  into result from by_source;

  return result;
end $$;

revoke all on function public.admin_source_quality(date, date, text) from public, anon;
grant execute on function public.admin_source_quality(date, date, text) to authenticated;

-- admin_hours_madrid
drop function if exists public.admin_hours_madrid(date, date);
create or replace function public.admin_hours_madrid(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with ev as (
    select a.event_type::text as event_type, a.meta as meta,
           extract(hour from a.created_at at time zone 'Europe/Madrid')::int as h,
           extract(isodow from a.created_at at time zone 'Europe/Madrid')::int as d
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to
      and a.event_type in ('page_view', 'session_start', 'tickets_click', 'website_click', 'directions_click',
                           'instagram_click', 'tiktok_click', 'phone_click', 'share_click', 'favorite_click', 'ride_click')
  ),
  clicks as (
    -- una llamada al taxi es un teléfono con category = taxi: se cuenta aparte para ver cuándo se pide
    select case when event_type = 'phone_click' and meta ->> 'category' = 'taxi' then 'taxi_call' else event_type end as kind,
           h, count(*) as n
    from ev
    where event_type not in ('page_view', 'session_start')
    group by 1, 2
  )
  select jsonb_build_object(
    'views',    coalesce((select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h)
                          from (select h, count(*) as n from ev where event_type = 'page_view' group by h) x), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h)
                          from (select h, count(*) as n from ev where event_type = 'session_start' group by h) x), '[]'::jsonb),
    'weekdays', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d)
                          from (select d, count(*) as n from ev where event_type = 'page_view' group by d) x), '[]'::jsonb),
    'clicks',   coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'h', h, 'n', n) order by kind, h) from clicks), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_hours_madrid(date, date, text) from public, anon;
grant execute on function public.admin_hours_madrid(date, date, text) to authenticated;

-- admin_club_actions
drop function if exists public.admin_club_actions(date, date);
create or replace function public.admin_club_actions(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'item_type', item_type, 'item_id', item_id,
           'instagram', instagram, 'tiktok', tiktok, 'phone', phone, 'rides', rides, 'taxi_calls', taxi_calls)), '[]'::jsonb)
  into result
  from (
    select a.item_type::text as item_type, a.item_id::text as item_id,
           count(*) filter (where a.event_type = 'instagram_click') as instagram,
           count(*) filter (where a.event_type = 'tiktok_click') as tiktok,
           count(*) filter (where a.event_type = 'phone_click' and coalesce(a.meta ->> 'category', '') <> 'taxi') as phone,
           count(*) filter (where a.event_type = 'ride_click') as rides,
           count(*) filter (where a.event_type = 'phone_click' and a.meta ->> 'category' = 'taxi') as taxi_calls
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to
      and a.item_type in ('club', 'event') and a.item_id is not null
      and a.event_type in ('instagram_click', 'tiktok_click', 'phone_click', 'ride_click')
    group by a.item_type, a.item_id
  ) x;

  return result;
end $$;

revoke all on function public.admin_club_actions(date, date, text) from public, anon;
grant execute on function public.admin_club_actions(date, date, text) to authenticated;

-- admin_search_detail
drop function if exists public.admin_search_detail(date, date);
create or replace function public.admin_search_detail(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with s as (
    select a.session_id::text as session_id, a.created_at as t, lower(a.item_name::text) as term,
           a.results_count as results, (a.created_at at time zone 'Europe/Madrid')::date as day
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to
      and a.event_type = 'search' and a.item_name is not null and btrim(a.item_name::text) <> ''
  ),
  checked as (
    -- «después abre algo»: en los 5 minutos siguientes, en la misma visita, abre una ficha o hace un clic
    select s.*, exists (
      select 1 from public.analytics_of_city(p_city) b
      where b.session_id::text = s.session_id
        and b.created_at > s.t and b.created_at <= s.t + interval '5 minutes'
        and ((b.event_type = 'page_view' and b.item_type in ('club', 'event', 'club_event'))
             or b.event_type in ('tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
                                 'phone_click', 'ride_click', 'share_click', 'favorite_click',
                                 'essential_open', 'essential_directions', 'essential_maps'))
    ) as opened
    from s
  ),
  terms as (
    select term, count(*) as n, count(*) filter (where opened) as opened,
           count(*) filter (where results = 0) as zero
    from checked group by term
    order by count(*) desc, term
    limit 300
  ),
  daily as (
    select day, count(*) as n, count(*) filter (where results = 0) as zero
    from s group by day
  )
  select jsonb_build_object(
    'terms', coalesce((select jsonb_agg(jsonb_build_object('term', term, 'n', n, 'opened', opened, 'zero', zero) order by n desc, term) from terms), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'n', n, 'zero', zero) order by day) from daily), '[]'::jsonb),
    'total', (select count(*) from checked),
    'total_opened', (select count(*) from checked where opened)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_search_detail(date, date, text) from public, anon;
grant execute on function public.admin_search_detail(date, date, text) to authenticated;

-- admin_visitor_languages
drop function if exists public.admin_visitor_languages(date, date);
create or replace function public.admin_visitor_languages(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with ev as (
    select coalesce(a.visitor_id, a.session_id::text) as pid, a.event_type::text as event_type, a.item_type::text as item_type,
           nullif(lower(split_part(replace(coalesce(a.locale::text, ''), '_', '-'), '-', 1)), '') as lang, a.created_at
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to
      and coalesce(a.visitor_id, a.session_id::text) is not null
  ),
  per_person as (
    select pid,
           coalesce((array_agg(lang order by created_at) filter (where lang is not null))[1], 'unknown') as lang,
           bool_or(event_type = 'page_view' and item_type in ('club', 'event', 'club_event')) as ficha,
           bool_or(event_type in ('tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
                                  'phone_click', 'ride_click', 'share_click', 'favorite_click')) as clicked
    from ev group by pid
  ),
  by_lang as (
    select lang, count(*) as people, count(*) filter (where ficha) as ficha, count(*) filter (where clicked) as clicked
    from per_person group by lang
    order by count(*) desc
    limit 15
  )
  select coalesce(jsonb_agg(jsonb_build_object('lang', lang, 'people', people, 'ficha', ficha, 'clicked', clicked) order by people desc), '[]'::jsonb)
  into result from by_lang;

  return result;
end $$;

revoke all on function public.admin_visitor_languages(date, date, text) from public, anon;
grant execute on function public.admin_visitor_languages(date, date, text) to authenticated;

-- admin_visitor_countries
drop function if exists public.admin_visitor_countries(date, date);
create or replace function public.admin_visitor_countries(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with ev as (
    select coalesce(a.visitor_id, a.session_id::text) as pid, a.event_type::text as event_type, a.item_type::text as item_type,
           nullif(upper(trim(coalesce(a.country::text, ''))), '') as country, a.created_at
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to
      and coalesce(a.visitor_id, a.session_id::text) is not null
  ),
  per_person as (
    select pid,
           coalesce((array_agg(country order by created_at) filter (where country is not null))[1], 'unknown') as country,
           bool_or(event_type = 'page_view' and item_type in ('club', 'event', 'club_event')) as ficha,
           bool_or(event_type in ('tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
                                  'phone_click', 'ride_click', 'share_click', 'favorite_click')) as clicked
    from ev group by pid
  ),
  by_country as (
    select country, count(*) as people, count(*) filter (where ficha) as ficha, count(*) filter (where clicked) as clicked
    from per_person group by country
    order by count(*) desc
    limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object('country', country, 'people', people, 'ficha', ficha, 'clicked', clicked) order by people desc), '[]'::jsonb)
  into result from by_country;

  return result;
end $$;

revoke all on function public.admin_visitor_countries(date, date, text) from public, anon;
grant execute on function public.admin_visitor_countries(date, date, text) to authenticated;

-- admin_essentials_stats
drop function if exists public.admin_essentials_stats(date, date);
create or replace function public.admin_essentials_stats(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  t_from timestamptz;
  t_to timestamptz;
  v_from date := least(p_from, p_to);
  v_to date := greatest(p_from, p_to);
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;
  -- Máximo un año de golpe.
  if v_to - v_from > 366 then
    v_from := v_to - 366;
  end if;
  t_from := (v_from::timestamp) at time zone 'Europe/Madrid';
  t_to := ((v_to + 1)::timestamp) at time zone 'Europe/Madrid';

  with ev as (
    select
      a.event_type,
      a.item_id::text as item_id,
      a.item_name,
      case
        when a.event_type = 'essential_category' then a.item_name
        else nullif((a.meta::jsonb) ->> 'category', '')
      end as cat,
      (a.created_at at time zone 'Europe/Madrid')::date as day,
      coalesce(a.visitor_id, a.session_id::text) as who
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from
      and a.created_at < t_to
      and a.event_type in ('essential_category', 'essential_open', 'essential_directions', 'essential_maps', 'essential_nearby')
  ),
  totals as (
    select
      count(*) filter (where event_type = 'essential_category') as category_views,
      count(*) filter (where event_type = 'essential_open') as opens,
      count(*) filter (where event_type = 'essential_directions') as directions,
      count(*) filter (where event_type = 'essential_maps') as maps,
      count(*) filter (where event_type = 'essential_nearby') as nearby,
      count(distinct who) as visitors
    from ev
  ),
  categories as (
    select
      cat,
      count(*) filter (where event_type = 'essential_category') as views,
      count(distinct who) filter (where event_type = 'essential_category') as visitors,
      count(*) filter (where event_type = 'essential_open') as opens,
      count(*) filter (where event_type = 'essential_directions') as directions,
      count(*) filter (where event_type = 'essential_maps') as maps,
      count(*) filter (where event_type = 'essential_nearby') as nearby
    from ev
    where cat is not null
    group by cat
  ),
  items as (
    select
      item_id,
      max(item_name) as name,
      max(cat) as category,
      count(*) filter (where event_type = 'essential_open') as opens,
      count(distinct who) filter (where event_type = 'essential_open') as visitors,
      count(*) filter (where event_type = 'essential_directions') as directions,
      count(*) filter (where event_type = 'essential_maps') as maps
    from ev
    where item_id is not null
      and event_type in ('essential_open', 'essential_directions', 'essential_maps')
    group by item_id
    order by count(*) filter (where event_type = 'essential_open') desc,
             count(*) filter (where event_type = 'essential_directions') desc
    limit 300
  ),
  days as (
    select generate_series(v_from, v_to, interval '1 day')::date as day
  ),
  daily as (
    select d.day,
      count(*) filter (where e.event_type = 'essential_category') as category_views,
      count(*) filter (where e.event_type = 'essential_open') as opens
    from days d
    left join ev e on e.day = d.day
    group by d.day
  )
  select jsonb_build_object(
    'totals', (select to_jsonb(t) from totals t),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(day, 'YYYY-MM-DD'), 'category_views', category_views, 'opens', opens) order by day) from daily), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.views desc, c.opens desc) from categories c), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(to_jsonb(i)) from items i), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_essentials_stats(date, date, text) from public, anon;
grant execute on function public.admin_essentials_stats(date, date, text) to authenticated;

-- admin_interaction_stats
drop function if exists public.admin_interaction_stats(date, date);
create or replace function public.admin_interaction_stats(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with acts as (
    -- clics registrados por la web
    select a.event_type::text as kind, a.item_type::text as item_type, a.item_id::text as item_id,
           a.item_name::text as item_name, a.user_id::text as who_user, a.session_id::text as who_session,
           (a.created_at at time zone 'Europe/Madrid')::date as day, a.meta as meta
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to
      and a.event_type in ('directions_click', 'website_click', 'instagram_click', 'tiktok_click', 'tickets_click',
                           'phone_click', 'share_click', 'favorite_click', 'ride_click')
    union all
    -- «asistiré» (tabla attendances; cada marca lleva la noche a la que se refiere)
    select 'attendance', t.item_type::text, t.item_id::text, null, t.user_id::text, null, t.night::date, null::jsonb
    from public.attendances t
    where t.night::date >= p_from and t.night::date <= p_to
      and public.item_in_city(t.item_type::text, t.item_id::text, p_city)
  ),
  totals as (
    select kind, count(*) as n, count(distinct coalesce(who_user, who_session)) as people
    from acts group by kind
  ),
  daily as (
    select day, kind, count(*) as n from acts group by day, kind
  ),
  ranked as (
    select a.kind, a.item_type, a.item_id,
           coalesce(max(a.item_name), max(c.name), max(e.title), max(ce.title)) as name,
           count(*) as n,
           row_number() over (partition by a.kind order by count(*) desc) as rn
    from acts a
    left join public.clubs c on a.item_type = 'club' and c.id::text = a.item_id
    left join public.events e on a.item_type = 'event' and e.id::text = a.item_id
    left join public.club_events ce on a.item_type = 'club_event' and ce.id::text = a.item_id
    where a.item_id is not null
    group by a.kind, a.item_type, a.item_id
  ),
  fav_ranked as (
    -- favoritos guardados ahora mismo (no dependen del periodo)
    select f.item_type::text as item_type, f.item_id::text as item_id,
           coalesce(max(c.name), max(e.title), max(ce.title)) as name,
           count(*) as n,
           row_number() over (order by count(*) desc) as rn
    from public.favorites f
    left join public.clubs c on f.item_type = 'club' and c.id::text = f.item_id::text
    left join public.events e on f.item_type = 'event' and e.id::text = f.item_id::text
    left join public.club_events ce on f.item_type = 'club_event' and ce.id::text = f.item_id::text
    where public.item_in_city(f.item_type::text, f.item_id::text, p_city)
    group by f.item_type, f.item_id
  ),
  -- Taxi y VTC: cada app que se pulsa (meta.provider) y las llamadas al taxi (phone_click con meta.category = 'taxi').
  rides as (
    select case when kind = 'ride_click' then coalesce(nullif(meta ->> 'provider', ''), 'unknown') else 'taxi_phone' end as provider,
           count(*) as n,
           count(distinct coalesce(who_user, who_session)) as people
    from acts
    where kind = 'ride_click' or (kind = 'phone_click' and meta ->> 'category' = 'taxi')
    group by 1
  ),
  -- Desde dónde se pide: la ficha de un club, la de un evento o la página de taxi.
  ride_origins as (
    select coalesce(nullif(meta ->> 'source', ''),
                    case when item_type in ('event', 'club_event') then 'event_page'
                         when item_type = 'club' then 'club_page'
                         else 'unknown' end) as origin,
           count(*) as n
    from acts
    where kind = 'ride_click' or (kind = 'phone_click' and meta ->> 'category' = 'taxi')
    group by 1
  ),
  -- A qué webs van: dominio de destino de los clics en entradas y en la web del local (meta.host).
  -- Los clics anteriores a este cambio no lo llevan: salen con host vacío.
  destinations as (
    select kind, nullif(meta ->> 'host', '') as host, count(*) as n,
           row_number() over (partition by kind order by count(*) desc, nullif(meta ->> 'host', '') nulls last) as rn
    from acts
    where kind in ('tickets_click', 'website_click')
    group by kind, nullif(meta ->> 'host', '')
  ),
  -- Cómo se comparte: menú de compartir del móvil o enlace copiado (meta.channel).
  share_channels as (
    select coalesce(nullif(meta ->> 'channel', ''), 'unknown') as channel, count(*) as n
    from acts
    where kind = 'share_click'
    group by 1
  )
  select jsonb_build_object(
    'totals', coalesce((select jsonb_object_agg(kind, jsonb_build_object('n', n, 'people', people)) from totals), '{}'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'n', n) order by day) from daily), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'item_type', item_type, 'item_id', item_id, 'name', name, 'n', n) order by kind, n desc)
                     from ranked where rn <= 10), '[]'::jsonb),
    'favorites_total', (select count(*) from public.favorites f where public.item_in_city(f.item_type::text, f.item_id::text, p_city)),
    'favorites_people', (select count(distinct f.user_id) from public.favorites f where public.item_in_city(f.item_type::text, f.item_id::text, p_city)),
    'favorites_top', coalesce((select jsonb_agg(jsonb_build_object('item_type', item_type, 'item_id', item_id, 'name', name, 'n', n) order by n desc)
                               from fav_ranked where rn <= 15), '[]'::jsonb),
    'rides', coalesce((select jsonb_agg(jsonb_build_object('provider', provider, 'n', n, 'people', people) order by n desc, provider) from rides), '[]'::jsonb),
    'ride_origins', coalesce((select jsonb_agg(jsonb_build_object('origin', origin, 'n', n) order by n desc, origin) from ride_origins), '[]'::jsonb),
    'destinations', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'host', host, 'n', n) order by kind, n desc, host)
                              from destinations where rn <= 12), '[]'::jsonb),
    'share_channels', coalesce((select jsonb_agg(jsonb_build_object('channel', channel, 'n', n) order by n desc, channel) from share_channels), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_interaction_stats(date, date, text) from public, anon;
grant execute on function public.admin_interaction_stats(date, date, text) to authenticated;

-- admin_time_stats
drop function if exists public.admin_time_stats(date, date);
create or replace function public.admin_time_stats(p_from date, p_to date, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with ev as (
    select a.session_id, a.user_id, a.device, a.event_type, a.created_at,
           coalesce(a.meta ->> 'path', a.path) as page_path,
           -- cualquiera puede mandar eventos con la clave anon: solo se aceptan números razonables
           case when a.event_type = 'page_time' and (a.meta ->> 'seconds') ~ '^[0-9]{1,4}(\.[0-9]+)?$'
                then least((a.meta ->> 'seconds')::numeric, 1800) end as secs
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.created_at < t_to and a.session_id is not null
  ),
  sess as (
    select session_id,
           (array_agg(user_id) filter (where user_id is not null))[1] as user_id,
           (array_agg(device) filter (where device is not null))[1] as device,
           extract(epoch from (max(created_at) - min(created_at))) as span,
           coalesce(sum(secs), 0) as active
    from ev group by session_id
  ),
  vis as (
    -- tiempo de la visita: el medido (page_time) si lo hay; si no, el de primer a último registro
    select session_id, user_id, device,
           case when active > 0 then active else span end as secs,
           (active > 0) as measured
    from sess
  ),
  timed as (select * from vis where secs > 0),
  per_page as (
    -- una persona que sale y vuelve a la misma página en una visita cuenta como una vista
    select session_id, page_path, sum(secs) as secs
    from ev where secs is not null and page_path is not null
    group by session_id, page_path
  ),
  per_section as (
    select coalesce(substring(page_path from '^/[^/?#]*'), '/') as section,
           count(*) as views, sum(secs) as total, avg(secs) as avg_secs
    from per_page group by 1
  ),
  per_page_top as (
    select page_path, count(*) as views, sum(secs) as total, avg(secs) as avg_secs,
           row_number() over (order by sum(secs) desc) as rn
    from per_page group by page_path
  ),
  per_user as (
    select user_id, count(*) as visits, sum(secs) as total
    from timed where user_id is not null group by user_id
  )
  select jsonb_build_object(
    'visits', jsonb_build_object(
      'total', (select count(*) from vis),
      'timed', (select count(*) from timed),
      'measured', (select count(*) from timed where measured),
      'avg_secs', (select round(avg(secs)) from timed),
      'median_secs', (select round((percentile_cont(0.5) within group (order by secs))::numeric) from timed),
      'total_secs', (select round(sum(secs)) from timed)
    ),
    'by_device', coalesce((select jsonb_agg(jsonb_build_object('label', coalesce(device, '—'), 'n', n, 'avg_secs', avg_secs) order by n desc)
                           from (select device, count(*) n, round(avg(secs)) avg_secs from timed group by device) t), '[]'::jsonb),
    'by_account', jsonb_build_object(
      'with_account', jsonb_build_object('n', (select count(*) from timed where user_id is not null),
                                         'avg_secs', (select round(avg(secs)) from timed where user_id is not null)),
      'anonymous', jsonb_build_object('n', (select count(*) from timed where user_id is null),
                                      'avg_secs', (select round(avg(secs)) from timed where user_id is null))
    ),
    'sections', coalesce((select jsonb_agg(jsonb_build_object('section', section, 'views', views, 'avg_secs', round(avg_secs), 'total_secs', round(total)) order by total desc)
                          from per_section), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('path', page_path, 'views', views, 'avg_secs', round(avg_secs), 'total_secs', round(total)) order by total desc)
                       from per_page_top where rn <= 25), '[]'::jsonb),
    'users', coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'visits', visits, 'total_secs', round(total)) order by total desc)
                       from per_user), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_time_stats(date, date, text) from public, anon;
grant execute on function public.admin_time_stats(date, date, text) to authenticated;

-- admin_time_series
drop function if exists public.admin_time_series(text);
create or replace function public.admin_time_series(p_grain text, p_city text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  g text := lower(coalesce(p_grain, ''));
  today date := (now() at time zone 'Europe/Madrid')::date;
  b_to date;
  b_from date;
  t_from timestamptz;
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;
  if g not in ('day', 'week', 'month', 'year') then
    raise exception 'Periodo no válido';
  end if;

  -- Primer día del periodo actual y del primero que se enseña.
  b_to := date_trunc(g, today::timestamp)::date;
  b_from := case g
    when 'day'   then b_to - 29
    when 'week'  then (b_to - interval '11 weeks')::date
    when 'month' then (b_to - interval '11 months')::date
    else (b_to - interval '1 year')::date
  end;
  t_from := b_from::timestamp at time zone 'Europe/Madrid';

  with ev as (
    select a.session_id, a.created_at,
           -- cualquiera puede mandar eventos con la clave anon: solo se aceptan números razonables
           case when a.event_type = 'page_time' and (a.meta ->> 'seconds') ~ '^[0-9]{1,4}(\.[0-9]+)?$'
                then least((a.meta ->> 'seconds')::numeric, 1800) end as secs
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from and a.session_id is not null
  ),
  sess as (
    select session_id, min(created_at) as started,
           extract(epoch from (max(created_at) - min(created_at))) as span,
           coalesce(sum(secs), 0) as active
    from ev group by session_id
  ),
  timed as (
    select date_trunc(g, (started at time zone 'Europe/Madrid'))::date as period,
           case when active > 0 then active else span end as secs
    from sess
    where (case when active > 0 then active else span end) > 0
  ),
  agg as (
    select period, count(*) as visits, round(avg(secs)) as avg_secs, round(sum(secs)) as total_secs
    from timed group by period
  )
  select jsonb_build_object(
    'grain', g,
    'from', b_from,
    'to', b_to,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('period', period, 'visits', visits, 'avg_secs', avg_secs, 'total_secs', total_secs) order by period) from agg), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_time_series(text, text) from public, anon;
grant execute on function public.admin_time_series(text, text) to authenticated;

-- Avisa a la API de Supabase de que las funciones han cambiado (si no, tarda un poco en conocer el parámetro nuevo).
notify pgrst, 'reload schema';

-- Comprobación: debe salir una fila por función, todas con p_city.
select p.proname as funcion, pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('admin_sessions', 'admin_afluencia', 'admin_retention', 'admin_funnel', 'admin_source_quality',
                    'admin_hours_madrid', 'admin_club_actions', 'admin_search_detail', 'admin_visitor_languages',
                    'admin_visitor_countries', 'admin_essentials_stats', 'admin_interaction_stats', 'admin_time_stats',
                    'admin_time_series')
order by 1;
