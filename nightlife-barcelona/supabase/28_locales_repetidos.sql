-- =====================================================================================
-- Noctua · Locales repetidos · 24/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- "Siguen habiendo locales repetidos". Busca entre los clubs VISIBLES las parejas que son el
-- mismo sitio y oculta el peor de cada pareja (no borra nada):
--   - misma ficha de Google (google_place_id), o
--   - mismo nombre "limpio" (sin tildes, mayúsculas ni palabras como bar/club/BCN/la/el...)
--     y a menos de 300 m (o sin coordenadas), o
--   - a menos de 60 m y un nombre contiene al otro ("Opium" / "Opium Barcelona Mar").
--
-- Cuál se queda: el más completo (verificado, con dueño, fotos subidas a mano, foto, descripción,
-- ficha de Google...). A igualdad, el más antiguo (id más bajo).
--
-- Cada local oculto queda marcado con duplicate_of = id del que se queda, así:
--   - se puede ver qué se ocultó (última consulta de este archivo),
--   - y deshacerlo de uno en uno: update clubs set hidden = false, duplicate_of = null where id = X;
-- =====================================================================================

alter table public.clubs add column if not exists duplicate_of bigint;

-- Nombre "limpio": igual que el importador de OpenStreetMap (src/app/api/admin/import-osm-clubs).
create or replace function public.noctua_norm_venue_name(p text)
returns text
language sql
immutable
as $$
  with base as (
    select regexp_replace(
      translate(lower(coalesce(p, '')),
        'áàäâãéèëêíìïîóòöôõúùüûñçł·''’',
        'aaaaaeeeeiiiiooooouuuuncl   '),
      '[^a-z0-9 ]', ' ', 'g') as b
  ), words as (
    select w from base, regexp_split_to_table(b, '\s+') as w where w <> ''
  ), kept as (
    select w from words
    where w not in ('bar','pub','club','discoteca','cafe','restaurant','restaurante','bcn','barcelona','the','el','la','los','las','de','del','i','y','and')
  )
  select coalesce(
    nullif((select string_agg(w, '') from kept), ''),
    (select string_agg(w, '') from words),
    ''
  );
$$;

drop table if exists _clubs_dedup;
create temp table _clubs_dedup as
select
  id,
  name,
  nullif(google_place_id::text, '') as gpid,
  public.noctua_norm_venue_name(name) as norm,
  nullif(latitude::text, '')::float8 as lat,
  nullif(longitude::text, '')::float8 as lng,
  ( (case when coalesce(verified, false) then 100 else 0 end)
  + (case when owner_user_id is not null then 80 else 0 end)
  + (case when coalesce(manual_photos, false) then 20 else 0 end)
  + (case when nullif(image, '') is not null then 10 else 0 end)
  + (case when nullif(description, '') is not null then 10 else 0 end)
  + (case when gallery is not null then 5 else 0 end)
  + (case when nullif(google_place_id::text, '') is not null then 5 else 0 end)
  + (case when nullif(nullif(latitude::text, ''), '0') is not null then 5 else 0 end)
  ) as score
from public.clubs
where coalesce(hidden, false) = false;

drop table if exists _dup_pairs;
create temp table _dup_pairs as
select
  a.id as keep_id, b.id as hide_id,
  case
    when a.gpid is not null and a.gpid = b.gpid then 'misma ficha de Google'
    when a.norm = b.norm then 'mismo nombre'
    else 'mismo sitio, nombre parecido'
  end as motivo
from _clubs_dedup a
join _clubs_dedup b
  on a.id <> b.id
 and (a.score > b.score or (a.score = b.score and a.id < b.id))
where
  (a.gpid is not null and a.gpid = b.gpid)
  or (
    a.norm <> '' and a.norm = b.norm
    and (a.lat is null or b.lat is null or a.lng is null or b.lng is null
         or public.noctua_distance_m(a.lat, a.lng, b.lat, b.lng) < 300)
  )
  or (
    a.lat is not null and b.lat is not null and a.lng is not null and b.lng is not null
    and public.noctua_distance_m(a.lat, a.lng, b.lat, b.lng) < 60
    and length(a.norm) >= 5 and length(b.norm) >= 5
    and (a.norm like '%' || b.norm || '%' or b.norm like '%' || a.norm || '%')
  );

-- Cada local a ocultar, contra el MEJOR de sus gemelos.
drop table if exists _to_hide;
create temp table _to_hide as
select distinct on (p.hide_id) p.hide_id, p.keep_id, p.motivo
from _dup_pairs p
join _clubs_dedup k on k.id = p.keep_id
order by p.hide_id, k.score desc, k.id;

-- Si un "ganador" también sale como perdedor frente a otro mejor, apunta al mejor de verdad.
update _to_hide t
set keep_id = t2.keep_id
from _to_hide t2
where t.keep_id = t2.hide_id;

update public.clubs c
set hidden = true, duplicate_of = t.keep_id
from _to_hide t
where c.id = t.hide_id;

-- Resultado: qué se ha ocultado y por cuál se ha quedado. Si alguno NO era repetido de verdad,
-- deshazlo con: update public.clubs set hidden = false, duplicate_of = null where id = <id_oculto>;
select
  h.id as id_oculto, h.name as oculto,
  k.id as id_que_se_queda, k.name as se_queda,
  t.motivo
from _to_hide t
join public.clubs h on h.id = t.hide_id
join public.clubs k on k.id = t.keep_id
order by k.name;
