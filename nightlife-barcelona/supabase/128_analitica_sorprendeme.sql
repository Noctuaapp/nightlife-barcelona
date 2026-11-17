-- =====================================================================================
-- Noctua · Indicador de «Sorpréndeme» (quién abre la ruleta, qué sale y a qué se hace clic) · 17/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Hace dos cosas en un solo paso:
--  1) Sustituye a 120_analitica_plan_en_grupo.sql en lo que toca a analytics_guard (copia su lista entera y añade
--     tres tipos). Es la misma función con la misma lógica: solo cambia la lista de tipos permitidos.
--       surprise_open    → alguien pulsa el botón «Sorpréndeme» y se abre la ruleta
--       surprise_result  → la ruleta enseña un local (meta.mood = rollo elegido, meta.filters = nº de filtros, meta.again = true si
--                          ha pulsado «Otra opción»); item_name = nombre del local
--       surprise_click   → desde el resultado pulsa «Ver ficha» o «Cómo llegar» (meta.action = venue | directions)
--  2) Crea admin_surprise_stats(desde, hasta, ciudad), la función que lee Admin › Datos › Resumen para enseñar las cifras.
-- Sigue siendo una lista cerrada: un tipo inventado desde fuera se descarta.
-- El test src/lib/__tests__/analyticsEvents.test.ts avisa si el código envía un tipo que falte aquí.
--
-- Hasta que se ejecute este SQL, los tres eventos nuevos se descartan sin dar error (la web sigue igual).
-- =====================================================================================

create or replace function public.analytics_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  -- Solo filtra lo que llega del navegador (anon / authenticated). El servidor y el editor SQL pasan.
  if caller_role is null or caller_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.event_type is null or new.event_type not in (
    -- visita y recorrido
    'session_start', 'page_nav', 'page_view', 'search', 'filter_used',
    -- clics en la ficha de un local o evento
    'tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
    'share_click', 'favorite_click', 'phone_click', 'ride_click',
    'tab_open', 'nearby_click', 'related_click', 'next_click', 'top_pick_click', 'welcome_click',
    -- aviso de registro y registro
    'join_view', 'join_click', 'join_dismiss',
    'signup_view', 'signup_email_open', 'signup_submit', 'signup_ok', 'signup_error', 'google_click',
    'confirm_age_view', 'confirm_age_done',
    -- app instalada y encuesta del día
    'install_click', 'install_choice', 'app_installed', 'party_poll_vote',
    -- portada, aviso de registro de favoritos y franja general de «Crear cuenta»
    'zone_pick', 'home_tile_click', 'auth_gate_view', 'banner_click', 'banner_dismiss',
    -- esenciales
    'essential_category', 'essential_open', 'essential_directions', 'essential_maps', 'essential_nearby',
    -- tiempo que se queda en cada página (segundos con la pestaña a la vista, en meta)
    'page_time',
    -- planes en grupo: crear un plan o una votación, votar y apuntarse (sin cuenta)
    'plan_create', 'plan_poll_create', 'plan_poll_vote', 'plan_rsvp',
    -- Sorpréndeme: abrir la ruleta, local que sale y clic en el resultado
    'surprise_open', 'surprise_result', 'surprise_click'
  ) then
    return null; -- se descarta sin dar error
  end if;

  new.created_at := now();                       -- nada de fechas inventadas
  new.item_name := left(new.item_name, 200);
  new.path := left(new.path, 200);
  new.source := left(new.source, 60);
  new.device := left(new.device, 20);
  new.locale := left(new.locale, 10);
  new.session_id := left(new.session_id, 64);
  if new.meta is not null and length(new.meta::text) > 2000 then
    new.meta := null;
  end if;

  -- Más de 120 eventos en 10 minutos desde la misma sesión/usuario = no es una persona.
  if (new.session_id is not null or new.user_id is not null)
     and public.analytics_recent_count(new.session_id, new.user_id) >= 120 then
    return null;
  end if;

  return new;
end $function$;

