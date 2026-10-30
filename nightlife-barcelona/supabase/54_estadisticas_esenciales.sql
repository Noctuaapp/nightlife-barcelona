-- =====================================================================================
-- Noctua · Estadísticas de esenciales (Admin › Datos › Esenciales) · 30/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Hasta ahora de los esenciales solo quedaba «alguien entró a /essentials». Desde esta versión la web
-- anota en la tabla `analytics` (la de siempre, no hace falta crear nada):
--   essential_category   → abre una categoría (farmacias, súper...). item_name = categoría
--   essential_open       → abre un local (tarjeta o chincheta del mapa). item_id/item_name = el local
--   essential_directions → pulsa «Cómo llegar»
--   essential_maps       → pulsa «Google Maps»
--   essential_nearby     → pulsa uno de los esenciales cercanos dentro de la ficha de un club
-- (la categoría de cada local va en meta.category). Igual que el resto de la analítica: no cuenta
-- tu actividad de admin, ni bots, ni pruebas, y no guarda nada personal.
--
-- Esta función solo la puede ejecutar el admin y devuelve números agregados (nunca personas):
--   admin_essentials_stats(desde, hasta) → totales, por día, por categoría y los locales más vistos.
-- Las cifras empiezan a contar desde que se publica la web con este cambio.
-- =====================================================================================

create or replace function public.admin_essentials_stats(p_from date, p_to date)
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
    from public.analytics a
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

revoke all on function public.admin_essentials_stats(date, date) from public, anon;
grant execute on function public.admin_essentials_stats(date, date) to authenticated;

-- Comprobación: la función debe existir y (hasta que alguien use los esenciales con la web nueva)
-- no habrá eventos guardados. Desde aquí no se puede llamar a la función: comprueba que eres el admin
-- y el editor de SQL no tiene sesión. Se prueba desde Admin › Datos › Esenciales.
select count(*) as eventos_de_esenciales_guardados from public.analytics where event_type like 'essential\_%';
select proname as funcion_creada from pg_proc where proname = 'admin_essentials_stats';
