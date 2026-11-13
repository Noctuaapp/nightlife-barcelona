-- =====================================================================================
-- Noctua · Barrido de oleadas repartidas por muchos países · 13/11/2026
-- Ejecutar entero en Supabase › SQL Editor DESPUÉS del 98. Se puede repetir sin problema.
--
-- PROBLEMA: tras bloquear los 8 países grandes (97), el bot siguió entrando repartido en muchos países con
-- pocas visitas cada uno (México 15, Emiratos 12, Sudáfrica 12, Marruecos 11, Turquía 10, Brasil 9…), todos
-- con 0 clics. Ninguno llega a las 25 personas que pide el barrido por país (98), y bloquear países enteros
-- como México o Brasil dejaría fuera de las cifras a turistas reales.
--
-- SOLUCIÓN: la misma función del 98 (la programación cada 15 minutos sigue siendo la misma) con una segunda
-- fase que no mira países. Mira a TODA la gente de fuera de España de las últimas 6 horas, cuya visita ya
-- tiene más de 10 minutos. Si 12 personas o más se han ido sin hacer nada (una sola página, ningún clic,
-- sin cuenta) y son el 90 % o más de esa gente, hay una oleada: las filas de esas personas pasan a
-- analytics_bots. No bloquea ningún país, y cuando la oleada acaba, la regla deja de actuar. Quien navega,
-- hace clic o tiene cuenta nunca se toca. Nada se borra: se puede devolver (consulta en la cabecera del 97).
-- (Umbral bajado de 40 a 12 a las 19:50: el bot pasó a un goteo de ~11 personas por hora, todas de
-- escritorio, idioma «es», origen «directo» y solo una página de NitBus, que con 40 tardaba horas en saltar.)
-- =====================================================================================

create or replace function public.analytics_sweep_bots(p_horas int default 6, p_min_personas int default 25)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n_moved int := 0;
  n int;
  total_fuera int;
  rebotes_fuera int;
begin
  -- Fase 1 (98): un país entero con la pauta de bot.
  for r in
    with p as (
      select upper(a.country::text) as country,
             coalesce(a.visitor_id::text, a.session_id::text) as pid,
             count(*) filter (where a.event_type::text = 'page_nav') as navs,
             count(*) filter (where a.event_type::text like '%\_click'
                                 or a.event_type::text in ('search', 'filter_used', 'party_poll_vote', 'tab_open')) as acts,
             bool_or(a.user_id is not null) as cuenta
      from public.analytics a
      where a.created_at >= now() - make_interval(hours => p_horas)
        and a.country is not null
        and upper(a.country::text) <> 'ES'
        and coalesce(a.visitor_id::text, a.session_id::text) is not null
        and not exists (select 1 from public.analytics_blocked_countries b where b.code = upper(a.country::text))
      group by 1, 2
    ),
    c as (
      select country,
             count(*) as personas,
             count(*) filter (where navs = 0 and acts = 0 and not cuenta) as rebotes,
             count(*) filter (where acts > 0) as con_clic,
             count(*) filter (where cuenta) as con_cuenta
      from p
      group by country
    )
    select * from c
    where personas >= p_min_personas
      and rebotes >= personas * 0.97
      and con_clic = 0
      and con_cuenta = 0
  loop
    insert into public.analytics_blocked_countries (code, note)
    values (r.country,
            'auto ' || to_char(now() at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ': ' || r.personas
            || ' personas en ' || p_horas || ' h, ' || r.rebotes || ' de una sola página, 0 clics, 0 cuentas')
    on conflict (code) do nothing;

    with moved as (
      delete from public.analytics a
      where upper(a.country::text) = r.country
        and a.created_at >= now() - interval '12 hours'
      returning a.*
    )
    insert into public.analytics_bots (country, reason, row)
    select r.country, 'país bloqueado (barrido automático)', to_jsonb(m) from moved m;
    get diagnostics n = row_count;
    n_moved := n_moved + n;
  end loop;

  -- Fase 2: una oleada repartida por muchos países (sin bloquear ninguno).
  select count(*), count(*) filter (where navs = 0 and acts = 0 and not cuenta)
    into total_fuera, rebotes_fuera
  from (
    select coalesce(a.visitor_id::text, a.session_id::text) as pid,
           count(*) filter (where a.event_type::text = 'page_nav') as navs,
           count(*) filter (where a.event_type::text like '%\_click'
                               or a.event_type::text in ('search', 'filter_used', 'party_poll_vote', 'tab_open')) as acts,
           bool_or(a.user_id is not null) as cuenta
    from public.analytics a
    where a.created_at >= now() - make_interval(hours => p_horas)
      and a.country is not null
      and upper(a.country::text) <> 'ES'
      and coalesce(a.visitor_id::text, a.session_id::text) is not null
    group by 1
    having max(a.created_at) < now() - interval '10 minutes'
  ) q;

  if rebotes_fuera >= 12 and rebotes_fuera >= total_fuera * 0.9 then
    with p as (
      select coalesce(a.visitor_id::text, a.session_id::text) as pid,
             count(*) filter (where a.event_type::text = 'page_nav') as navs,
             count(*) filter (where a.event_type::text like '%\_click'
                                 or a.event_type::text in ('search', 'filter_used', 'party_poll_vote', 'tab_open')) as acts,
             bool_or(a.user_id is not null) as cuenta
      from public.analytics a
      where a.created_at >= now() - make_interval(hours => p_horas)
        and a.country is not null
        and upper(a.country::text) <> 'ES'
        and coalesce(a.visitor_id::text, a.session_id::text) is not null
      group by 1
      having max(a.created_at) < now() - interval '10 minutes'
    ),
    b as (select pid from p where navs = 0 and acts = 0 and not cuenta),
    moved as (
      delete from public.analytics a
      using b
      where coalesce(a.visitor_id::text, a.session_id::text) = b.pid
        and a.created_at >= now() - make_interval(hours => p_horas)
        and a.country is not null
        and upper(a.country::text) <> 'ES'
      returning a.*
    )
    insert into public.analytics_bots (country, reason, row)
    select upper(m.country::text), 'oleada sin actividad repartida por países (barrido automático)', to_jsonb(m) from moved m;
    get diagnostics n = row_count;
    n_moved := n_moved + n;
  end if;

  return n_moved;
end $$;

revoke all on function public.analytics_sweep_bots(int, int) from public, anon, authenticated;

-- Primera pasada ahora mismo.
select public.analytics_sweep_bots() as filas_movidas_ahora;

-- Resultado: quién queda hoy por país (personas y cuántas han hecho algún clic).
select coalesce(country, '??') as pais,
       count(distinct coalesce(visitor_id, session_id::text)) as personas,
       count(distinct coalesce(visitor_id, session_id::text)) filter (where event_type::text like '%\_click') as con_clic
from public.analytics
where created_at >= (date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid')
group by 1
order by 2 desc
limit 15;
