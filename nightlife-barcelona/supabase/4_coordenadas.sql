-- Noctua · Coordenadas editables desde el admin · 14/10/2026
-- Asegura que clubs, eventos y esenciales tienen columnas de coordenadas (y los eventos, dirección).
-- Si ya existen, no cambia nada. Se puede repetir sin problema.
alter table public.clubs      add column if not exists latitude double precision, add column if not exists longitude double precision;
alter table public.events     add column if not exists latitude double precision, add column if not exists longitude double precision, add column if not exists address text;
alter table public.essentials add column if not exists latitude double precision, add column if not exists longitude double precision;

-- Comprobación: cuántos sitios tienen ya coordenadas (los que no, no salen en el mapa).
select 'clubs' as tabla, count(*) filter (where latitude is not null and longitude is not null) as con_coordenadas, count(*) as total from public.clubs
union all
select 'events', count(*) filter (where latitude is not null and longitude is not null), count(*) from public.events
union all
select 'essentials', count(*) filter (where latitude is not null and longitude is not null), count(*) from public.essentials;
