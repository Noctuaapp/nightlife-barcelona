-- =====================================================================================
-- Noctua · Más información en Admin › Datos (embudo, origen que convierte, horas, clubs, búsquedas, idioma) · 11/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué añade (todo son funciones nuevas que SOLO LEEN; no cambia ninguna tabla ni ninguna función anterior):
--   · admin_funnel:           de la visita al registro: cuánta gente llega, ve una ficha, hace un clic, pide taxi/entradas,
--                             y cuántos abren el registro, lo envían y lo completan (con los errores más frecuentes).
--   · admin_source_quality:   qué origen del tráfico convierte (Google, Instagram, directo...) y cuál rebota.
--   · admin_hours_madrid:     visitas, visitas por día de la semana y clics por hora, SIEMPRE en hora de Madrid.
--   · admin_club_actions:     por club y evento: Instagram, TikTok, llamadas, taxi/VTC y favoritos (lo que faltaba en la tabla).
--   · admin_search_detail:    por búsqueda: cuántas veces después abren algo (ficha, clic) y cuántas veces al día se busca.
--   · admin_visitor_languages: idioma con el que ven la web los visitantes (con o sin cuenta).
--
-- Cómo se cuenta «personas»: igual que Admin › Visitas, con el código anónimo de visitante (cambia cada día)
-- y, si una visita no lo tiene, su sesión. Una persona que vuelve otro día cuenta otra vez.
-- Todas las fechas son de calendario en hora de Madrid. Solo las ejecuta el admin (is_noctua_admin()).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1) Embudo: de la visita al registro
-- -------------------------------------------------------------------------------------
create or replace function public.admin_funnel(p_from date, p_to date)
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
    from public.analytics a
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

revoke all on function public.admin_funnel(date, date) from public, anon;
grant execute on function public.admin_funnel(date, date) to authenticated;

-- -------------------------------------------------------------------------------------
-- 2) Qué origen del tráfico convierte
-- -------------------------------------------------------------------------------------
create or replace function public.admin_source_quality(p_from date, p_to date)
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
    from public.analytics a
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

revoke all on function public.admin_source_quality(date, date) from public, anon;
grant execute on function public.admin_source_quality(date, date) to authenticated;

-- -------------------------------------------------------------------------------------
-- 3) Horas y días de la semana, SIEMPRE en hora de Madrid
-- -------------------------------------------------------------------------------------
create or replace function public.admin_hours_madrid(p_from date, p_to date)
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
    from public.analytics a
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

revoke all on function public.admin_hours_madrid(date, date) from public, anon;
grant execute on function public.admin_hours_madrid(date, date) to authenticated;

-- -------------------------------------------------------------------------------------
-- 4) Acciones por club y por evento (lo que la tabla de Clubs no enseñaba)
-- -------------------------------------------------------------------------------------
create or replace function public.admin_club_actions(p_from date, p_to date)
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
    from public.analytics a
    where a.created_at >= t_from and a.created_at < t_to
      and a.item_type in ('club', 'event') and a.item_id is not null
      and a.event_type in ('instagram_click', 'tiktok_click', 'phone_click', 'ride_click')
    group by a.item_type, a.item_id
  ) x;

  return result;
end $$;

revoke all on function public.admin_club_actions(date, date) from public, anon;
grant execute on function public.admin_club_actions(date, date) to authenticated;

-- -------------------------------------------------------------------------------------
-- 5) Búsquedas: ¿encuentran lo que buscan? y tendencia por día
-- -------------------------------------------------------------------------------------
create or replace function public.admin_search_detail(p_from date, p_to date)
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
    from public.analytics a
    where a.created_at >= t_from and a.created_at < t_to
      and a.event_type = 'search' and a.item_name is not null and btrim(a.item_name::text) <> ''
  ),
  checked as (
    -- «después abre algo»: en los 5 minutos siguientes, en la misma visita, abre una ficha o hace un clic
    select s.*, exists (
      select 1 from public.analytics b
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

revoke all on function public.admin_search_detail(date, date) from public, anon;
grant execute on function public.admin_search_detail(date, date) to authenticated;

-- -------------------------------------------------------------------------------------
-- 6) Idioma con el que ven la web los visitantes (no hace falta cuenta)
-- -------------------------------------------------------------------------------------
create or replace function public.admin_visitor_languages(p_from date, p_to date)
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
    from public.analytics a
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

revoke all on function public.admin_visitor_languages(date, date) from public, anon;
grant execute on function public.admin_visitor_languages(date, date) to authenticated;
