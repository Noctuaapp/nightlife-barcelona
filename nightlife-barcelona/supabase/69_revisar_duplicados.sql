-- =====================================================================================
-- Noctua · Revisar duplicados (clubs y esenciales) · 01/11/2026
-- Ejecutar en Supabase › SQL Editor. NO cambia nada: solo lista parejas sospechosas.
-- Se ejecuta cada consulta por separado (selecciónala y pulsa Run), o todo seguido: el editor
-- enseña el resultado de la última.
--
-- A diferencia de 28_locales_repetidos.sql (que solo mira clubs visibles), aquí entran TODOS,
-- también los ocultos de OpenStreetMap y Overture, que es donde se cuelan los repetidos.
-- «metros» vacío = uno de los dos no tiene coordenadas.
-- Para borrar el que sobra: delete from public.clubs where id = <id_b>;  (o public.essentials)
-- =====================================================================================

-- 1) CLUBS: mismo nombre cerca, o nombre parecido a menos de 120 m
with c as (
  select id, name, city, hidden, import_source,
         public.noctua_norm_venue_name(name) as norm,
         nullif(latitude::text, '')::float8 as lat,
         nullif(longitude::text, '')::float8 as lng
  from public.clubs
  where duplicate_of is null
), p as (
  select a.id as id_a, a.name as nombre_a, a.hidden as oculto_a, a.import_source as origen_a,
         b.id as id_b, b.name as nombre_b, b.hidden as oculto_b, b.import_source as origen_b,
         a.city as ciudad_a, b.city as ciudad_b,
         case when a.lat is not null and b.lat is not null
              then round((111320 * sqrt(power(a.lat - b.lat, 2) + power((a.lng - b.lng) * cos(radians(a.lat)), 2)))::numeric)
         end as metros,
         a.norm as na, b.norm as nb
  from c a join c b on a.id < b.id
)
select id_a, nombre_a, oculto_a, origen_a, id_b, nombre_b, oculto_b, origen_b, ciudad_a, metros,
       case when na = nb then 'mismo nombre' else 'nombre parecido y muy cerca' end as motivo
from p
where (na <> '' and na = nb and (metros < 1500 or (metros is null and coalesce(ciudad_a, '') = coalesce(ciudad_b, ''))))
   or (metros < 120 and length(na) >= 4 and length(nb) >= 4 and (na like '%' || nb || '%' or nb like '%' || na || '%'))
order by motivo, nombre_a;

-- 2) ESENCIALES: misma categoría a menos de 15 m, o mismo nombre a menos de 150 m
with e as (
  select id, name, category, hidden, import_source,
         public.noctua_norm_venue_name(name) as norm,
         nullif(latitude::text, '')::float8 as lat,
         nullif(longitude::text, '')::float8 as lng
  from public.essentials
), p as (
  select a.id as id_a, a.name as nombre_a, a.hidden as oculto_a, a.import_source as origen_a,
         b.id as id_b, b.name as nombre_b, b.hidden as oculto_b, b.import_source as origen_b,
         a.category as categoria, a.norm as na, b.norm as nb,
         round((111320 * sqrt(power(a.lat - b.lat, 2) + power((a.lng - b.lng) * cos(radians(a.lat)), 2)))::numeric) as metros
  from e a join e b on a.id < b.id and a.category = b.category
  where a.lat is not null and b.lat is not null and a.lng is not null and b.lng is not null
)
select categoria, id_a, nombre_a, oculto_a, origen_a, id_b, nombre_b, oculto_b, origen_b, metros,
       case when na = nb then 'mismo nombre' else 'muy cerca (misma categoría)' end as motivo
from p
where metros < 15 or (metros < 150 and na <> '' and na = nb)
order by categoria, nombre_a;
