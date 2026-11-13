-- =====================================================================================
-- Noctua · Barrido automático de bots: un país nuevo con la misma pauta se bloquea solo · 13/11/2026
-- Ejecutar entero en Supabase › SQL Editor DESPUÉS del 97. Se puede repetir sin problema.
--
-- POR QUÉ: el 97 bloquea los 8 países de la oleada de hoy, pero si mañana los bots salen desde otro país
-- habría que verlo y añadirlo a mano. Esto lo hace solo.
--
-- QUÉ HACE: cada 15 minutos mira las últimas 6 horas y, para cada país que NO sea España y no esté ya
-- bloqueado, comprueba si se da TODO esto a la vez:
--     · 25 personas o más,
--     · al menos el 97 % entra, mira una sola página y se va sin hacer nada,
--     · ninguna ha hecho un clic (entradas, web, cómo llegar…) ni tiene cuenta.
-- Si se da, el país entra en analytics_blocked_countries (con una nota «auto» que dice por qué) y lo de
-- las últimas 12 horas de ese país pasa a analytics_bots. Nada se borra: se puede devolver (consulta en la
-- cabecera del 97). España nunca se bloquea sola.
--
-- QUÉ NO CUBRE: bots que salgan desde España, o con muy pocas visitas por país. Para eso está, en la web, la
-- «puerta de persona real» (una visita solo cuenta si hay un toque, tecla o movimiento de ratón) y, antes de
-- todo, la regla de Vercel › Firewall que se explica en el chat.
--
-- Para ver qué ha bloqueado el barrido solo:
--   select code, note, added_at from public.analytics_blocked_countries where note like 'auto %' order by added_at desc;
-- Para quitar uno que sea un error: delete from public.analytics_blocked_countries where code = 'XX';
--   y devolver sus filas con la consulta de la cabecera del 97.
-- =====================================================================================

-- Si ejecutas este archivo sin haber ejecutado el 97, estas tablas no existen: se crean aquí igual.
create table if not exists public.analytics_blocked_countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  note text,
  added_at timestamptz not null default now()
);
alter table public.analytics_blocked_countries enable row level security;
revoke all on public.analytics_blocked_countries from public, anon, authenticated;

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

-- Devuelve cuántas filas ha movido. Se puede llamar a mano: select public.analytics_sweep_bots();
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
begin
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
  return n_moved;
end $$;

revoke all on function public.analytics_sweep_bots(int, int) from public, anon, authenticated;

-- Programarlo cada 15 minutos con pg_cron (viene con Supabase). Si tu proyecto no lo tiene activado,
-- sale un aviso y el resto sigue: en ese caso actívalo en Supabase › Integrations › Cron y repite este SQL.
do $$
begin
  create extension if not exists pg_cron;
  begin
    perform cron.unschedule('noctua-barrido-bots');
  exception when others then
    null; -- aún no estaba programado
  end;
  perform cron.schedule('noctua-barrido-bots', '*/15 * * * *', 'select public.analytics_sweep_bots()');
  raise notice 'Barrido programado cada 15 minutos.';
exception when others then
  raise notice 'No se pudo programar con pg_cron (%). Actívalo en Integrations › Cron y repite este SQL.', sqlerrm;
end $$;

-- Primera pasada ahora mismo, y resultado: qué países están bloqueados y desde cuándo.
select public.analytics_sweep_bots() as filas_movidas_ahora;

select b.code as pais, b.added_at at time zone 'Europe/Madrid' as desde, b.note
from public.analytics_blocked_countries b
order by b.added_at desc;
