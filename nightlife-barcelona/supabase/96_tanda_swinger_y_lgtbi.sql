-- =====================================================================================
-- Noctua · Tanda de clubs swinger y locales LGTBI · 13/11/2026
-- Ejecutar entero en Supabase › SQL Editor DESPUÉS de 28_locales_repetidos.sql (usa su función de
-- nombre limpio). Se puede repetir sin problema: un local que ya esté (mismo nombre sin tildes,
-- mayúsculas ni "bar/club/the/bcn…", mismo slug, o alguno de sus otros nombres) NO se vuelve a
-- crear, y la tabla que sale al final dice cuál se añadió y cuál ya estaba (con su id).
--
-- Pedido: "una tanda de más clubs swinger y bares, discotecas o pubs de índole LGTBI… cerciórate de
-- que no los tengamos y que existan y estén abiertos, con horarios, música…".
--
-- De dónde sale cada dato (consultado el 13/11/2026): fichas de Gay Passport (dirección, horario y
-- música de bares LGTBI), Time Out Barcelona (Arena, Training Club), gaymap.es (actualizada el
-- 09/11/2026: Believe, DMEN'S, Priscilla), Lex (La Sastrería, Boys Bar, Moeem…), guías 2026 de bares
-- gay (Candy Darling, Bacon Bear Bar, Plata…) y, para los clubs liberales, Salir (guía actualizada el
-- 02/11/2026) y New Fizz. Las webs oficiales de los clubs liberales no se pudieron abrir desde aquí.
--
-- QUÉ ENTRA VISIBLE Y QUÉ ENTRA OCULTO (hidden = true):
--   · Visible: el local sale en dos o más fuentes independientes, una de ellas de 2025-2026.
--   · Oculto: solo hay una fuente reciente, o hay algo raro (días que no cuadran, duda de si
--     reabrió, ficha antigua). Revísalos y muéstralos desde Admin cuando estés seguro.
--
-- HORARIOS: solo se rellenan cuando las fuentes lo dan completo (apertura y cierre). Donde falta el
-- cierre o las fuentes no coinciden, se deja vacío a propósito, porque con un horario equivocado la
-- ficha diría «abierto ahora» a deshoras (precedente: M7). Formato de los días: letras del día de
-- INICIO del turno (L M X J V S D).
--
-- DESPUÉS, en Ajustes y herramientas, pasa estas tres (en este orden): "Poner coordenadas a clubs sin
-- ubicación", "Asignar ficha de Google a clubs nuevos" y "Actualizar datos de Google (clubs)". La
-- ficha de Google es la segunda comprobación: si un local no tiene ficha, o sale «cerrado
-- permanentemente», déjalo oculto.
-- =====================================================================================

-- Slug igual que createSlug() de la web (src/lib/slug.ts).
create or replace function public.noctua_make_slug(p text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p, '')), 'áàäâãéèëêíìïîóòöôõúùüûñçł·''’', 'aaaaaeeeeiiiiooooouuuuncl   '),
    '[^a-z0-9]+', '-', 'g'))
$$;

-- Columnas que usa esta tanda (ya existen en la web; esto solo asegura que no falle nada).
alter table public.clubs add column if not exists lgtbi_friendly boolean default false;
alter table public.clubs add column if not exists swinger_friendly boolean default false;
alter table public.clubs add column if not exists swinger_rules text;
alter table public.clubs add column if not exists instagram text;
alter table public.clubs add column if not exists website text;

