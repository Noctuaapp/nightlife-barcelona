-- =====================================================================================
-- Noctua · Estadísticas de dueños: solo cuando Noctua las active · 25/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 35). Se puede repetir sin problema.
--
-- Estrategia acordada: las estadísticas son algo que Noctua da cuando le conviene (buenos números,
-- plan de pago), no algo automático que el local pueda usar para regatear.
--   - Apagadas por defecto en cada club y festival (owner_stats_enabled = false).
--   - Las activas tú, una a una, en Admin › Usuarios › "Estadísticas para dueños".
--   - El dueño NO puede activárselas él mismo (columna protegida).
--   - Aunque estén activas, el dueño solo ve lo que vende: visitas, personas, clics, guardados,
--     de dónde llegan... La comparación con el periodo anterior y los avisos de "no me dejan
--     entrar" son solo para ti.
-- =====================================================================================

alter table public.clubs add column if not exists owner_stats_enabled boolean not null default false;
alter table public.events add column if not exists owner_stats_enabled boolean not null default false;

-- Columnas que solo decide Noctua (clubs): se añade owner_stats_enabled.
create or replace function public.protect_club_columns()
returns trigger
language plpgsql
as $$
declare
  safe jsonb;
begin
  if current_user in ('anon', 'authenticated') and not public.is_noctua_admin() then
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into safe
    from jsonb_each(to_jsonb(old))
    where key in ('verified', 'trending', 'rating', 'owner_user_id', 'featured', 'place_id', 'hidden', 'duplicate_of', 'slug', 'owner_stats_enabled')
       or key like 'google\_%';
    new := jsonb_populate_record(new, safe);
  end if;
  return new;
end $$;

-- Lo mismo para eventos / festivales.
create or replace function public.protect_event_columns()
returns trigger
language plpgsql
as $$
declare
  safe jsonb;
begin
  if current_user in ('anon', 'authenticated') and not public.is_noctua_admin() then
    if tg_op = 'INSERT' then
      safe := jsonb_build_object('featured', false, 'hidden', false, 'owner_stats_enabled', false);
    else
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into safe
      from jsonb_each(to_jsonb(old))
      where key in ('featured', 'hidden', 'owner_user_id', 'place_id', 'owner_stats_enabled')
         or key like 'google\_%';
    end if;
    new := jsonb_populate_record(new, safe);
  end if;
  return new;
end $$;

create or replace function public.owner_item_stats(p_type text, p_id bigint, p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  allowed boolean;
  t_to timestamptz := now();
  t_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  t_prev timestamptz := now() - make_interval(days => 2 * greatest(1, least(coalesce(p_days, 30), 365)));
  nights bigint[];
  result jsonb;
begin
  if p_type not in ('club', 'event') then
    raise exception 'tipo no válido';
  end if;
  allowed := public.is_noctua_admin()
    or (p_type = 'club' and exists (select 1 from public.clubs where id = p_id and owner_user_id = uid))
    or (p_type = 'event' and exists (select 1 from public.events where id = p_id and owner_user_id = uid));
  if not coalesce(allowed, false) then
    raise exception 'sin permiso';
  end if;
  -- Para el dueño, solo si Noctua le ha activado las estadísticas (Admin › Usuarios). Si no,
  -- null: la web no le enseña nada.
  if not public.is_noctua_admin() then
    if p_type = 'club' and not exists (select 1 from public.clubs where id = p_id and coalesce(owner_stats_enabled, false)) then
      return null;
    end if;
    if p_type = 'event' and not exists (select 1 from public.events where id = p_id and coalesce(owner_stats_enabled, false)) then
      return null;
    end if;
  end if;

  if p_type = 'club' then
    select coalesce(array_agg(id), '{}') into nights from public.club_events where club_id = p_id;
  else
    nights := '{}';
  end if;

  with ev as (
    select event_type, session_id, source, device, created_at
    from public.analytics
    where item_type = p_type and item_id::text = p_id::text and created_at >= t_from and created_at < t_to
  )
  select jsonb_build_object(
    'days', greatest(1, least(coalesce(p_days, 30), 365)),
    'views', (select count(*) from ev where event_type = 'page_view'),
    'visitors', (select count(distinct session_id) from ev where event_type = 'page_view'),
    'views_prev', (
      select count(*) from public.analytics
      where item_type = p_type and item_id::text = p_id::text and event_type = 'page_view'
        and created_at >= t_prev and created_at < t_from
    ),
    'clicks', coalesce((
      select jsonb_object_agg(event_type, n) from (
        select event_type, count(*) n from ev where event_type <> 'page_view' group by event_type
      ) c
    ), '{}'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'views', n) order by d) from (
        select (created_at at time zone 'Europe/Madrid')::date d, count(*) n
        from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('label', s, 'n', n) order by n desc) from (
        select coalesce(source, 'direct') s, count(distinct session_id) n from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('label', dv, 'n', n) order by n desc) from (
        select coalesce(device, 'unknown') dv, count(distinct session_id) n from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h) from (
        select extract(hour from created_at at time zone 'Europe/Madrid')::int h, count(*) n
        from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'night_views', (
      select count(*) from public.analytics
      where item_type = 'club_event' and item_id::text = any (select unnest(nights)::text)
        and event_type = 'page_view' and created_at >= t_from and created_at < t_to
    ),
    'favorites', (select count(*) from public.favorites where item_type = p_type and item_id = p_id),
    'attendances', (
      select count(*) from public.attendances
      where item_type = p_type and item_id = p_id and night >= (t_from at time zone 'Europe/Madrid')::date
    ),
    'checkins', case when p_type = 'club' then (
      select count(*) from public.club_checkins
      where club_id = p_id and checkin_date >= (t_from at time zone 'Europe/Madrid')::date
    ) else 0 end,
    'entry_denials', (
      select count(*) from public.entry_denials
      where venue_type = p_type and venue_id = p_id and created_at >= t_from
    )
  ) into result;

  -- Lo que solo ve Noctua: comparación con el periodo anterior y avisos de "no me dejan entrar".
  if not public.is_noctua_admin() then
    result := result - 'views_prev' - 'entry_denials';
  end if;
  return result;
end $$;

revoke all on function public.owner_item_stats(text, bigint, int) from public;
grant execute on function public.owner_item_stats(text, bigint, int) to authenticated;

select 'Estadísticas de dueños: apagadas por defecto' as resultado;
