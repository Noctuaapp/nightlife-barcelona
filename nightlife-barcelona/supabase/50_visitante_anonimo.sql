-- =====================================================================================
-- Noctua · Visitante anónimo del día (la misma persona cuenta una sola vez) · 29/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 49). Se puede repetir sin problema.
--
-- PROBLEMA: cada carga de página era una "visita" distinta (el identificador de visita vive solo en
-- memoria, a propósito: no se guarda nada en el móvil de nadie). Quien llegaba desde Google, miraba
-- un local, volvía atrás y abría otro, salía como DOS personas. Las cifras de visitantes salían
-- infladas y no se veía quién se quedaba mirando varios locales.
--
-- SOLUCIÓN (sin guardar nada en el dispositivo, como Plausible o Fathom): al guardar cada evento,
-- la base de datos calcula un código anónimo = huella(clave secreta del día + IP + navegador).
--   · La IP NO se guarda: solo entra en el cálculo y se descarta (en IPv6 se usa solo el prefijo /64).
--   · La clave secreta cambia cada día y se borra al día siguiente: el código es irreversible y no
--     permite reconocer a nadie de un día para otro (no hay "retención" entre días con esto; para eso
--     están las cuentas, que ya se ven en Admin › Actividad).
--   · El navegador no puede inventarse el código: se calcula siempre en el servidor.
-- Las visitas anteriores a este cambio no tienen código y siguen contando una a una.
--
-- Qué cambia:
--   1. analytics.visitor_id + trigger que lo rellena.
--   2. admin_sessions() devuelve el código de cada visita y el nº de personas distintas.
--   3. owner_item_stats() (estadísticas de dueños) cuenta personas, no cargas de página.
-- =====================================================================================

alter table public.analytics add column if not exists visitor_id text;
create index if not exists analytics_visitor_idx on public.analytics (visitor_id, created_at) where visitor_id is not null;

-- Claves secretas diarias. Sin políticas = nadie desde la web puede leerlas (solo la función de abajo).
create table if not exists public.analytics_salts (
  day date primary key,
  salt text not null default encode(extensions.gen_random_bytes(16), 'hex')
);
alter table public.analytics_salts enable row level security;
revoke all on public.analytics_salts from public, anon, authenticated;

create or replace function public.analytics_set_visitor()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h json;
  raw text;
  ip inet;
  ip_txt text;
  ua text;
  d date := (now() at time zone 'Europe/Madrid')::date;
  s text;
begin
  -- Nunca se fía de lo que mande el navegador.
  new.visitor_id := null;

  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;
  if h is null then
    return new;
  end if;

  raw := coalesce(
    nullif(h->>'cf-connecting-ip', ''),
    nullif(h->>'x-real-ip', ''),
    nullif(trim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1)), '')
  );
  if raw is null then
    return new;
  end if;
  begin
    ip := trim(raw)::inet;
  exception when others then
    return new;
  end;
  -- IPv6: el móvil cambia de dirección por privacidad dentro del mismo /64, se usa solo el prefijo.
  ip_txt := case when family(ip) = 6 then text(network(set_masklen(ip, 64))) else host(ip) end;
  ua := coalesce(h->>'user-agent', '');

  select salt into s from public.analytics_salts where day = d;
  if s is null then
    insert into public.analytics_salts (day) values (d) on conflict (day) do nothing;
    -- Las claves de días anteriores se borran: así los códigos de ayer ya no se pueden reproducir.
    delete from public.analytics_salts where day < d;
    select salt into s from public.analytics_salts where day = d;
  end if;
  if s is null then
    return new;
  end if;

  new.visitor_id := left(encode(sha256(convert_to(s || '|' || ip_txt || '|' || ua, 'utf8')), 'hex'), 20);
  return new;
end $$;

revoke all on function public.analytics_set_visitor() from public, anon, authenticated;

drop trigger if exists analytics_set_visitor_trg on public.analytics;
create trigger analytics_set_visitor_trg
  before insert on public.analytics
  for each row execute function public.analytics_set_visitor();

-- Admin › Visitas: cada visita lleva su código de visitante y se cuentan las personas distintas.
create or replace function public.admin_sessions(p_from date, p_to date, p_limit int default 300)
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
    from public.analytics a
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

revoke all on function public.admin_sessions(date, date, int) from public, anon;
grant execute on function public.admin_sessions(date, date, int) to authenticated;

-- Estadísticas de dueños (37): "personas" = visitantes distintos, no cargas de página.
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
    select event_type, session_id, visitor_id, source, device, created_at
    from public.analytics
    where item_type = p_type and item_id::text = p_id::text and created_at >= t_from and created_at < t_to
  )
  select jsonb_build_object(
    'days', greatest(1, least(coalesce(p_days, 30), 365)),
    'views', (select count(*) from ev where event_type = 'page_view'),
    'visitors', (select count(distinct coalesce(visitor_id, session_id::text)) from ev where event_type = 'page_view'),
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
        select coalesce(source, 'direct') s, count(distinct coalesce(visitor_id, session_id::text)) n from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('label', dv, 'n', n) order by n desc) from (
        select coalesce(device, 'unknown') dv, count(distinct coalesce(visitor_id, session_id::text)) n from ev where event_type = 'page_view' group by 1
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

select 'Visitante anónimo listo: ' || (select count(*) from public.analytics where visitor_id is not null) || ' eventos ya con código' as resultado;
