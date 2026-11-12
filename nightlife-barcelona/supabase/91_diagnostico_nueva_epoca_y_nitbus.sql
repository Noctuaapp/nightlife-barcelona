-- =====================================================================================
-- Noctua · Diagnóstico (solo LEE, no cambia nada) · 12/11/2026
-- Ejecutar por partes en Supabase › SQL Editor (cada bloque se pega y se lanza por separado).
--
--  A) «Nueva Época» → «Cómo llegar» te lleva a Level Barcelona.
--     El botón usa las coordenadas guardadas del local. Este bloque enseña qué tiene guardado cada uno.
--  B) Locales que comparten las mismas coordenadas (si Nueva Época sale aquí junto a Level, ahí está el fallo).
--  C) Nitbus: paradas guardadas por línea y sentido, con señales de que algo se importó mal.
-- =====================================================================================

-- ---------- A) Nueva Época y Level: qué datos tienen ----------
select id, name, slug, address, neighborhood,
       latitude, longitude, google_place_id
from public.clubs
where name ilike '%época%' or name ilike '%epoca%' or name ilike '%level%'
order by name;

-- ---------- B) Locales con las MISMAS coordenadas que otro ----------
with c as (
  select id, name, address,
         round(nullif(latitude::text, '')::numeric, 5) as lat,
         round(nullif(longitude::text, '')::numeric, 5) as lon
  from public.clubs
)
select a.lat, a.lon, count(*) as locales, string_agg(a.name || ' (#' || a.id || ')', ' · ' order by a.name) as cuales
from c a
where a.lat is not null and a.lon is not null
group by a.lat, a.lon
having count(*) > 1
order by count(*) desc, a.lat;

-- ---------- C) Nitbus: resumen por línea y sentido ----------
-- paradas      = filas guardadas
-- distintas    = nombres distintos (si «paradas» es mucho mayor, el recorrido repite paradas: suele ser
--                una variante o los dos sentidos pegados en uno)
-- salto_max_m  = mayor distancia entre dos paradas seguidas (un salto de varios km suele ser un empalme)
-- primera/ultima = cabeceras guardadas
with s as (
  select line, direction, seq, name,
         nullif(latitude::text, '')::float8  as lat,
         nullif(longitude::text, '')::float8 as lon
  from public.nitbus_line_stops
),
j as (
  select *,
         lag(lat) over w as plat, lag(lon) over w as plon
  from s
  window w as (partition by line, direction order by seq)
),
d as (
  select line, direction, seq, name,
         case when plat is null or lat is null then null
              else 2 * 6371000 * asin(sqrt(
                     power(sin(radians((lat - plat) / 2)), 2)
                     + cos(radians(plat)) * cos(radians(lat)) * power(sin(radians((lon - plon) / 2)), 2)
                   )) end as m
  from j
)
select line, direction as sentido,
       count(*)                       as paradas,
       count(distinct lower(name))    as distintas,
       round(max(m))                  as salto_max_m,
       (array_agg(name order by seq))[1]                         as primera,
       (array_agg(name order by seq desc))[1]                    as ultima
from d
group by line, direction
order by nullif(regexp_replace(line, '\D', '', 'g'), '')::int, direction;

-- ---------- D) Entradas: qué locales tienen enlace de venta de entradas guardado ----------
-- El botón «Entradas» de la ficha solo sale si el local tiene uno de estos enlaces. Si sale 0, no es un fallo del botón:
-- es que ningún local tiene el enlace rellenado.
-- (to_jsonb permite preguntar por columnas que quizá no existan sin que falle la consulta)
select
  count(*) filter (where coalesce(nullif(trim(to_jsonb(c)->>'tickets_url'), ''), nullif(trim(to_jsonb(c)->>'ticket_url'), ''),
                                   nullif(trim(to_jsonb(c)->>'entradas_url'), '')) is not null) as con_enlace_de_entradas,
  count(*) as locales_en_total
from public.clubs c;
