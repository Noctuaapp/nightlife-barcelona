-- =====================================================================================
-- Noctua · Etiqueta «Juegos» y opción «Cerrado temporalmente» · 30/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 55). Se puede repetir sin problema.
--
-- 1) games               Etiqueta «Juegos de mesa o de beber» (ficha, filtro «Juegos» de /clubs,
--                        admin y «Mi club»). Se pone sola a los locales que ya hablan de juegos
--                        en su nombre o su descripción; es solo un punto de partida.
-- 2) temporarily_closed  El local sigue en la web (listado, mapa, ficha) con su etiqueta
--                        «Cerrado temporalmente», pero nunca sale como «abierto ahora» y no se
--                        recomienda en la portada, «Sorpréndeme», el plan ni «cerca de aquí».
--                        Lo activa Noctua desde Admin › Clubs; el dueño también puede en «Mi club».
-- =====================================================================================

alter table public.clubs add column if not exists games boolean not null default false;
alter table public.clubs add column if not exists temporarily_closed boolean not null default false;

update public.clubs set games = true
where not games
  and (name ilike '%juegos de mesa%' or name ilike '%board game%' or name ilike '%boardgame%'
       or description ilike '%juegos de mesa%' or description ilike '%juegos de beber%'
       or description ilike '%board game%' or description ilike '%drinking game%'
       or description ilike '%beer pong%' or description ilike '%jocs de taula%');

-- Comprobación: cuántos locales tienen cada cosa y cuáles son la etiqueta de juegos (para repasarlos).
select count(*) filter (where games) as locales_con_juegos,
       count(*) filter (where temporarily_closed) as locales_cerrados_temporalmente
from public.clubs;
select id, name, neighborhood, hidden from public.clubs where games order by name;
