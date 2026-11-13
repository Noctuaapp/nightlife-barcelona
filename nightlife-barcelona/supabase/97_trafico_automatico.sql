-- =====================================================================================
-- Noctua · Tráfico automático: las visitas de países sin público real dejan de contar · 13/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- QUÉ PASÓ: el 13/11/2026 entraron ~450 «personas» de golpe (Bangladés 109, Pakistán 41, India 35,
-- Vietnam 30, Filipinas 20, Indonesia 19, Kenia 12, Jordania 12…), casi todas con UNA sola página
-- (sobre todo NitBus y Contacto), sin cuenta y con 0 % de clics. Cada una era una IP distinta: es una red
-- de bots, no un script suelto. Un navegador automático que se disfraza bien no se distingue en el
-- navegador de una persona, así que el filtro se pone en la base de datos, que sí ve el país de la
-- petición (cabecera cf-ipcountry, la misma que ya usa Admin › Audiencia).
--
-- QUÉ HACE:
--   1. analytics_blocked_countries: lista de países cuyas visitas NO se cuentan. Empieza con los 8 de
--      arriba. Se puede ampliar o quitar cuando quieras (ejemplos al final de este comentario).
--   2. Un trigger en analytics: si una visita nueva llega desde un país de esa lista, NO entra en
--      `analytics` (así no infla Visitas, Audiencia, Datos…) y se guarda entera en `analytics_bots`.
--   3. Las filas que ya había de esos países (desde que existe la columna país, 11/11) se MUEVEN a
--      `analytics_bots`. No se borra nada: la tabla guarda cada fila completa en formato JSON y hay una
--      consulta para devolverlas, por si algún país se bloqueara por error.
--   4. Lo que sale al final: las personas desviadas por país y las que se quedan hoy por país, para ver si
--      queda algún país más que añadir.
--
-- LÍMITES (honestos):
--   · No bloquea a los bots de la web, solo evita que cuenten. Para que ni siquiera la carguen, en Vercel
--     › Firewall se puede crear una regla «País es uno de… → Challenge» (2 minutos, opcional).
--   · Las visitas de antes del 11/11 no tienen país, así que de esas no se puede saber si eran bots.
--   · Si el bot aparece desde otro país, hay que añadirlo a la lista.
--
-- Para añadir o quitar un país:
--   insert into public.analytics_blocked_countries (code, note) values ('NG', 'tráfico de bots') on conflict do nothing;
--   delete from public.analytics_blocked_countries where code = 'ID';
-- Para devolver a analytics las filas de un país (después de quitarlo de la lista):
--   with back as (delete from public.analytics_bots where country = 'ID' returning row)
--   insert into public.analytics select (jsonb_populate_record(null::public.analytics, row)).* from back;
-- =====================================================================================

create table if not exists public.analytics_blocked_countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  note text,
  added_at timestamptz not null default now()
);
alter table public.analytics_blocked_countries enable row level security;
revoke all on public.analytics_blocked_countries from public, anon, authenticated;

insert into public.analytics_blocked_countries (code, note) values
  ('BD', 'Bangladés · 13/11/2026: 109 visitas de 1 página, 0 clics'),
  ('PK', 'Pakistán · 13/11/2026: 41 visitas de 1 página, 0 clics'),
  ('IN', 'India · 13/11/2026: 35 visitas de 1 página, 0 clics'),
  ('VN', 'Vietnam · 13/11/2026: 30 visitas de 1 página, 0 clics'),
  ('PH', 'Filipinas · 13/11/2026: 20 visitas de 1 página, 0 clics'),
  ('ID', 'Indonesia · 13/11/2026: 19 visitas de 1 página, 0 clics'),
  ('KE', 'Kenia · 13/11/2026: 12 visitas de 1 página, 0 clics'),
  ('JO', 'Jordania · 13/11/2026: 12 visitas de 1 página, 0 clics')
on conflict (code) do nothing;

-- Aquí van las filas desviadas. Cada una entera en JSON (row), para poder devolverla aunque `analytics`
-- cambie de columnas. Solo se lee desde el editor SQL.
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

create or replace function public.analytics_divert_bots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h json;
  c text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;
  -- Sin cabeceras (editor SQL, servidor): no es una visita de la web, pasa tal cual.
  if h is null then
    return new;
  end if;

  c := upper(trim(coalesce(h->>'cf-ipcountry', '')));
  if c ~ '^[A-Z]{2}$' and exists (select 1 from public.analytics_blocked_countries b where b.code = c) then
    begin
      insert into public.analytics_bots (country, reason, row)
      values (c, 'país bloqueado', to_jsonb(new));
    exception when others then
      null; -- si guardar la copia fallara, la visita se descarta igualmente: nunca rompe la web
    end;
    return null;
  end if;

  return new;
end $$;

revoke all on function public.analytics_divert_bots() from public, anon, authenticated;

-- El nombre empieza por zz_ a propósito: los triggers de una tabla se ejecutan por orden alfabético y este
-- debe ir el último, cuando analytics_guard y el del código anónimo ya han hecho su trabajo.
drop trigger if exists zz_analytics_divert_bots_trg on public.analytics;
create trigger zz_analytics_divert_bots_trg
  before insert on public.analytics
  for each row execute function public.analytics_divert_bots();

-- Mover lo que ya había de esos países (nada se borra: pasa a analytics_bots).
with moved as (
  delete from public.analytics a
  where upper(trim(coalesce(a.country::text, ''))) in (select code from public.analytics_blocked_countries)
  returning a.*
)
insert into public.analytics_bots (country, reason, row)
select upper(trim(m.country::text)), 'país bloqueado (limpieza 13/11/2026)', to_jsonb(m) from moved m;

-- Resultado: arriba, lo desviado por país; abajo, lo que se queda HOY por país (para ver si falta alguno).
select grupo, pais, personas, visitas
from (
  select 'desviadas' as grupo, coalesce(country, '??') as pais,
         count(distinct coalesce(row->>'visitor_id', row->>'session_id')) as personas,
         count(*) filter (where row->>'event_type' = 'session_start') as visitas
  from public.analytics_bots
  group by 2
  union all
  select 'se quedan hoy', coalesce(a.country::text, '??'),
         count(distinct coalesce(a.visitor_id::text, a.session_id::text)),
         count(*) filter (where a.event_type::text = 'session_start')
  from public.analytics a
  where a.created_at >= (date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid')
  group by 2
) r
order by grupo, personas desc;
