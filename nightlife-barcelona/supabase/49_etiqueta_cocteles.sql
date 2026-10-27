-- =====================================================================================
-- Noctua · Etiqueta «Cócteles» · 27/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 48). Se puede repetir sin problema.
--
-- Crea la columna de la etiqueta nueva (aparece en la ficha, en los filtros de /clubs, en el
-- admin y en «Mi club») y la pone a los locales que ya hablan de cócteles en su nombre, su tipo
-- o su descripción. Es solo un punto de partida: desde el admin (o el dueño, en Mi club) se
-- activa o se quita en cada local.
-- =====================================================================================

alter table public.clubs add column if not exists cocktails boolean not null default false;

update public.clubs set cocktails = true
where not cocktails
  and (name ilike '%cocktail%' or name ilike '%coctel%' or name ilike '%cóctel%'
       or venue_type ilike '%cocktail%' or venue_type ilike '%coctel%' or venue_type ilike '%cóctel%'
       or description ilike '%cocktail%' or description ilike '%coctel%' or description ilike '%cóctel%');

-- Comprobación: cuántos locales la tienen ahora y cuáles son (para repasarlos).
select count(*) filter (where cocktails) as locales_con_cocteles from public.clubs;
select id, name, neighborhood, hidden from public.clubs where cocktails order by name;
