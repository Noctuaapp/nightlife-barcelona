-- =====================================================================================
-- Noctua · Tope de eventos por visitante y limpieza de lo desviado · 14/11/2026
-- Ejecutar entero en Supabase › SQL Editor DESPUÉS del 100. Se puede repetir sin problema.
--
-- POR QUÉ: la base ya descartaba a quien manda más de 120 eventos en 10 minutos desde la MISMA sesión.
-- Pero una sesión la inventa el propio navegador: un script que estrene una sesión nueva cada 100
-- eventos se salta ese tope y puede llenar la tabla desde una sola conexión. Esto lo cierra.
--
-- QUÉ HACE:
--   1) Tope por VISITANTE (el código que la base calcula con la IP y el navegador, no el que manda el
--      navegador): más de 600 eventos en 10 minutos desde el mismo visitante se descartan. Una persona
--      real no pasa de unas decenas (aunque abra varias pestañas); 600 deja margen de sobra para varias
--      personas con el mismo móvil tras la misma wifi (un local, un grupo) sin perder ninguna visita real.
--      Se descarta sin dar error, igual que el tope de sesión, y solo para lo que llega del navegador
--      (anon / authenticated): el servidor y el editor SQL no se tocan.
--   2) Limpieza: lo desviado a `analytics_bots` (países bloqueados, barridos) se conserva 90 días, por si hay
--      que devolver algo, y después se borra solo cada domingo a las 04:20. Antes crecía sin límite.
--
-- QUÉ NO CAMBIA: los datos de personas reales, el barrido de bots (97–99) ni el tope por sesión.
--
-- Para quitarlo: drop trigger zy_analytics_visitor_cap_trg on public.analytics;
-- =====================================================================================

-- 1) Tope por visitante ----------------------------------------------------------------------------------
create or replace function public.analytics_visitor_cap()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  recientes int;
begin
  -- Solo lo que llega del navegador. El servidor y el editor SQL pasan siempre.
  if caller_role is null or caller_role not in ('anon', 'authenticated') then
    return new;
  end if;
  -- Sin código de visitante (no se pudo calcular) no hay a quién aplicar el tope.
  if new.visitor_id is null then
    return new;
  end if;

  -- Se cuenta con LIMIT para que, aunque lleguen miles, cada comprobación mire como mucho 600 filas
  -- (usa el índice analytics_visitor_idx: visitor_id + fecha).
  select count(*) into recientes
  from (
    select 1
    from public.analytics a
    where a.visitor_id = new.visitor_id
      and a.created_at > now() - interval '10 minutes'
    limit 600
  ) s;

  if recientes >= 600 then
    return null; -- se descarta sin dar error
  end if;
  return new;
end $function$;

revoke all on function public.analytics_visitor_cap() from public, anon, authenticated;

-- El nombre empieza por zy_ a propósito: los triggers de una tabla se ejecutan por orden alfabético y este debe
-- ir DESPUÉS del que calcula el código de visitante (analytics_set_visitor_trg) y ANTES del que desvía países
-- bloqueados (zz_analytics_divert_bots_trg).
drop trigger if exists zy_analytics_visitor_cap_trg on public.analytics;
create trigger zy_analytics_visitor_cap_trg
  before insert on public.analytics
  for each row execute function public.analytics_visitor_cap();

-- 2) Limpieza de lo desviado -----------------------------------------------------------------------------
create table if not exists public.analytics_bots (
  id bigserial primary key,
  diverted_at timestamptz not null default now(),
  country text,
  reason text,
  row jsonb not null
);
create index if not exists analytics_bots_country_idx on public.analytics_bots (country, diverted_at desc);
alter table public.analytics_bots enable row level security;
revoke all on public.analytics_bots from public, anon, authenticated;

create or replace function public.analytics_purge_bots(p_days int default 90)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  n int;
begin
  -- Nunca menos de 7 días: un error al escribir el número no puede vaciar la tabla.
  delete from public.analytics_bots
  where diverted_at < now() - make_interval(days => greatest(coalesce(p_days, 90), 7));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.analytics_purge_bots(int) from public, anon, authenticated;

-- Cada domingo a las 04:20 (hora del servidor, UTC) con pg_cron. Si tu proyecto no lo tiene activado, sale un
-- aviso y el resto sigue.
do $$
begin
  create extension if not exists pg_cron;
  begin
    perform cron.unschedule('noctua-limpieza-bots');
  exception when others then
    null; -- aún no estaba programado
  end;
  perform cron.schedule('noctua-limpieza-bots', '20 4 * * 0', 'select public.analytics_purge_bots(90)');
  raise notice 'Limpieza programada: domingos 04:20.';
exception when others then
  raise notice 'No se pudo programar con pg_cron (%). Actívalo en Integrations › Cron y repite este SQL.', sqlerrm;
end $$;

-- Resultado: qué hay ahora mismo.
select
  (select count(*) from public.analytics_bots) as filas_en_analytics_bots,
  (select min(diverted_at) from public.analytics_bots) as la_mas_antigua,
  exists (select 1 from pg_trigger where tgname = 'zy_analytics_visitor_cap_trg' and not tgisinternal) as tope_por_visitante_activo,
  public.analytics_purge_bots(90) as filas_borradas_ahora;
