-- =====================================================================================
-- Noctua · Nuevos locales: Kahala, Bar Billar HDP y karaokes · 24/10/2026
-- Ejecutar entero en Supabase › SQL Editor DESPUÉS de 28_locales_repetidos.sql (usa su función
-- de nombre limpio). Se puede repetir sin problema: no crea nada que ya exista con el mismo
-- nombre (sin contar tildes, mayúsculas ni "bar/club/BCN...").
--
--   - Kahala y Bar Billar HDP: VISIBLES (los conoces tú).
--   - Karaokes: entran OCULTOS. Salen de un listado de prensa (Barcelona Secreta) que puede estar
--     desfasado; revisa que sigan abiertos y publícalos uno a uno en Admin › Clubs › filtro
--     "Ocultos" (botón del ojo de cada uno).
--
-- Después, en Ajustes y herramientas, pasa estas tres (en este orden) para que tengan mapa, foto
-- y datos de Google: "Poner coordenadas a clubs sin ubicación", "Asignar ficha de Google a clubs
-- nuevos" y "Actualizar datos de Google (clubs)".
--
-- Fuentes: Time Out Barcelona (Kahala), anightout / Planomato (HDP), Barcelona Secreta
-- ("Best karaoke bars in Barcelona").
-- =====================================================================================

-- La tabla clubs tiene una regla (clubs_venue_type_check) que solo deja ciertos tipos de local, y
-- no incluía "Coctelería", "Karaoke" ni "Bar de billar". Se rehace con: los tipos que ya permitía,
-- los que ya usa algún club y los nuevos. No se pierde ninguno de los anteriores.
do $$
declare
  old_def text;
  vals text;
begin
  select pg_get_constraintdef(oid) into old_def
  from pg_constraint
  where conrelid = 'public.clubs'::regclass and conname = 'clubs_venue_type_check';

  select string_agg(quote_literal(v), ', ' order by v) into vals
  from (
    select (regexp_matches(coalesce(old_def, ''), '''([^'']+)''', 'g'))[1] as v
    union
    select distinct venue_type from public.clubs where venue_type is not null
    union
    select unnest(array['Discoteca', 'Pub', 'Bar musical', 'Coctelería', 'Karaoke', 'Bar de billar'])
  ) t
  where v is not null and v <> '';

  alter table public.clubs drop constraint if exists clubs_venue_type_check;
  execute format('alter table public.clubs add constraint clubs_venue_type_check check (venue_type is null or venue_type in (%s))', vals);
end $$;

-- Slug igual que createSlug() de la web (src/lib/slug.ts). Nombre propio (noctua_make_slug) para no
-- tocar la noctua_slugify que ya tienes en la base de datos.
create or replace function public.noctua_make_slug(p text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p, '')), 'áàäâãéèëêíìïîóòöôõúùüûñçł·''’', 'aaaaaeeeeiiiiooooouuuuncl   '),
    '[^a-z0-9]+', '-', 'g'))
$$;

