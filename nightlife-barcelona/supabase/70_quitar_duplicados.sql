-- =====================================================================================
-- Noctua · Quitar los duplicados detectados con 69_revisar_duplicados.sql · 01/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- No borra nada: OCULTA el peor de cada pareja (el que tiene menos datos: verificado, dueño,
-- fotos, descripción, ficha de Google...; a igualdad, se oculta el de id más alto).
-- Para deshacer uno: update public.clubs set hidden = false, duplicate_of = null where id = X;
--
-- Clubs repetidos:      Karaoke Nick (501) / Disco Karaoke Nick (613)
--                       Shenanigans Pub (292) / Shenanigans Irish Pub (337)
-- Esenciales repetidos: Queen's L'Hospitalet (372) / Queen's (470)
--                       BonÀrea (419) / bonÀrea (594)
--
-- NO se tocan (parecen repetidos pero hay que mirarlos; salen en la tabla final como REVISAR):
--   Farmàcia Maragall 24h (212) / Farmàcia Albert Llorens (388): mismas coordenadas, otro nombre.
--   Euronet ATM (197) / Euronet ATM (205): a 45 m, pueden ser dos cajeros distintos.
-- Las paradas Nitbus con el mismo nombre NO son repetidas: son las dos paradas (una por sentido).
-- =====================================================================================

alter table public.clubs add column if not exists duplicate_of bigint;

-- 1) CLUBS
with pares(x, y) as (values (501, 613), (292, 337)),
puntos as (
  select c.id,
         ( (case when coalesce(c.verified, false) then 100 else 0 end)
         + (case when c.owner_user_id is not null then 80 else 0 end)
         + (case when coalesce(c.manual_photos, false) then 20 else 0 end)
         + (case when nullif(c.image, '') is not null then 10 else 0 end)
         + (case when nullif(c.description, '') is not null then 10 else 0 end)
         + (case when c.gallery is not null then 5 else 0 end)
         + (case when nullif(c.google_place_id::text, '') is not null then 5 else 0 end)
         + (case when coalesce(c.hidden, false) = false then 1 else 0 end) ) as score
  from public.clubs c
  where c.id in (501, 613, 292, 337)
), decision as (
  select case when sx.score > sy.score or (sx.score = sy.score and p.x < p.y) then p.x else p.y end as se_queda,
         case when sx.score > sy.score or (sx.score = sy.score and p.x < p.y) then p.y else p.x end as se_oculta
  from pares p
  join puntos sx on sx.id = p.x
  join puntos sy on sy.id = p.y
)
update public.clubs c
set hidden = true, duplicate_of = d.se_queda
from decision d
where c.id = d.se_oculta;

-- 2) ESENCIALES
with pares(x, y) as (values (372, 470), (419, 594)),
puntos as (
  select e.id,
         ( (case when nullif(e.image, '') is not null then 10 else 0 end)
         + (case when nullif(e.description, '') is not null then 10 else 0 end)
         + (case when e.gallery is not null then 5 else 0 end)
         + (case when nullif(e.google_place_id::text, '') is not null then 5 else 0 end)
         + (case when nullif(e.open_hours, '') is not null then 3 else 0 end)
         + (case when coalesce(e.hidden, false) = false then 1 else 0 end) ) as score
  from public.essentials e
  where e.id in (372, 470, 419, 594)
), decision as (
  select case when sx.score > sy.score or (sx.score = sy.score and p.x < p.y) then p.x else p.y end as se_queda,
         case when sx.score > sy.score or (sx.score = sy.score and p.x < p.y) then p.y else p.x end as se_oculta
  from pares p
  join puntos sx on sx.id = p.x
  join puntos sy on sy.id = p.y
)
update public.essentials e
set hidden = true
from decision d
where e.id = d.se_oculta;

-- Resultado: qué ha quedado oculto (hidden = true) y qué hay que mirar a mano.
select 'club' as tabla, id, name as detalle, hidden, duplicate_of::text as nota
from public.clubs where id in (501, 613, 292, 337)
union all
select 'esencial', id, name, hidden, null
from public.essentials where id in (372, 470, 419, 594)
union all
select 'REVISAR esencial', id,
       name || ' · ' || coalesce(address, 'sin dirección') || ' · ' || coalesce(latitude::text, '?') || ',' || coalesce(longitude::text, '?'),
       hidden, coalesce(open_hours, 'sin horario')
from public.essentials where id in (212, 388, 197, 205)
order by 1, 2;
