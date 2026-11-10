-- =====================================================================================
-- Noctua · Medir clics y tiempo en la web (panel de admin) · 10/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace:
--   1) Permite el evento nuevo «page_time» (los segundos que una persona se queda en cada página, con la
--      pestaña a la vista). Es la lista de la 65 + este tipo; si ya ejecutaste la 65, esta la sustituye.
--      Sigue siendo una lista cerrada: un tipo inventado desde fuera se sigue descartando.
--   1b) Las dos funciones de Admin › Actividad (24) vuelven a crearse sin contar page_time como acción.
--   2) admin_interaction_stats(desde, hasta): cuántas veces se pulsa «cómo llegar», la web, Instagram,
--      TikTok, entradas, llamar, compartir, taxi/VTC; cuántos «asistiré» y cuántos guardados en favoritos;
--      por día y los locales/eventos que más reciben cada cosa. Es la pestaña «Clics» de Admin › Datos.
--   3) admin_time_stats(desde, hasta): cuánto tiempo pasa la gente en la web: por visita, por dispositivo,
--      con cuenta o sin ella, por sección y página, y por usuario (Admin › Datos › Clics y Admin ›
--      Actividad). Usa page_time cuando existe y, en las visitas anteriores a este cambio, estima el
--      tiempo con el primer y el último registro de la visita (siempre se queda corto: no se sabe cuánto
--      miró la última página).
--
-- Privacidad: las dos funciones solo las ejecuta el admin (is_noctua_admin()). El tiempo por usuario es
-- de personas concretas: mismo uso que /admin/actividad (soporte, moderación, mejorar el servicio), no para
-- vender ni compartir. Las cifras por sección y página son agregadas.
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
    'page_time'
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