with nuevos(name, address, neighborhood, city, venue_type, music, hours, has_foosball, description, hidden) as (
  values
  ('Kahala', 'Avinguda Diagonal, 537, 08029 Barcelona', 'Les Corts', 'Barcelona', 'Coctelería', 'Tiki · Lounge',
   'D/L/M/X/J/V 18:00-03:00, S 18:00-03:30', false,
   'El primer bar hawaiano de Barcelona: coctelería tiki con decoración tropical, helechos y peces en la entrada, y cócteles afrutados con nombres divertidos. Ambiente de copas tranquilo, ideal para empezar la noche.',
   false),
  ('Bar Billar HDP', 'Carrer de Sant Joaquim, 35, 08012 Barcelona', 'Gràcia', 'Barcelona', 'Bar de billar', null,
   null, true,
   'Bar de billar de Gràcia desde 1985: mesas de billar bien cuidadas, dardos, juegos de mesa, cerveza artesana y cócteles. Ambiente relajado para una partida antes o en lugar de la discoteca.',
   false),
  ('Touch Music Karaoke Bar', 'Carrer de Joan Miró, 8, 08005 Barcelona', 'Vila Olímpica', 'Barcelona', 'Karaoke', 'Karaoke',
   null, false, 'Karaoke con un catálogo enorme de canciones y un escenario que se mete entre el público.', true),
  ('A Viva Voz Rocafort', 'Carrer de Rocafort, 187, 08029 Barcelona', 'Eixample', 'Barcelona', 'Karaoke', 'Karaoke',
   null, false, 'Karaoke clásico con entrada libre (consumición obligatoria) y canciones en hasta quince idiomas.', true),
  ('A Viva Voz Aribau', 'Carrer d''Aribau, 103, 08036 Barcelona', 'Eixample', 'Barcelona', 'Karaoke', 'Karaoke',
   null, false, 'Karaoke clásico con entrada libre (consumición obligatoria) y canciones en hasta quince idiomas.', true),
  ('A Viva Voz Muntaner', 'Carrer de Muntaner, 414, 08006 Barcelona', 'Sant Gervasi', 'Barcelona', 'Karaoke', 'Karaoke',
   null, false, 'Karaoke clásico con entrada libre (consumición obligatoria) y canciones en hasta quince idiomas.', true),
  ('Disco Karaoke Nick', 'Avinguda de Madrid, 160, 08028 Barcelona', 'Les Corts', 'Barcelona', 'Karaoke', 'Karaoke',
   null, false, 'Disco-karaoke con karaoke gratis con la consumición: se sube al escenario por orden de petición.', true),
  ('Weekend Karaoke Bar', 'Carrer de la Diputació, 365, 08013 Barcelona', 'Eixample', 'Barcelona', 'Karaoke', 'Karaoke',
   null, false, 'Karaoke veterano con dos salas y canciones en 18 idiomas.', true),
  ('Contraste Karaoke', 'Carrer de Muntaner, 130, 08036 Barcelona', 'Eixample', 'Barcelona', 'Karaoke', 'Karaoke',
   null, false, 'Karaoke con luces de neón, escenario y unas 10.000 canciones; admite fiestas privadas de hasta 120 personas.', true),
  ('Karaoke Rooms', 'Avinguda del Carrilet, 237, 08907 L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'Karaoke', 'Karaoke',
   null, false, 'Dieciséis salas de karaoke privadas e insonorizadas, para ir en grupo.', true),
  ('Forever & Young Music Bar', 'Carrer d''Aribau, 153, 08036 Barcelona', 'Eixample', 'Barcelona', 'Bar musical', 'Karaoke · 70s · 80s',
   null, false, 'Bar de música de los 70 y 80 con karaoke los jueves y conciertos o sesiones temáticas el resto de días.', true),
  ('La Orquídea Karaoke', 'Carrer de Calvet, 14, 08021 Barcelona', 'Sant Gervasi', 'Barcelona', 'Karaoke', 'Karaoke',
   null, false, 'Restaurante chino con karaoke: salas privadas y una sala grande abierta. Mejor reservar.', true)
)
insert into public.clubs (name, slug, address, neighborhood, city, venue_type, music, hours, has_foosball, description, hidden)
select n.name, public.noctua_make_slug(n.name), n.address, n.neighborhood, n.city, n.venue_type, n.music, n.hours, n.has_foosball, n.description, n.hidden
from nuevos n
where not exists (
  select 1 from public.clubs c
  where public.noctua_norm_venue_name(c.name) = public.noctua_norm_venue_name(n.name)
     or (n.name = 'Bar Billar HDP' and c.name ilike '%hdp%')
);

select id, name, venue_type, hidden from public.clubs
where name in ('Kahala', 'Bar Billar HDP', 'Touch Music Karaoke Bar', 'A Viva Voz Rocafort', 'A Viva Voz Aribau',
  'A Viva Voz Muntaner', 'Disco Karaoke Nick', 'Weekend Karaoke Bar', 'Contraste Karaoke', 'Karaoke Rooms',
  'Forever & Young Music Bar', 'La Orquídea Karaoke')
order by hidden, name;
