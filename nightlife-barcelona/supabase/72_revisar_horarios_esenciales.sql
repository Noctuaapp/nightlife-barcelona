-- =====================================================================================
-- Noctua · Revisar que los esenciales cumplan el criterio de horario · 02/11/2026
-- Ejecutar entero en Supabase › SQL Editor. NO cambia nada: solo lista.
--
-- Criterio de Noctua para un esencial de noche (el mismo que usan los importadores): abre las
-- 24 h, o tiene algún día de 24 h, o está abierto a la 1:00 de la madrugada / cierra a la 1:00 o
-- más tarde. Se mira solo lo PUBLICADO (hidden = false) de las categorías donde el horario manda:
-- Pharmacy, Food, Supermarket y Gas Station. Cajeros, hospitales, metro, Nitbus, hoteles y casinos
-- no se miran (no dependen de un horario de tienda).
--
-- Veredictos:
--   ok               cumple el criterio
--   no_es_de_noche   tiene horario, pero cierra antes de la 1:00 todos los días
--   sin_horario      open_hours vacío (no se puede saber)
--   no_entendido     hay texto pero no se reconoce ninguna franja horaria ni «24 hours»
--
-- Salen dos bloques en una sola tabla: RESUMEN (cuántos hay de cada veredicto por categoría) y
-- REVISAR (hasta 25 ejemplos de cada veredicto que no sea «ok», con su id para buscarlo en
-- Admin › Esenciales). Para ocultar uno: update public.essentials set hidden = true where id = X;
-- =====================================================================================

with base as (
  select id, name, category, open_hours
  from public.essentials
  where coalesce(hidden, false) = false
    and category in ('Pharmacy', 'Food', 'Supermarket', 'Gas Station')
), clausulas as (
  -- El horario puede tener varias frases separadas por « | » (una por tramo de días).
  select b.id, lower(trim(c)) as c
  from base b
  cross join lateral regexp_split_to_table(coalesce(b.open_hours, ''), '\|') as c
  where trim(c) <> ''
), horas as (
  select id,
         (c ~ '24[\s\u202f\u00a0]*hours') as es24,
         regexp_match(c, '(\d{1,2}):(\d{2})[\s\u202f\u00a0]*(am|pm)?[\s\u202f\u00a0]*[\u2013\u2014-][\s\u202f\u00a0]*(\d{1,2}):(\d{2})[\s\u202f\u00a0]*(am|pm)?') as m
  from clausulas
), tramos as (
  select id, es24,
         case when m is null then null
              else ((case when m[3] is null then m[1]::int
                          else (m[1]::int % 12) + (case when m[3] = 'pm' then 12 else 0 end) end) % 24) * 60 + m[2]::int end as s,
         case when m is null then null
              else ((case when m[6] is null then m[4]::int
                          else (m[4]::int % 12) + (case when m[6] = 'pm' then 12 else 0 end) end) % 24) * 60 + m[5]::int end as e0
  from horas
), calc as (
  select id, es24, s, e0,
         case when e0 is null then null when e0 < s then e0 + 1440 else e0 end as e
  from tramos
), por_id as (
  select id,
         bool_or(es24 or (s is not null and (e0 = s or e >= 1500 or (s <= 60 and e >= 60)))) as de_noche,
         bool_or(es24 or s is not null) as entendido
  from calc
  group by id
), veredicto as (
  select b.id, b.name, b.category, b.open_hours,
         case when nullif(trim(coalesce(b.open_hours, '')), '') is null then 'sin_horario'
              when not coalesce(p.entendido, false) then 'no_entendido'
              when p.de_noche then 'ok'
              else 'no_es_de_noche' end as v
  from base b
  left join por_id p on p.id = b.id
), ejemplos as (
  select *, row_number() over (partition by category, v order by id) as n
  from veredicto
  where v <> 'ok'
)
select bloque, categoria, veredicto, cuantos, nombre, horario
from (
  select 'RESUMEN' as bloque, category as categoria, v as veredicto, count(*)::text as cuantos, null::text as nombre, null::text as horario
  from veredicto
  group by category, v
  union all
  select 'REVISAR', category, v, id::text, name, coalesce(open_hours, '(vacío)')
  from ejemplos
  where n <= 25
) t
order by bloque, categoria, veredicto, lpad(cuantos, 12, '0');