with nuevos(name, address, neighborhood, venue_type, music, hours, description, lgtbi, swinger, rules, instagram, website, hidden, alias) as (
  values
  -- ============================ LGTBI · visibles ============================
  ('Arena Experience', 'Ronda de Sant Pere, 19-21, 08010 Barcelona', 'Eixample', 'Discoteca',
   'Pop · Comercial · Urbano · House', '00:30-05:00',
   'La gran discoteca LGTBI de Barcelona, a un paso de Urquinaona. Dos salas (Madre y Classic) con pop, éxitos, electrónica y reggaetón, y shows de drag, striptease y noches temáticas. Abre todas las noches; la entrada ronda los 20 € con consumición y en los bares del Gaixample reparten flyers de entrada gratis.',
   true, false, null, null, 'https://arenadisco.com/', false,
   array['Arena', 'Arena Madre', 'Arena Classic', 'Arena Sala Madre', 'Arena Xperience', 'Arena Disco', 'Arena Barcelona']),

  ('Believe Club', 'Carrer de Balmes, 56, Barcelona', 'Eixample', 'Discoteca',
   'Pop · Éxitos · Drag shows', 'D/L/M/X/J 23:00-05:00, V/S 23:00-06:00',
   'Club LGTBI pequeño y animado del Eixample, con shows de drag, artistas y bailarines cada noche, y pop y éxitos para bailar. Ambiente mezclado, también para gente hetero.',
   true, false, null, null, null, false,
   array['Believe', 'Believe Barcelona']),

  ('DMEN''S Gay Bar', 'Carrer del Consell de Cent, 257, 08011 Barcelona', 'Eixample', 'Bar musical',
   'House · Shows de drag y go-go', 'J/V/S 22:00-03:00',
   'Discobar LGTBI de fin de semana en el Eixample: DJs de house y, sobre la pista, shows de drag y go-go. Público joven y mucha energía. Abre de jueves a sábado.',
   true, false, null, 'https://www.instagram.com/dmensbcn', null, false,
   array['DMEN''S Discobar', 'Dmens', 'Dmen''s Gay Bar']),

  ('Priscilla Café', 'Carrer del Consell de Cent, 273, 08011 Barcelona', 'Eixample', 'Coctelería',
   null, 'D/L/M/X/J 12:00-03:00, V/S 12:00-03:30',
   'Café de día y bar de cócteles de noche en el Eixample, con decoración ecléctica y aire camp de cultura pop. LGTBI y hetero-friendly.',
   true, false, null, null, null, false,
   array['Priscilla Cafe', 'Priscilla Café Barcelona']),

  ('Moeem Barcelona', 'Carrer de Muntaner, 11, 08011 Barcelona', 'Eixample', 'Bar musical',
   'Pop · Reggaeton · Dance', 'D/L/M/X/J 18:00-02:30, V/S 18:00-03:00',
   'Bar pequeño del Gaixample, con barra en L y una pista que se llena hacia la una. DJs de pop, reggaeton y dance, mucho público joven y precios bajos. Los jueves hay after-work LGTBI y los domingos, bingo.',
   true, false, null, null, 'https://www.moeembarcelona.com/', false,
   array['Moeem']),

  ('Boys Bar BCN', 'Carrer de la Diputació, 174, 08011 Barcelona', 'Eixample', 'Bar musical',
   'House · Latino', 'M/X/J 21:00-02:30, V/S 21:00-03:00',
   'Bar gay del Eixample de diseño moderno, con house como base, noche latina los miércoles, DJ y go-gos los viernes y fiestas temáticas.',
   true, false, null, 'https://www.instagram.com/boysbarbcn/', 'https://www.boysbarbcn.com/bcn', false,
   array['Boys Bar', 'Boys Bar Barcelona']),

  ('La Federica', 'Carrer de Salvà, 3, 08004 Barcelona', 'Poble-sec', 'Bar musical',
   null, 'X/J 19:00-02:00, V/S 19:00-03:00, D 16:00-01:00',
   'Bar de ambiente LGTBI en Poble-sec, de decoración vintage de los 70, con vermut, cócteles y tapas. Shows de drag (los jueves, el Lady Red Velvet Drag Show) y una exposición de arte que va cambiando.',
   true, false, null, 'https://www.instagram.com/barlafederica', 'https://la-federica.wheree.com/', false,
   array['Federica', 'La Federica Bar']),

  ('La Sastrería', 'Carrer del Consell de Cent, 245 bis, 08011 Barcelona', 'Eixample', 'Bar musical',
   'DJs · Mezcla ecléctica', null,
   'Bar LGTBI del Eixample con DJs de mezcla ecléctica y shows de drag interactivos.',
   true, false, null, null, null, false,
   array['La Sastreria BCN', 'Sastrería', 'La Sastreria']),

  ('Punto BCN', 'Carrer de Muntaner, 65, Barcelona', 'Eixample', 'Bar musical',
   'Pop español · Dance', 'M/X/J 18:00-02:30, V/S 18:00-03:00',
   'Bar grande del Gaixample, con altillo, mesas y billar, y público de todas las edades. Pop español y dance, tapas y ambiente desde primera hora. Lo lleva el mismo equipo que Arena, y a veces dan entradas gratis para el club.',
   true, false, null, 'https://www.instagram.com/punto_bcn', null, false,
   array['Punto']),

  ('Candy Darling', 'Gran Via de les Corts Catalanes, 586, 08011 Barcelona', 'Eixample', 'Bar musical',
   'Queer · Drag', 'D/L/M/X/J 19:00-02:30, V/S 19:00-03:00',
   'Bar y club queer del Eixample, con cócteles, platos pequeños, murales y arte, shows de drag y noches temáticas. Ambiente diverso.',
   true, false, null, null, null, false,
   array['Candy Darling Barcelona']),

  ('Bacon Bear Bar', 'Carrer de Casanova, 64, 08011 Barcelona', 'Eixample', 'Pub',
   null, null,
   'Bar de la comunidad bear en el Eixample, abierto a todo el mundo y de ambiente relajado. Promociones por la tarde (Happy Bacon los jueves, ofertas el domingo).',
   true, false, null, null, null, false,
   array['Bacon Bear']),

  ('La Casa de la Pradera', 'Carrer de les Carretes, 57, 08001 Barcelona', 'El Raval', 'Pub',
   null, 'J 19:00-02:00, V/S 19:00-03:00, D 18:00-23:30',
   'Bar sin pretensiones del Raval, con caña a 1,20 €, terraza para ver pasar la gente y copas antes de salir. Los viernes y sábados la sala interior se convierte en pista a partir de las 23:30.',
   true, false, null, 'https://www.instagram.com/lacasadelapraderaraval/', null, false,
   array['Casa de la Pradera', 'La Casa de la Pradera Raval']),

  ('Plata Cocktail Bar', 'Carrer del Consell de Cent, 233, Barcelona', 'Eixample', 'Coctelería',
   null, null,
   'Coctelería del Gaixample, de cócteles creativos, neón e interior pop art, con opciones sin alcohol.',
   true, false, null, null, null, false,
   array['Plata Bar', 'Plata']),

  -- ============================ LGTBI · ocultos (revisar) ============================
  ('Strass', 'Carrer de Villarroel, 68, 08011 Barcelona', 'Eixample', 'Bar musical',
   'Shows de drag', '18:00-03:00',
   'Bar de drag del Eixample, con shows cada noche, copas a buen precio y un local pequeño lleno de neones.',
   true, false, null, 'https://www.instagram.com/strass_bcn', null, true,
   array['Strass Barcelona', 'Strass Bar']),

  ('La Chapelle', 'Carrer de Muntaner, 67, 08011 Barcelona', 'Eixample', 'Coctelería',
   null, 'D/L/M/X/J 16:00-02:30, V/S 16:00-03:00',
   'Coctelería gay de decoración camp y temática religiosa (crucifijos, vírgenes…), muy de empezar la noche antes de salir de fiesta.',
   true, false, null, null, null, true,
   array['Chapelle', 'Bar La Chapelle']),

  ('Madame Jasmine', 'Rambla del Raval, 22, 08001 Barcelona', 'El Raval', 'Pub',
   null, 'D/L/M/X/J 19:30-02:30, V/S 18:00-03:00',
   'Bar queer del Raval de estilo dive bar: decoración de mercadillo, actuaciones de drag improvisadas, pista diminuta y público mezclado.',
   true, false, null, 'https://www.instagram.com/madamejasminebar/', null, true,
   array['Madame Jasmine Bar']),

  ('Lo de Carmen', 'Avinguda del Paral·lel, 104, 08015 Barcelona', 'Poble-sec', 'Bar musical',
   'Drag · Karaoke', 'X/J 19:00-02:30, V/S 19:00-03:00, D 17:00-01:00',
   'Bar queer con drag en directo y karaoke, centrado en la comunidad drag, trans y no binaria. Ambiente activista y acogedor, con neones y carteles retro.',
   true, false, null, 'https://www.instagram.com/lodecarmenbcn/', null, true,
   array['Lo de Carmen Barcelona']),

  ('GinGin Gay Bar', 'Carrer d''Aribau, 40, 08011 Barcelona', 'Eixample', 'Bar musical',
   'Pop · House', 'D/L/M/X/J 18:00-03:00, V/S 18:00-03:30',
   'Bar pequeño del Eixample, de decoración retro y pop art, con shows de drag y cócteles fuertes. Ambiente familiar.',
   true, false, null, 'https://www.instagram.com/gingingaybar', null, true,
   array['GinGin', 'Gin Gin Gay Bar']),

  ('The Moon Tropical', 'Carrer de Villarroel, 60, 08011 Barcelona', 'Eixample', 'Bar musical',
   'Latina · Reggaeton · Salsa', 'D/L/M/X/J 17:00-02:30, V/S 17:00-03:00',
   'Bar gay de ambientación caribeña en el Eixample, con barmans sin camiseta, una pista pequeña y pole dance.',
   true, false, null, 'https://www.instagram.com/themoontropical/', null, true,
   array['Moon Tropical', 'The Moon Tropical Barcelona']),

  ('El Cangrejo Eixample', 'Carrer de Villarroel, 88, 08011 Barcelona', 'Eixample', 'Bar musical',
   'Música de los 70 y 80', 'V/S 22:45-03:00',
   'Bar de baile camp de temática marinera, con cangrejos dorados por todas partes. Música de los 70 y 80 que se canta desde la pista, que se llena hacia la una: mejor llegar pronto.',
   true, false, null, 'https://www.instagram.com/el_cangrejo_eixample/', null, true,
   array['Cangrejo Eixample']),

  ('Carita Bonita', 'Carrer de Balmes, 69, 08007 Barcelona', 'Eixample', 'Bar musical',
   'Bar musical lésbico', null,
   'Bar de música de ambiente lésbico en el Gaixample, con pista de baile y buena carta de cócteles. Punto de encuentro de mujeres de todas las edades y nacionalidades.',
   true, false, null, null, null, true,
   array['Carita Bonita Barcelona']),

  -- ============================ Swinger · visibles ============================
  ('Libert Swinger Club', 'Carrer de Sepúlveda, 31, 08015 Barcelona', 'Sant Antoni', 'Discoteca',
   null, null,
   'Club liberal privado en Sant Antoni, cerca de Plaça Espanya. Barra, zona de sofás, cuarto oscuro, camas, habitaciones privadas y duchas, con fiestas temáticas durante la semana. Abre todos los días a partir de las 15:00.',
   false, true, null, null, 'http://libertbcn.com/', false,
   array['Libert Barcelona', 'Libert Swinger', 'Libert']),

  ('Oops Barcelona Swinger Club', 'Carrer d''Anglí, 69, 08017 Barcelona', 'Sarrià', 'Discoteca',
   null, null,
   'Club liberal en una casa modernista reformada de Sarrià: ambientes acogedores y limpios para tomar algo, charlar y bailar, con salas temáticas, piscina exterior en verano y fiestas frecuentes.',
   false, true, 'Pensado para parejas abiertas, con o sin experiencia en el ambiente swinger.', null, 'https://oopsbarcelona.com/', false,
   array['Oops Barcelona', 'Oops Swinger Club', 'Oops']),

  ('Seisynueve', 'Carrer d''Alcolea, 58, 08014 Barcelona', 'Hostafrancs', 'Discoteca',
   null, null,
   'Club liberal en Hostafrancs, de ambiente elegante, íntimo y discreto, con zona de copas, pista de baile, zona chill-out, camas grandes y jacuzzi. Abre de domingo a jueves desde las 17:00 y los viernes, sábados y vísperas de festivo desde las 22:00.',
   false, true, null, null, 'http://www.6y9.com/web/index.php?lang=es', false,
   array['6y9', 'Seis y Nueve', 'Seisynueve Swinger Club']),

  -- ============================ Swinger · ocultos (revisar) ============================
  ('Uhomo Barcelona', 'Carrer de Puig i Xoriguer, 10, 08004 Barcelona', 'Poble-sec', 'Discoteca',
   'DJ residente · Fiestas temáticas', null,
   'Club liberal con escenario, podios y barras de pole dance, de estética moderna y ambiente sensual y glamuroso. DJ residente, artistas invitados y fiestas temáticas.',
   false, true, 'Los sábados, solo parejas.', null, 'https://uhomoswinger.com/', true,
   array['Uhomo', 'UHomo Swinger Club', 'Uhomo Barcelona Swinger Club']),

  ('Open Swinger Club', 'Carrer de València, 103, 08011 Barcelona', 'Eixample', 'Discoteca',
   null, null,
   'Club liberal en la Esquerra de l''Eixample, junto al Hospital Clínic y abierto desde 2004. Más de 300 m² en dos plantas, con barra, podio, pista de baile, sofás, cuarto oscuro, habitaciones privadas, duchas y jaula.',
   false, true, null, null, 'https://www.openbarcelona.com/', true,
   array['Open Barcelona']),

  ('Tres Rombos', 'Carrer de Josep Estivill, 32, 08027 Barcelona', 'Sant Andreu', 'Discoteca',
   null, null,
   'Club liberal en Sant Andreu, junto al metro Navas, con barra, pista de baile, zona de sofás y salas privadas. Fiestas temáticas durante la semana; abierto a parejas, mujeres, hombres, bisexuales y gente de mente abierta.',
   false, true, null, null, 'https://tresrombos.com/', true,
   array['Tres Rombos Club Swinger y Liberal', 'Charlie Privée', 'Charlie Privee']),

  ('Training Club Pedralbes', 'Carrer del Doctor Joaquín Albarrán, 16, 08034 Barcelona', 'Pedralbes', 'Discoteca',
   null, null,
   'Club liberal en Pedralbes, cerca de la Zona Universitària, con piscina, sauna, mazmorra, zona de semidiscoteca y terraza. Condición para entrar: mente abierta.',
   false, true, null, null, 'https://www.trainingpedralbes.es/', true,
   array['Training Pedralbes', 'Training Club'])
),
por_anadir as (
  select n.* from nuevos n
  where not exists (
    select 1 from public.clubs c
    where c.slug = public.noctua_make_slug(n.name)
       or public.noctua_norm_venue_name(c.name) = public.noctua_norm_venue_name(n.name)
       or public.noctua_norm_venue_name(c.name) in (select public.noctua_norm_venue_name(a) from unnest(n.alias) a)
  )
),
anadidos as (
  insert into public.clubs (name, slug, address, neighborhood, city, venue_type, music, hours, description,
                            lgtbi_friendly, swinger_friendly, swinger_rules, instagram, website, hidden)
  select p.name, public.noctua_make_slug(p.name), p.address, p.neighborhood, 'Barcelona', p.venue_type, p.music, p.hours, p.description,
         p.lgtbi, p.swinger, p.rules, p.instagram, p.website, p.hidden
  from por_anadir p
  returning id, name
)
-- Resultado: qué se añadió (y si quedó visible u oculto) y qué ya estaba (con su id y su nombre).
select n.name as local,
       case when a.id is not null then 'AÑADIDO' else 'YA ESTABA' end as resultado,
       case when a.id is not null then (case when n.hidden then 'oculto: revisar' else 'visible' end)
            else 'ya existe como «' || ex.name || '»' end as detalle,
       coalesce(a.id, ex.id) as id,
       case when n.swinger then 'swinger' else 'LGTBI' end as tipo
from nuevos n
left join anadidos a on a.name = n.name
left join lateral (
  select c.id, c.name from public.clubs c
  where a.id is null
    and (c.slug = public.noctua_make_slug(n.name)
         or public.noctua_norm_venue_name(c.name) = public.noctua_norm_venue_name(n.name)
         or public.noctua_norm_venue_name(c.name) in (select public.noctua_norm_venue_name(x) from unnest(n.alias) x))
  limit 1
) ex on true
order by n.swinger, n.hidden, n.name;
