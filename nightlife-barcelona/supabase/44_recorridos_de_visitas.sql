-- =====================================================================================
-- Noctua · Recorridos de las visitas (Admin › Visitas) · 26/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 43). Se puede repetir sin problema.
--
-- "De las 84 sesiones, ¿dónde han entrado y qué han hecho?" Una función que solo puede usar el
-- admin y que devuelve, para cada visita del periodo: de dónde llega, móvil u ordenador, si tenía
-- cuenta, la página por la que entró y todo lo que hizo después, en orden. También los totales
-- de páginas de entrada y páginas más vistas.
-- (La web registra cada cambio de página desde esta versión; las visitas de antes solo tienen la
-- página de entrada, las fichas vistas y los clics.)
-- =====================================================================================

create index if not exists analytics_created_idx on public.analytics (created_at desc);
create index if not exists analytics_session_idx on public.analytics (session_id, created_at);

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
    select a.session_id, a.event_type, a.item_type, a.item_name, a.path, a.source, a.device, a.user_id,
           a.results_count, a.meta, a.created_at
    from public.analytics a
    where a.created_at >= t_from and a.created_at < t_to and a.session_id is not null
  ),
  sess as (
    select session_id,
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
  recent as (
    select * from sess order by started_at desc limit greatest(1, least(coalesce(p_limit, 300), 1000))
  )
  select jsonb_build_object(
    'total_sessions', (select count(*) from sess),
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

select 'Recorridos de visitas listos' as resultado;
