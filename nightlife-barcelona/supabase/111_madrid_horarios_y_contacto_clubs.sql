-- =====================================================================================
-- Noctua · Madrid · horarios y datos de contacto de clubs · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace (todo en clubs de Madrid, que siguen ocultos):
--   - Pone el horario en 25 clubs que no tenían ninguno. Fuente de cada uno (abajo). Nunca pisa un horario existente.
--   - Pone los días de apertura (open_days) donde estaban vacíos, deducidos del propio horario.
--     Incluye los 6 clubs del SQL 107, que tenían horario pero no días.
--   - Pone la web de Joy Eslava y el Instagram de Morocco, Sala Mon y Moby Dick (fuente: webs oficiales y Time Out Madrid)
--     solo si estaban vacíos.
--   - No toca nada más. Antes de cambiar nada guarda lo que había en public.clubs_madrid_info_backup_20261115.
--
-- Los horarios de OpenStreetMap son lo que ha escrito alguien en el mapa: pueden estar desfasados. Los que empiezan
-- pasada la medianoche (00:00-06:00) NO se han tomado de OpenStreetMap porque ahí no se sabe si hablan del día o de la noche.
-- Los horarios con «Consultar programación» (Joy Eslava, La Riviera, Clamores, Sala But, Teatro Magno, Contraclub) no se han puesto.
--
-- Fuente de cada horario:
--   693 The Blue Velvet Lounge Bar: OpenStreetMap
--   722 Sala El Sol: esMadrid (turismo oficial)
--   740 Wurlitzer Ballroom: Time Out Madrid y esMadrid (turismo oficial)
--   743 Medias Puri: OpenStreetMap
--   759 Juan Sin Miedo La Latina: OpenStreetMap
--   760 Terraza Collin’s: OpenStreetMap
--   764 Samsara: Time Out Madrid
--   777 independance Club: Time Out Madrid y esMadrid (turismo oficial)
--   785 Macera Club: OpenStreetMap
--   786 LobByto Cocktail Bar: OpenStreetMap
--   794 Bátelo Bar Karaoke: OpenStreetMap
--   795 Cheers Karaoke: OpenStreetMap
--   796 Calle 365: OpenStreetMap
--   805 Sala Copérnico: Time Out Madrid
--   821 Sala Mon: Time Out Madrid (Mon Madrid)
--   836 At Substation: OpenStreetMap
--   845 Morocco: Time Out Madrid
--   846 Stigmata Vampire & Gothic Club: OpenStreetMap
--   868 Sala Vesta: OpenStreetMap
--   870 Moby Dick: Time Out Madrid
--   881 Thundercat Club: OpenStreetMap
--   894 Terraza de la Reina: OpenStreetMap
--   911 Goya social club: Time Out Madrid
--   920 ZAFYRO - Coctelería Madrid: OpenStreetMap
--   937 Kapikas Karaoke: OpenStreetMap
-- =====================================================================================

create table if not exists public.clubs_madrid_info_backup_20261115 (
  id bigint primary key,
  hours_antes text,
  open_days_antes text[],
  website_antes text,
  instagram_antes text,
  guardado_el timestamptz not null default now()
);
alter table public.clubs_madrid_info_backup_20261115 enable row level security;
revoke all on public.clubs_madrid_info_backup_20261115 from anon, authenticated;

