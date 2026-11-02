-- =====================================================================================
-- Noctua · Ocultar los esenciales que no encajan con los horarios de Noctua · 02/11/2026
-- Ejecutar entero en Supabase › SQL Editor.
--
-- Criterio (el de siempre): un esencial de Farmacia, Comida, Supermercado o Gasolinera solo se queda si
-- alguna noche de la semana abre 24 h, está abierto a la 1:00 de la madrugada o cierra a la 1:00 o más
-- tarde. Estos 47 no cumplen NINGÚN día (según el horario que tienen guardado) y se ocultan:
--   · Comida (25): 10 con solo la hora de cierre escrita a mano (antes de la 1:00), 9 con horario solo
--     de lunes a jueves que cierra antes de la 1:00 y 6 que cierran antes de la 1:00 todos los días.
--   · Gasolineras (12): horario de día (6–22 h).  · Farmacias (6): horario de día.
--   · Supermercados (4): cierran a las 0:00 o antes.
-- No se borra nada: solo se pone hidden = true. Para recuperar uno cuando corrijas su horario:
--   update public.essentials set hidden = false where id = X;
--
-- Al final sale una tabla con: (1) La Boca (id 400), para ponerle el horario, y (2) los Comida con
-- horario «no entendido» que no salían en la lista anterior (esa lista se cortaba en 25 y había 31).
-- =====================================================================================

update public.essentials
set hidden = true
where id in (
   215, 216, 217, 218, 219, 290, 294, 298, 299, 308, 309, 310, 311, 312, 315, 437, 439, 443,
   452, 453, 454, 455, 456, 511, 512, 514, 517, 519, 524, 525, 530, 531, 537, 539, 540, 541,
   567, 575, 576, 582, 597, 598, 600, 605, 620, 621, 623
);

with base as (
  select id, name, category, open_hours
  from public.essentials
  where coalesce(hidden, false) = false
    and category in ('Pharmacy', 'Food', 'Supermarket', 'Gas Station')
), clausulas as (
  select b.id, lower(trim(c)) as c
  from base b
  cross join lateral regexp_split_to_table(coalesce(b.open_hours, ''), '\|') as c
  where trim(c) <> ''
), horas as (
  select id,
         (c ~ '24[\s\u202f\u00a0]*hours') as es24,
         regexp_match(c, '(\d{1,2}):(\d{2})[\s\u202f\u00a0]*(am|pm)?[\s\u202f\u00a0]*[\u2013\u2014-][\s\u202f\u00a0]*(\d{1,2}):(\d{2})[\s\u202f\u00a0]*(am|pm)?') as m
  from clausulas
), por_id as (
  select id, bool_or(es24 or m is not null) as entendido
  from horas
  group by id
), sin_entender as (
  select b.id, b.name, b.category, b.open_hours
  from base b
  left join por_id p on p.id = b.id
  where nullif(trim(coalesce(b.open_hours, '')), '') is not null
    and not coalesce(p.entendido, false)
)
select que, id, nombre, categoria, direccion, barrio, maps_link, horario
from (
  select 1 as o, 'LA BOCA' as que, e.id::text as id, e.name as nombre, e.category as categoria,
         e.address as direccion, e.neighborhood as barrio, e.maps_link as maps_link,
         coalesce(e.open_hours, '(vacío)') as horario
  from public.essentials e
  where e.id = 400
  union all
  select 2, 'SIN REVISAR', s.id::text, s.name, s.category, null::text, null::text, null::text, s.open_hours
  from sin_entender s
  where s.id not in (
   295, 296, 301, 302, 511, 512, 513, 524, 525, 526, 537, 538, 539, 540, 541, 560, 561, 562,
   563, 575, 576, 577, 588, 589, 601
  )
) t
order by o, lpad(id, 12, '0');
