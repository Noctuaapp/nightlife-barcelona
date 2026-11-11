-- =====================================================================================
-- Noctua · Más detalle en Admin › Datos › Clics y tiempo · 11/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace: vuelve a crear admin_interaction_stats (la de la 84) con cuatro apartados más, para saber:
--   · rides:          qué taxi o VTC eligen (Uber, Cabify, FREE NOW) y cuántas llamadas al taxi (Radio Taxi...).
--   · ride_origins:   desde dónde lo piden (ficha de club, ficha de evento, página de taxi).
--   · destinations:   a qué webs van al pulsar «entradas» o la web del local (solo el dominio).
--   · share_channels: cómo comparten (menú de compartir del móvil o enlace copiado).
-- Lo que ya devolvía (totals, daily, top, favoritos) sale igual que antes. Los clics anteriores a este cambio
-- no llevan dominio ni canal: salen como «sin registrar». Solo la ejecuta el admin (is_noctua_admin()).
-- =====================================================================================

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
           (a.created_at at time zone 'Europe/Madrid')::date as day, a.meta as meta
    from public.analytics a
    where a.created_at >= t_from and a.created_at < t_to
      and a.event_type in ('directions_click', 'website_click', 'instagram_click', 'tiktok_click', 'tickets_click',
                           'phone_click', 'share_click', 'favorite_click', 'ride_click')
    union all
    -- «asistiré» (tabla attendances; cada marca lleva la noche a la que se refiere)
    select 'attendance', t.item_type::text, t.item_id::text, null, t.user_id::text, null, t.night::date, null::jsonb
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
    'favorites_total', (select count(*) from public.favorites),
    'favorites_people', (select count(distinct user_id) from public.favorites),
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

revoke all on function public.admin_interaction_stats(date, date) from public, anon;
grant execute on function public.admin_interaction_stats(date, date) to authenticated;
