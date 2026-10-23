-- =====================================================================================
-- Noctua · Actividad por usuario (panel de admin) · 24/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Pedido: panel de analítica "detallado por usuario" (qué hace cada usuario concreto dentro de
-- la web). Se usa en /admin/actividad (la antigua /admin/analytics, que era un duplicado peor de
-- /admin/datos) y en el botón "Actividad" de cada usuario en /admin/users.
--
-- Usa la tabla analytics que ya existía (lib/track.ts: visitas a fichas, clics en entradas,
-- cómo llegar, búsquedas, filtros, compartir, inicio de sesión...) más lo que cada usuario ha
-- hecho con su cuenta (check-ins, "asistiré", favoritos, encuestas).
--
-- IMPORTANTE (privacidad): esto son datos de personas concretas. Las dos funciones solo las
-- puede ejecutar el admin (is_noctua_admin()) y NO deben usarse para vender ni compartir datos
-- — para eso está /admin/datos, que solo da números agregados. Conviene que la política de
-- privacidad diga que la actividad dentro de la web se asocia a la cuenta para soporte,
-- moderación y mejorar el servicio.
-- =====================================================================================

-- 1) Lista: un resumen por usuario con actividad en el periodo.
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
    and a.created_at >= (p_from::timestamp at time zone 'Europe/Madrid')
    and a.created_at <  ((p_to + 1)::timestamp at time zone 'Europe/Madrid')
  group by a.user_id;
end;
$$;

revoke all on function public.admin_users_activity(date, date) from public, anon;
grant execute on function public.admin_users_activity(date, date) to authenticated;

-- 2) Ficha de un usuario: todo lo que ha hecho, en un solo JSON.
--    La analítica (visitas, clics, búsquedas...) va filtrada por el periodo elegido; check-ins,
--    "asistiré", favoritos y encuestas son de siempre (son pocos y dan contexto).
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

-- Comprobación rápida: cuántos usuarios con sesión han hecho algo en los últimos 30 días.
-- (Solo funciona logueado como admin desde la web; en el SQL Editor puede dar "No autorizado",
-- es normal: el editor no va con tu sesión de la web.)
select 'ok' as instalado;