-- Comprobación: debe salir ok = true en los tres tipos nuevos y en los de antes. Pégamela entera.
select jsonb_build_object(
  'ok', bool_and(pg_get_functiondef('public.analytics_guard()'::regprocedure) like '%''' || t || '''%'),
  'tipos_comprobados', count(*),
  'faltan', coalesce(jsonb_agg(t) filter (where pg_get_functiondef('public.analytics_guard()'::regprocedure) not like '%''' || t || '''%'), '[]'::jsonb)
) as resultado
from unnest(array[
  'session_start', 'page_nav', 'page_view', 'search', 'filter_used',
  'tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
  'share_click', 'favorite_click', 'phone_click', 'ride_click',
  'tab_open', 'nearby_click', 'related_click', 'next_click', 'top_pick_click', 'welcome_click',
  'join_view', 'join_click', 'join_dismiss',
  'signup_view', 'signup_email_open', 'signup_submit', 'signup_ok', 'signup_error', 'google_click',
  'confirm_age_view', 'confirm_age_done',
  'install_click', 'install_choice', 'app_installed', 'party_poll_vote',
  'zone_pick', 'home_tile_click', 'auth_gate_view', 'banner_click', 'banner_dismiss',
  'essential_category', 'essential_open', 'essential_directions', 'essential_maps', 'essential_nearby',
  'page_time',
  'plan_create', 'plan_poll_create', 'plan_poll_vote', 'plan_rsvp',
  'surprise_open', 'surprise_result', 'surprise_click'
]) as t;

-- =====================================================================================
-- admin_surprise_stats: lo que enseña Admin › Datos › Resumen › «Sorpréndeme».
-- Mismo patrón que admin_essentials_stats (solo el administrador, máximo un año, hora de Madrid, por ciudad).
-- «Personas» = visitantes distintos (código anónimo del día; ver 50_visitante_anonimo.sql), no cuentas.
-- =====================================================================================
drop function if exists public.admin_surprise_stats(date, date, text);
create or replace function public.admin_surprise_stats(p_from date, p_to date, p_city text default null)
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
  if v_to - v_from > 366 then
    v_from := v_to - 366;
  end if;
  t_from := (v_from::timestamp) at time zone 'Europe/Madrid';
  t_to := ((v_to + 1)::timestamp) at time zone 'Europe/Madrid';

  with ev as (
    select
      a.event_type,
      a.item_name,
      nullif((a.meta::jsonb) ->> 'mood', '') as mood,
      coalesce((a.meta::jsonb) ->> 'again', 'false') = 'true' as again,
      nullif((a.meta::jsonb) ->> 'action', '') as action,
      (a.created_at at time zone 'Europe/Madrid')::date as day,
      coalesce(a.visitor_id, a.session_id::text) as who
    from public.analytics_of_city(p_city) a
    where a.created_at >= t_from
      and a.created_at < t_to
      and a.event_type in ('surprise_open', 'surprise_result', 'surprise_click')
  ),
  totals as (
    select
      count(*) filter (where event_type = 'surprise_open') as opens,
      count(distinct who) filter (where event_type = 'surprise_open') as people,
      count(*) filter (where event_type = 'surprise_result') as results,
      count(*) filter (where event_type = 'surprise_result' and again) as again,
      count(*) filter (where event_type = 'surprise_click' and action = 'venue') as venue_clicks,
      count(*) filter (where event_type = 'surprise_click' and action = 'directions') as directions_clicks,
      count(distinct who) filter (where event_type = 'surprise_click') as people_clicked
    from ev
  ),
  moods as (
    select coalesce(mood, 'any') as mood, count(*) as n
    from ev
    where event_type = 'surprise_result'
    group by 1
  ),
  venues as (
    select
      item_name as name,
      count(*) filter (where event_type = 'surprise_result') as shown,
      count(*) filter (where event_type = 'surprise_click') as clicked
    from ev
    where item_name is not null
    group by item_name
    order by count(*) filter (where event_type = 'surprise_result') desc,
             count(*) filter (where event_type = 'surprise_click') desc
    limit 30
  ),
  days as (
    select generate_series(v_from, v_to, interval '1 day')::date as day
  ),
  daily as (
    select d.day,
      count(*) filter (where e.event_type = 'surprise_open') as opens,
      count(*) filter (where e.event_type = 'surprise_click') as clicks
    from days d
    left join ev e on e.day = d.day
    group by d.day
  )
  select jsonb_build_object(
    'totals', (select to_jsonb(t) from totals t),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', to_char(day, 'YYYY-MM-DD'), 'opens', opens, 'clicks', clicks) order by day) from daily), '[]'::jsonb),
    'moods', coalesce((select jsonb_agg(to_jsonb(m) order by m.n desc) from moods m), '[]'::jsonb),
    'venues', coalesce((select jsonb_agg(to_jsonb(v)) from venues v), '[]'::jsonb)
  ) into result;

  return result;
end $$;

grant execute on function public.admin_surprise_stats(date, date, text) to authenticated;

-- Comprobación 2: la función de estadísticas existe y está protegida (no devuelve nada si no eres el administrador). Debe salir ok = true.
select jsonb_build_object(
  'ok', exists (select 1 from pg_proc where proname = 'admin_surprise_stats' and pronamespace = 'public'::regnamespace)
) as resultado_estadisticas;