-- -------------------------------------------------------------------------------------
-- 1b) Actividad por usuario (supabase/24): las mismas dos funciones, sin contar page_time como «acción»
--     (si no, el número de acciones y la línea de tiempo de cada usuario se llenarían de avisos de tiempo).
-- -------------------------------------------------------------------------------------
create or replace function public.admin_users_activity(p_from date, p_to date)
returns table (
  user_id uuid,
  events bigint,
  sessions bigint,
  active_days bigint,
  page_views bigint,
  tickets bigint,
  searches bigint,
  first_seen timestamptz,
  last_seen timestamptz,
  top_device text,
  top_source text
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
    a.user_id,
    count(*)::bigint,
    count(distinct a.session_id)::bigint,
    count(distinct (a.created_at at time zone 'Europe/Madrid')::date)::bigint,
    count(*) filter (where a.event_type = 'page_view')::bigint,
    count(*) filter (where a.event_type = 'tickets_click')::bigint,
    count(*) filter (where a.event_type = 'search')::bigint,
    min(a.created_at),
    max(a.created_at),
    mode() within group (order by a.device),
    mode() within group (order by a.source)
  from public.analytics a
  where a.user_id is not null
    and a.event_type <> 'page_time'            -- el tiempo en página no es una acción de la persona
    and a.created_at >= (p_from::timestamp at time zone 'Europe/Madrid')
    and a.created_at <  ((p_to + 1)::timestamp at time zone 'Europe/Madrid')
  group by a.user_id;
end;
$$;

revoke all on function public.admin_users_activity(date, date) from public, anon;
grant execute on function public.admin_users_activity(date, date) to authenticated;

create or replace function public.admin_user_activity(p_user uuid, p_from date, p_to date)
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
    select *
    from public.analytics
    where user_id = p_user and created_at >= t_from and created_at < t_to
      and event_type <> 'page_time'            -- el tiempo en página no es una acción de la persona
  )
  select jsonb_build_object(
    'summary', (
      select jsonb_build_object(
        'events', count(*),
        'sessions', count(distinct session_id),
        'active_days', count(distinct (created_at at time zone 'Europe/Madrid')::date),
        'first_seen', min(created_at),
        'last_seen', max(created_at)
      ) from ev
    ),
    'by_type', coalesce((
      select jsonb_agg(jsonb_build_object('type', event_type, 'n', n) order by n desc)
      from (select event_type, count(*) n from ev group by event_type) t
    ), '[]'::jsonb),
    'top_items', coalesce((
      select jsonb_agg(jsonb_build_object('item_type', item_type, 'name', item_name, 'n', n) order by n desc)
      from (
        select item_type, item_name, count(*) n
        from ev
        where event_type = 'page_view' and item_name is not null
        group by item_type, item_name
        order by count(*) desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('label', device, 'n', n) order by n desc)
      from (select coalesce(device, '—') device, count(distinct session_id) n from ev group by 1) t
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('label', source, 'n', n) order by n desc)
      from (select coalesce(source, '—') source, count(distinct session_id) n from ev group by 1) t
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h)
      from (
        select extract(hour from created_at at time zone 'Europe/Madrid')::int h, count(*) n
        from ev group by 1
      ) t
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
      from (
        select created_at, event_type, item_type, item_name, path, device, source, session_id
        from ev
        order by created_at desc
        limit 300
      ) t
    ), '[]'::jsonb),
    'checkins', coalesce((
      select jsonb_agg(jsonb_build_object('date', c.checkin_date, 'name', cl.name) order by c.checkin_date desc)
      from (
        select checkin_date, club_id from public.club_checkins
        where user_id = p_user order by checkin_date desc limit 60
      ) c
      left join public.clubs cl on cl.id = c.club_id
    ), '[]'::jsonb),
    'attendances', coalesce((
      select jsonb_agg(jsonb_build_object('night', a.night, 'item_type', a.item_type, 'name',
        case a.item_type
          when 'club' then (select name from public.clubs where id = a.item_id)
          when 'event' then (select title from public.events where id = a.item_id)
          when 'club_event' then (select title from public.club_events where id = a.item_id)
        end) order by a.night desc)
      from (
        select night, item_type, item_id from public.attendances
        where user_id = p_user order by night desc limit 60
      ) a
    ), '[]'::jsonb),
    'favorites', coalesce((
      select jsonb_agg(jsonb_build_object('item_type', f.item_type, 'name',
        case f.item_type
          when 'club' then (select name from public.clubs where id = f.item_id)
          when 'event' then (select title from public.events where id = f.item_id)
          when 'club_event' then (select title from public.club_events where id = f.item_id)
        end))
      from (
        select item_type, item_id from public.favorites
        where user_id = p_user order by id desc limit 100
      ) f
    ), '[]'::jsonb),
    'polls', coalesce((
      select jsonb_agg(jsonb_build_object('poll_id', poll_id, 'choice', choice, 'created_at', created_at) order by created_at desc)
      from (
        select poll_id, choice, created_at from public.party_poll_votes
        where user_id = p_user order by created_at desc limit 60
      ) v
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_user_activity(uuid, date, date) from public, anon;
grant execute on function public.admin_user_activity(uuid, date, date) to authenticated;

-- -------------------------------------------------------------------------------------
-- 2) Clics y acciones
-- -------------------------------------------------------------------------------------
create or replace function public.admin_interaction_stats(p_from date, p_to date)
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
           (a.created_at at time zone 'Europe/Madrid')::date as day
    from public.analytics a
    where a.created_at >= t_from and a.created_at < t_to
      and a.event_type in ('directions_click', 'website_click', 'instagram_click', 'tiktok_click', 'tickets_click',
                           'phone_click', 'share_click', 'favorite_click', 'ride_click')
    union all
    -- «asistiré» (tabla attendances; cada marca lleva la noche a la que se refiere)
    select 'attendance', t.item_type::text, t.item_id::text, null, t.user_id::text, null, t.night::date
    from public.attendances t
    where t.night::date >= p_from and t.night::date <= p_to
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
    group by f.item_type, f.item_id
  )
  select jsonb_build_object(
    'totals', coalesce((select jsonb_object_agg(kind, jsonb_build_object('n', n, 'people', people)) from totals), '{}'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'n', n) order by day) from daily), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'item_type', item_type, 'item_id', item_id, 'name', name, 'n', n) order by kind, n desc)
                     from ranked where rn <= 10), '[]'::jsonb),
    'favorites_total', (select count(*) from public.favorites),
    'favorites_people', (select count(distinct user_id) from public.favorites),
    'favorites_top', coalesce((select jsonb_agg(jsonb_build_object('item_type', item_type, 'item_id', item_id, 'name', name, 'n', n) order by n desc)
                               from fav_ranked where rn <= 15), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_interaction_stats(date, date) from public, anon;
grant execute on function public.admin_interaction_stats(date, date) to authenticated;

-- -------------------------------------------------------------------------------------
-- 3) Tiempo en la web
-- -------------------------------------------------------------------------------------
create or replace function public.admin_time_stats(p_from date, p_to date)
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
    from public.analytics a
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

revoke all on function public.admin_time_stats(date, date) from public, anon;
grant execute on function public.admin_time_stats(date, date) to authenticated;

-- Comprobación rápida (en el SQL Editor las dos funciones pueden dar «No autorizado»: es normal, el editor
-- no va con tu sesión de la web; funcionan desde Admin › Datos).
select 'ok' as instalado, count(*) as tipos_de_evento_permitidos
from unnest(array[
  'session_start',
  'page_nav',
  'page_view',
  'search',
  'filter_used',
  'tickets_click',
  'website_click',
  'directions_click',
  'instagram_click',
  'tiktok_click',
  'share_click',
  'favorite_click',
  'phone_click',
  'ride_click',
  'tab_open',
  'nearby_click',
  'related_click',
  'next_click',
  'top_pick_click',
  'welcome_click',
  'join_view',
  'join_click',
  'join_dismiss',
  'signup_view',
  'signup_email_open',
  'signup_submit',
  'signup_ok',
  'signup_error',
  'google_click',
  'confirm_age_view',
  'confirm_age_done',
  'install_click',
  'install_choice',
  'app_installed',
  'party_poll_vote',
  'zone_pick',
  'home_tile_click',
  'auth_gate_view',
  'banner_click',
  'banner_dismiss',
  'essential_category',
  'essential_open',
  'essential_directions',
  'essential_maps',
  'essential_nearby',
  'page_time'
]) as t;
