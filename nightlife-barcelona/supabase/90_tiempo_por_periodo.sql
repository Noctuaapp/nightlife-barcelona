-- =====================================================================================
-- Noctua · Tiempo en la web por día, semana, mes y año · 11/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué añade: UNA función nueva que SOLO LEE (no cambia ninguna tabla ni ninguna función anterior):
--   · admin_time_series(p_grain): el tiempo que pasa la gente en la web, agrupado por
--       'day' (últimos 30 días), 'week' (últimas 12 semanas), 'month' (últimos 12 meses) o 'year' (este año y el anterior).
--     Por cada periodo: visitas con tiempo, tiempo medio por visita y tiempo total.
--
-- Cómo se cuenta (igual que «Tiempo en la web» de Admin › Clics y tiempo, supabase/84):
--   · Tiempo de una visita = el medido página a página (page_time, solo con la pestaña a la vista) o, si no lo hay,
--     el que pasa entre su primer y su último registro. Las visitas sin tiempo no cuentan.
--   · Una visita cuenta en el periodo en que EMPEZÓ. Fechas de calendario en hora de Madrid; la semana empieza en lunes.
--   · Solo la ejecuta el admin (is_noctua_admin()).
-- =====================================================================================

create or replace function public.admin_time_series(p_grain text)
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
    from public.analytics a
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

revoke all on function public.admin_time_series(text) from public, anon;
grant execute on function public.admin_time_series(text) to authenticated;
