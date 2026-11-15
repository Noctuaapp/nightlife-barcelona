-- =====================================================================================
-- Noctua · Madrid: horarios de los 6 clubs que se han podido comprobar · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- QUÉ HACE: rellena el horario de 6 clubs de Madrid que lo tienen vacío. Solo entran los que tienen una fuente oficial
-- (esMadrid, la web de turismo del Ayuntamiento) o dos fuentes independientes que coinciden. Los otros 250 locales siguen
-- en blanco a propósito: inventar o copiar de un listado dudoso es peor que no saberlo. No toca precio, música ni nada más.
--
-- FORMATO: el mismo que ya usa la web. Los horarios que empiezan de madrugada llevan la letra del día de CALENDARIO
-- (la noche del viernes que empieza a las 00:00 se guarda como «S 00:00-06:00»); la ficha lo vuelve a mostrar como
-- «noche del viernes». Está comprobado con el mismo código que usa la ficha.
--
--   id   club             se guarda                                  la ficha muestra (noches)               fuente
--   840  Cats             J/D 23:45-05:30, S/D 00:00-06:00           Jue/Dom 23:45-05:30 · Vie/Sáb 00:00-06:00   esMadrid (oficial): jue y dom 23:45-05:30, vie y sáb 00:00-06:00
--   752  Moondance        X-D 23:00-06:00                            Mié a Dom 23:00-06:00                       esMadrid (oficial): miércoles a domingo 23:00-06:00
--   787  Mondo Disko      J 23:55-05:30, S 23:55-06:00               Jue 23:55-05:30 · Sáb 23:55-06:00           Time Out (jueves y sábado) y esMadrid (sesiones de Mondo Disko jueves y sábados)
--   770  Teatro Kapital   X/J/D 23:00-05:30, V/S 23:00-06:00         Mié/Jue/Dom hasta 05:30 · Vie/Sáb hasta 06:00   Time Out y Fever. OJO: Xceed solo anuncia jueves a sábado; confianza media
--   766  Shoko            V/S/D/L 00:00-06:00                        Jue a Dom 00:00-06:00                       Time Out (jueves a domingo) y Taquilla.com (miércoles a domingo): solo lo que coincide. Confianza media
--   758  Ochoymedio       S/D 00:00-06:00                            Vie y Sáb 00:00-06:00                       Time Out («Vi. y sá. de 24 a 6 h») y Madrid Happy People (sábados 00:00-06:00)
--
-- QUÉ NO TOCA: si el local ya tiene horario, se deja como está. Solo cambia clubs de Madrid con ese id y ese nombre exactos,
-- así que no puede afectar a ningún local de Barcelona.
--
-- Los horarios de las salas de conciertos (La Riviera, Copérnico, Sala But, Clamores, Siroco…) dependen del evento de cada
-- noche; no tienen un horario fijo y por eso no se rellenan.
--
-- SE PUEDE DESHACER: antes de cambiar nada se guarda lo anterior en public.clubs_madrid_hours_backup_20261115. Para devolverlo:
--     update public.clubs c set hours = b.hours_antes from public.clubs_madrid_hours_backup_20261115 b where c.id = b.id;
-- =====================================================================================

create table if not exists public.clubs_madrid_hours_backup_20261115 (
  id bigint primary key,
  hours_antes text,
  guardado_el timestamptz not null default now()
);
alter table public.clubs_madrid_hours_backup_20261115 enable row level security;
revoke all on public.clubs_madrid_hours_backup_20261115 from public, anon, authenticated;

-- Copia de lo que se cambia (una vez por local: si se repite el SQL no pisa la copia original) y cambio, en una sola orden.
with m (id, nombre, horario) as (
  values
    (840::bigint, 'Cats',           'J/D 23:45-05:30, S/D 00:00-06:00'),
    (752::bigint, 'Moondance',      'X-D 23:00-06:00'),
    (787::bigint, 'Mondo Disko',    'J 23:55-05:30, S 23:55-06:00'),
    (770::bigint, 'Teatro Kapital', 'X/J/D 23:00-05:30, V/S 23:00-06:00'),
    (766::bigint, 'Shoko',          'V/S/D/L 00:00-06:00'),
    (758::bigint, 'Ochoymedio',     'S/D 00:00-06:00')
),
objetivo as (
  select c.id, c.hours, m.horario
  from m
  join public.clubs c on c.id = m.id and c.name = m.nombre and c.city ilike 'madrid%'
  where nullif(btrim(coalesce(c.hours, '')), '') is null
),
copia as (
  insert into public.clubs_madrid_hours_backup_20261115 (id, hours_antes)
  select id, hours from objetivo
  on conflict (id) do nothing
  returning id
)
update public.clubs c
set hours = o.horario
from objetivo o
where c.id = o.id;

-- Comprobación: lo que ha quedado en los 6 clubs.
select id, name, hours, hidden from public.clubs where id in (840, 752, 787, 770, 766, 758) order by id;
