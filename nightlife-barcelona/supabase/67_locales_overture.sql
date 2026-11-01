-- =====================================================================================
-- Noctua · Locales de noche de los 9 municipios (Overture Maps) · 01/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema: no crea nada que ya
-- exista (mismo nombre sin tildes/mayúsculas, o nombre parecido a menos de ~120 m).
--
-- Todo entra OCULTO (hidden = true, verified = false, import_source = 'overture'). Salen de la
-- base abierta Overture Maps (versión 2026-10-21), no de OpenStreetMap, y NO están comprobados uno
-- a uno. Después de ejecutarlo:
--   1. Ajustes y herramientas › "Asignar ficha de Google a clubs nuevos" y "Actualizar datos de
--      Google (clubs)": los que Google no encuentre o marque como cerrados, bórralos.
--   2. Admin › Clubs › filtro "Ocultos": publica (ojo) los que sigan abiertos.
--
-- Requiere las funciones noctua_norm_venue_name (28_locales_repetidos.sql) y noctua_make_slug
-- (29_kahala_hdp_karaokes.sql), que ya tienes.
-- =====================================================================================

with nuevos(name, address, neighborhood, city, lat, lon, venue_type, website, phone, instagram) as (
  values
  ('Autèntic The Club', 'Carrer d''Isidre Nonell, 11, 08911, Badalona', 'Badalona', 'Badalona', 41.458847, 2.26141, 'Bar musical', 'http://www.autentictheclub.com', '+34 933 89 96 44', null),
  ('Ca La Vera Rock Bar', 'Carrer de Coll i Pujol, 73, 08912, Badalona', 'Badalona', 'Badalona', 41.450167, 2.240514, 'Bar musical', null, '+34 937 04 19 78', null),
  ('Estraperlo Club del Ritme', 'Carrer d''Isidre Nonell, 9, 08911, Badalona', 'Badalona', 'Badalona', 41.458773, 2.261289, 'Bar musical', 'https://estraperlo.club', '+34 683 30 83 98', null),
  ('Kailua Beach', 'Passeig Marítim s/n - Platja del Pont d''en Botifarreta, 08911, Badalona', 'Badalona', 'Badalona', 41.451426, 2.255929, 'Coctelería', 'http://www.kailuabeach.es', '+34 657 73 96 00', null),
  ('Mambo Club Badalona', 'Carrer de Miquel Servet, 149, 08912, Badalona', 'Badalona', 'Badalona', 41.446243, 2.240074, 'Discoteca', 'https://www.mambo.club', '+34 679 51 97 44', null),
  ('Pub Ñoña', 'Carrer de la Mercè, 11, 08911, Badalona', 'Badalona', 'Badalona', 41.451405, 2.24963, 'Pub', null, '+34 676 55 14 54', null),
  ('STK', 'Carrer de Coll i Pujol, 95, 08912, Badalona', 'Badalona', 'Badalona', 41.452442, 2.236809, 'Discoteca', null, null, null),
  ('Titus Carpa', 'Ctra. de Mataró, km 6,29, 08911, Badalona', 'Badalona', 'Badalona', 41.458073, 2.263013, 'Discoteca', 'http://www.titus.cat', '+34 934 64 27 10', null),
  ('La Jungla', 'Carrer de Santa Maria, 100, 08911, Badalona', 'Badalona', 'Badalona', 41.452242, 2.25523, 'Pub', 'https://www.lajunglaonline.es', '+34 931 65 77 84', null),
  ('Splash Badalona', 'Carrer de Santa Madrona, 97, 08911, Badalona', 'Badalona', 'Badalona', 41.451664, 2.255354, 'Pub', null, '+34 670 29 66 27', null),
  ('Bocachica Dominican Club', 'Carrer del Coure, 39, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.356112, 2.09658, 'Discoteca', null, '+34 671 29 61 10', null),
  ('Discoteca Capitolio', 'Carrer del Coure, 79, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.355694, 2.095922, 'Discoteca', null, '+34 652 39 84 50', null),
  ('Jungle', 'Carrer de Marià Benlliure, 10, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.363598, 2.074526, 'Discoteca', null, null, null),
  ('Jymmy''s Bar Musical', 'Carrer de Joan Maragall, 38, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.357298, 2.070895, 'Bar musical', 'http://www.jymmys.com', '+34 933 77 19 64', null),
  ('Mambo disco show', 'Carrer de l''Energia, 38-40, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.355186, 2.093766, 'Discoteca', 'http://www.byaxelgroup.com', '+34 670 78 28 01', null),
  ('Network Music Bar', 'Av. del Parc, 39, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.359434, 2.07489, 'Bar musical', null, '+34 697 88 69 41', null),
  ('Phant Cornella', 'Carrer de l''Oliverar, 6, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.368038, 2.078143, 'Discoteca', 'http://www.okeycornella.com', '+34 661 47 50 65', null),
  ('Queen''s Disco BCN', 'Passeig dels Ferrocarrils Catalans, 117, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.352396, 2.077955, 'Discoteca', null, '+34 695 79 86 27', null),
  ('Arrikitown Club', 'Ramoneda 76, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', 'Cornellà de Llobregat', 41.364447, 2.078438, 'Bar musical', null, null, null),
  ('Deseo Beach Club', 'Passeig de la platja s/n, El Prat de Llobregat', 'El Prat de Llobregat', 'El Prat de Llobregat', 41.300167, 2.10386, 'Bar musical', 'https://xceed.me/es/barcelona/club/deseo-beach-club', '+34 662 03 07 97', null),
  ('Gin-Karaoke Mar Endins', 'Carrer d''Enric Morera, 25, 08820, El Prat de Llobregat', 'El Prat de Llobregat', 'El Prat de Llobregat', 41.327881, 2.097398, 'Karaoke', 'http://www.marendins.cat', '+34 699 41 33 02', null),
  ('Amgo Cockteleria', 'Av. de la Verge de Montserrat, 220, 08820, El Prat de Llobregat', 'El Prat de Llobregat', 'El Prat de Llobregat', 41.323845, 2.088585, 'Coctelería', null, '+34 933 70 43 70', null),
  ('F3 Drinks & Cocktails', 'Carrer de Laureà Miró, 343, 08950, Esplugues de Llobregat', 'Esplugues de Llobregat', 'Esplugues de Llobregat', 41.378033, 2.0814, 'Coctelería', null, '+34 722 52 92 53', null),
  ('Latinmusic Antoniogaudi', 'Carrer d''Antoni Gaudí, 6, 08950, Esplugues de Llobregat', 'Esplugues de Llobregat', 'Esplugues de Llobregat', 41.370647, 2.09736, 'Bar musical', null, '+34 934 73 31 86', null),
  ('Bar Musical Boogaloo', 'Carrer de la Pubilla Cases, 18, 08906, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.370655, 2.10307, 'Bar musical', null, '+34 934 38 59 74', null),
  ('Bar Musical Gotham', 'Carrer de Mas, 44, 08903, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.372726, 2.121578, 'Bar musical', 'http://www.somosrd.net', '+34 695 89 75 04', null),
  ('Bar Musical Luna', 'Av. de Josep Tarradellas i Joan, 197, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.363619, 2.099267, 'Bar musical', null, '+34 615 34 85 05', null),
  ('Bar Musical Relevo', 'Carrer de la Primavera, 128, 08905, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.372068, 2.107, 'Bar musical', null, '+34 644 48 98 57', null),
  ('The Garage', 'Passatge Can Polític, 13, 08907, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.354374, 2.107209, 'Discoteca', 'https://thebassvalley.com/the-garage', '+34 627 06 23 33', null),
  ('Coctelería Mary Pickford', 'Carrer d''Enric Prat de la Riba, 246, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.360405, 2.103747, 'Coctelería', 'http://marypickfordcocktailbar.blogspot.com', '+34 934 94 82 46', null),
  ('Discoteca Caribe Caliente', 'Travessera de Collblanc, 23, 08904, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.374447, 2.115215, 'Discoteca', 'http://bcnlatina.es', '+34 629 56 09 01', null),
  ('Escala Club', 'Carrer de Mas, 63, 08904, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.371946, 2.120708, 'Pub', null, null, null),
  ('Insert Coin', 'Carrer de Barcelona, 141, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.359901, 2.097553, 'Bar musical', 'http://www.insert-coin.com', '+34 933 37 41 29', null),
  ('Juanchito BCN', 'Carrer d''Enric Prat de la Riba, 61, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.363693, 2.113363, 'Discoteca', null, '+34 695 84 89 44', null),
  ('La Carpa Barcelona', 'Avinguda de Manuel Azaña, 23, 08906, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.37813, 2.104143, 'Discoteca', null, '+34 671 21 13 83', null),
  ('Lennon''s Club', 'Av. Fabregada, 91, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.360573, 2.106608, 'Discoteca', 'http://www.lennons.cat', '+34 933 37 02 50', null),
  ('Mizuwari Cocktail Bar', 'Carrer de les Roselles, 32, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.358643, 2.100505, 'Coctelería', 'http://www.mizuwaricocktailbar.com', '+34 676 13 59 30', null),
  ('Sala River', 'Carrer de Santa Anna, 14, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.358807, 2.10135, 'Bar musical', 'https://linktr.ee/salariver', '+34 665 18 74 80', null),
  ('Salamandra', 'Av. del Carrilet, 235, 08907, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.360142, 2.109378, 'Discoteca', 'http://www.salamandra.cat', '+34 933 37 06 02', null),
  ('ZOCO', 'Av. del Carrilet, 235, 08907, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.360128, 2.10919, 'Discoteca', 'http://www.salamandra.cat', '+34 933 37 06 02', null),
  ('Mood Factory', 'Av. del Carrilet, 237, 08907, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 41.360058, 2.109046, 'Discoteca', 'http://www.moodfactory.es', '+34 675 92 38 26', null),
  ('BLU Music Bar', 'Carrer de Sant Josep, 48, 08922, Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 41.450077, 2.2127, 'Bar musical', null, '+34 675 48 01 80', null),
  ('Room Santa Coloma', 'Passeig de Mossèn Jaume Gordi, 6, 08921, Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 41.452272, 2.210406, 'Discoteca', null, null, null),
  ('Sala Casanovas', 'Carrer de la Vistalegre, 5, 08921, Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 41.451834, 2.212275, 'Bar musical', null, null, null),
  ('Sala pOp', 'Carrer de Rafael de Casanovas, 3, 08921, Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 41.45315, 2.20925, 'Bar musical', null, '+34 645 97 57 58', null),
  ('Times Discoteca', 'Av. de Francesc Macià, 16, 08921, Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 41.452099, 2.205771, 'Discoteca', null, '+34 645 97 57 58', 'https://www.instagram.com/timesbcn/'),
  ('Yesterday Bar Musical', 'Carrer Major, 24, 08921, Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 41.453461, 2.207378, 'Bar musical', null, '+34 656 97 02 37', null),
  ('The New Mambo Kings', 'Carrer del Doctor Pagès, 9, 08922, Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 'Santa Coloma de Gramenet', 41.450314, 2.215449, 'Bar musical', null, null, null),
  ('Aura Beach Club', 'Avenida de la Playa, 08930, Sant Adrià de Besòs', 'Sant Adrià de Besòs', 'Sant Adrià de Besòs', 41.426453, 2.2275, 'Discoteca', null, null, null),
  ('L''Atlàntida Barcelona', 'Dolores Ibarruri, s/n, 08930, Sant Adrià de Besòs', 'Sant Adrià de Besòs', 'Sant Adrià de Besòs', 41.430603, 2.2182, 'Discoteca', 'http://clubatlantida.com', '+34 933 81 86 57', null),
  ('MAC ARENA MAR Beach Club', 'Carrer del Parc de la Pau, s/n, 08930, Sant Adrià de Besòs', 'Sant Adrià de Besòs', 'Sant Adrià de Besòs', 41.420242, 2.220171, 'Bar musical', 'http://www.macarenamar.com', '+34 933 56 03 37', null),
  ('NouTM', 'Avinguda de Pi i Margall, 12, 08930, Sant Adrià de Besòs', 'Sant Adrià de Besòs', 'Sant Adrià de Besòs', 41.432901, 2.21603, 'Discoteca', null, null, null),
  ('Coctelería Karaoke Inn', 'Carrer de Bonaventura Aribau, 22, 08830, Sant Boi de Llobregat', 'Sant Boi de Llobregat', 'Sant Boi de Llobregat', 41.339476, 2.042961, 'Karaoke', null, '+34 936 30 52 89', null),
  ('Coctelería Sensa', 'Carrer de Mossèn Antoni Solanas, 23, 08830, Sant Boi de Llobregat', 'Sant Boi de Llobregat', 'Sant Boi de Llobregat', 41.338442, 2.04527, 'Coctelería', null, '+34 692 49 59 05', null),
  ('Discoteca Candy', 'Carrer de la Riera Basté, 29, 08830, Sant Boi de Llobregat', 'Sant Boi de Llobregat', 'Sant Boi de Llobregat', 41.346428, 2.03615, 'Discoteca', null, '+34 671 29 61 10', null),
  ('Imperio Disco Club', 'Carrer de la Indústria, 54, 08830, Sant Boi de Llobregat', 'Sant Boi de Llobregat', 'Sant Boi de Llobregat', 41.338333, 2.046149, 'Discoteca', 'https://imperioclub.bcn', '+34 697 11 31 35', null),
  ('Karaoke Ruben Sant Boi', 'Ronda de Sant Ramon, 123, 08830, Sant Boi de Llobregat', 'Sant Boi de Llobregat', 'Sant Boi de Llobregat', 41.346273, 2.028443, 'Karaoke', null, '+34 690 85 93 03', null),
  ('Palmahia Discoteca Sant Boi', 'Ronda de Sant Ramon, 154, 08830, Sant Boi de Llobregat', 'Sant Boi de Llobregat', 'Sant Boi de Llobregat', 41.334761, 2.040321, 'Discoteca', null, '+34 634 73 98 79', null),
  ('D''niros Dance Club', 'Carrer dels Vapors, 5, 08830, Sant Boi de Llobregat', 'Sant Boi de Llobregat', 'Sant Boi de Llobregat', 41.326797, 2.0439, 'Discoteca', null, '+34 603 45 26 79', null),
  ('B&B Drinks', 'Ronda de Sant Ramon, 120, 08830, Sant Boi de Llobregat', 'Sant Boi de Llobregat', 'Sant Boi de Llobregat', 41.344168, 2.029332, 'Coctelería', null, '+34 690 82 85 25', null),
  ('Bar Musical 71', 'Carrer de la Verge del Pilar, 12, 08980, Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 41.382872, 2.053497, 'Bar musical', null, '+34 930 17 58 25', null),
  ('Carpes Palm Beach', 'Carrer de Sant Josep, 150, 08980, Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 41.39185, 2.034386, 'Discoteca', 'http://www.carpaspalmbeach.com', '+34 649 96 80 88', null),
  ('Milenio Music Bar', 'Carretera de Laureà Miró, 236, 08980, Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 41.381651, 2.043308, 'Discoteca', null, '+34 931 58 68 16', 'https://www.instagram.com/milenio_music_bar/'),
  ('Pub Cul de Sac', 'Carrer de Laureà Miró, 155, 08980, Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 41.379969, 2.045838, 'Pub', null, '+34 607 36 33 31', null),
  ('Twenty Two', 'Carrer de Joan Batllori, 6, 08980, Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 'Sant Feliu de Llobregat', 41.381575, 2.044451, 'Discoteca', 'http://www.twentysantfeliu.com', null, null)
)
insert into public.clubs (name, slug, address, neighborhood, city, latitude, longitude, venue_type, website, phone, instagram, karaoke, cocktails, hidden, verified, import_source)
select n.name,
       case when exists (select 1 from public.clubs c where c.slug = public.noctua_make_slug(n.name))
            then public.noctua_make_slug(n.name || ' ' || n.city)
            else public.noctua_make_slug(n.name) end,
       n.address, n.neighborhood, n.city, n.lat, n.lon, n.venue_type, n.website, n.phone, n.instagram,
       (n.venue_type = 'Karaoke'), (n.venue_type = 'Coctelería'), true, false, 'overture'
from nuevos n
where not exists (
  select 1 from public.clubs c
  where public.noctua_norm_venue_name(c.name) = public.noctua_norm_venue_name(n.name)
     or (nullif(c.latitude::text, '') is not null and nullif(c.longitude::text, '') is not null
         and abs(nullif(c.latitude::text, '')::float8 - n.lat::float8) < 0.0011
         and abs(nullif(c.longitude::text, '')::float8 - n.lon::float8) < 0.0015
         and length(public.noctua_norm_venue_name(n.name)) >= 4
         and length(public.noctua_norm_venue_name(c.name)) >= 4
         and (public.noctua_norm_venue_name(c.name) like '%' || public.noctua_norm_venue_name(n.name) || '%'
           or public.noctua_norm_venue_name(n.name) like '%' || public.noctua_norm_venue_name(c.name) || '%'))
);

-- Qué se ha añadido (y se ha saltado por existir ya)
select city, count(*) as nuevos_ocultos
from public.clubs
where import_source = 'overture'
group by city
order by city;