with m(id, nombre, horario, dias, web, ig) as (
  values
  (693, 'The Blue Velvet Lounge Bar', 'V-S 20:30-01:00 | D 12:30-16:00', array['Vie','Sáb','Dom']::text[], null, null),
  (711, 'Joy Eslava', null, null, 'https://teatroeslava.com/', null),
  (722, 'Sala El Sol', 'J-V 00:30-05:00 | S-D 00:30-06:00', array['Mié','Jue','Vie','Sáb']::text[], null, null),
  (740, 'Wurlitzer Ballroom', 'L-J 22:30-05:30 | V-S 22:00-06:00 | D 23:00-05:30', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (743, 'Medias Puri', 'V-S 23:30-05:30', array['Vie','Sáb']::text[], null, null),
  (752, 'Moondance', null, array['Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (758, 'Ochoymedio', null, array['Vie','Sáb']::text[], null, null),
  (759, 'Juan Sin Miedo La Latina', 'L-J 21:00-03:00 | V-D 17:00-03:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (760, 'Terraza Collin’s', 'L-D 15:00-02:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (764, 'Samsara', 'L-J 22:00-05:30 | V-S 22:00-06:00', array['Lun','Mar','Mié','Jue','Vie','Sáb']::text[], null, null),
  (766, 'Shoko', null, array['Jue','Vie','Sáb','Dom']::text[], null, null),
  (770, 'Teatro Kapital', null, array['Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (777, 'independance Club', 'V-S 23:30-06:00', array['Vie','Sáb']::text[], null, null),
  (785, 'Macera Club', 'X-J 18:00-02:00 | V 18:00-03:00 | S 17:00-03:00 | D 17:00-01:00', array['Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (786, 'LobByto Cocktail Bar', 'L-D 09:00-00:30', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (787, 'Mondo Disko', null, array['Jue','Sáb']::text[], null, null),
  (794, 'Bátelo Bar Karaoke', 'M-J/D 20:00-03:00 | V-S 19:00-03:30', array['Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (795, 'Cheers Karaoke', 'L-X 19:00-03:00 | J 18:00-03:00 | V 18:00-03:30 | S 17:00-03:30 | D 17:00-03:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (796, 'Calle 365', 'L-J/D 18:00-03:00 | V-S 18:00-03:30', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (805, 'Sala Copérnico', 'V-D 00:00-05:00', array['Jue','Vie','Sáb']::text[], null, null),
  (821, 'Sala Mon', 'V 00:00-05:30 | S-D 00:00-06:00', array['Jue','Vie','Sáb']::text[], null, 'monmadridoficial'),
  (836, 'At Substation', 'L-J 22:00-04:00 | V-S 23:30-06:30 | D 20:00-04:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (840, 'Cats', null, array['Jue','Vie','Sáb','Dom']::text[], null, null),
  (845, 'Morocco', 'S-D 00:00-06:00', array['Vie','Sáb']::text[], null, 'salamoroccomadrid'),
  (846, 'Stigmata Vampire & Gothic Club', 'V 21:00-03:30 | S 22:00-03:30', array['Vie','Sáb']::text[], null, null),
  (868, 'Sala Vesta', 'L-J/D 17:00-05:30 | V-S 17:00-06:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (870, 'Moby Dick', 'X 21:00-01:00 | J 21:00-03:00 | V-S 21:00-06:00', array['Mié','Jue','Vie','Sáb']::text[], null, 'mobydickclub'),
  (881, 'Thundercat Club', 'X 22:00-03:00 | J 22:00-05:00 | V-S 22:00-06:00', array['Mié','Jue','Vie','Sáb']::text[], null, null),
  (894, 'Terraza de la Reina', 'L-D 10:00-23:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null),
  (911, 'Goya social club', 'J 23:59-05:30 | V-S 23:59-06:00', array['Jue','Vie','Sáb']::text[], null, null),
  (920, 'ZAFYRO - Coctelería Madrid', 'M-J 18:00-01:00 | V-S 18:00-02:00', array['Mar','Mié','Jue','Vie','Sáb']::text[], null, null),
  (937, 'Kapikas Karaoke', 'L-D 18:00-04:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[], null, null)
), objetivo as (
  select c.id, m.horario, m.dias, m.web, m.ig
  from m
  join public.clubs c on c.id = m.id and c.name = m.nombre and c.city ilike 'madrid%'
), copia as (
  insert into public.clubs_madrid_info_backup_20261115 (id, hours_antes, open_days_antes, website_antes, instagram_antes)
  select c.id, c.hours, c.open_days, c.website, c.instagram
  from public.clubs c join objetivo o on o.id = c.id
  on conflict (id) do nothing
  returning id
)
update public.clubs c
set hours = case when coalesce(btrim(c.hours), '') = '' and o.horario is not null then o.horario else c.hours end,
    open_days = case when (c.open_days is null or cardinality(c.open_days) = 0) and o.dias is not null then o.dias else c.open_days end,
    website = case when coalesce(btrim(c.website), '') = '' and o.web is not null then o.web else c.website end,
    instagram = case when coalesce(btrim(c.instagram), '') = '' and o.ig is not null then o.ig else c.instagram end
from objetivo o
where c.id = o.id;

-- Comprobación: los clubs tocados, con su horario y días (todos deben seguir ocultos).
select c.id, c.name, c.hours, c.open_days, c.hidden
from public.clubs c
where c.id in (select id from public.clubs_madrid_info_backup_20261115)
order by c.id;
