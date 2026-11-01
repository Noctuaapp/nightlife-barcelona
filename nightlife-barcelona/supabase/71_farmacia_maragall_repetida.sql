-- =====================================================================================
-- Noctua · Farmàcia Maragall repetida · 01/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- «Farmàcia Maragall 24h» (212) y «Farmàcia Albert Llorens» (388) son la misma farmacia: misma
-- dirección (Pg. de Maragall, 177) y mismas coordenadas. Se oculta la que tiene menos datos
-- (foto, descripción, ficha de Google...); a igualdad, la de id más alto. No se borra nada.
-- Para deshacerlo: update public.essentials set hidden = false where id = X;
-- =====================================================================================

with puntos as (
  select e.id,
         ( (case when nullif(e.image, '') is not null then 10 else 0 end)
         + (case when nullif(e.description, '') is not null then 10 else 0 end)
         + (case when e.gallery is not null then 5 else 0 end)
         + (case when nullif(e.google_place_id::text, '') is not null then 5 else 0 end)
         + (case when nullif(e.open_hours, '') is not null then 3 else 0 end)
         + (case when coalesce(e.hidden, false) = false then 1 else 0 end) ) as score
  from public.essentials e
  where e.id in (212, 388)
), decision as (
  select case when a.score >= b.score then a.id else b.id end as se_queda,
         case when a.score >= b.score then b.id else a.id end as se_oculta
  from puntos a join puntos b on a.id = 212 and b.id = 388
)
update public.essentials e
set hidden = true
from decision d
where e.id = d.se_oculta;

select id, name, address, hidden, google_place_id is not null as tiene_ficha_google
from public.essentials
where id in (212, 388)
order by id;
