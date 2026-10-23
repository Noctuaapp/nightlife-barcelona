-- =====================================================================================
-- Noctua · Tanda O (traducir descripciones al español) · 24/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema (deja el texto en
-- español igual tanto si se ejecuta una vez como diez).
--
-- Revisé las 368 descripciones que me pasaste: la inmensa mayoría ya estaban en español. Estas
-- 34 estaban en inglés (parece que algún proceso de importación las dejó así) y las he traducido
-- manteniendo el mismo contenido y tono que las demás fichas. Las que solo decían "Cachimba/shisha
-- lounge." las he dejado tal cual a propósito: "shisha lounge" se usa así, en español, en el
-- propio sector, así que no es un fallo de idioma.
-- =====================================================================================

update public.clubs set description = 'Club en Las Ramblas centrado en fiestas de música electrónica y techno los fines de semana.' where id = 27;
update public.clubs set description = 'Sala del Poble Espanyol para conciertos, noches de club y eventos underground.' where id = 29;
update public.clubs set description = 'Sala de conciertos y club en Poblenou para directos y sesiones de DJ.' where id = 37;
update public.clubs set description = 'Innovadora coctelería conocida por sus cócteles muy técnicos y de experiencia inmersiva.' where id = 54;
update public.clubs set description = 'Premiado bar de estilo "dive bar" en El Raval, con cervezas y cócteles creativos.' where id = 55;
update public.clubs set description = 'Clásico bar gay del Gaixample y punto de previa, con invitaciones para discotecas.' where id = 58;
update public.clubs set description = 'Discoteca del Eixample con ritmos latinos, shows y noches de fiesta los fines de semana.' where id = 61;
update public.clubs set description = 'Coctelería del Born con sala de karaoke, sesiones de DJ y eventos especiales.' where id = 211;
update public.clubs set description = 'Lounge de cócteles y bar musical con pista y shisha, en la calle Almogàvers.' where id = 212;
update public.clubs set description = 'Restaurante y bar junto a la Marina que por la noche se convierte en club.' where id = 213;
update public.clubs set description = 'Club de rock en Barcelona con sesiones de Rock & Roll, DJs y eventos hasta tarde.' where id = 216;
update public.clubs set description = 'Restaurante y lounge bar en la Barceloneta con cócteles de autor y buen ambiente.' where id = 217;
update public.clubs set description = 'Lounge de cócteles en Poblenou para disfrutar de buenos destilados, combinados y buena música.' where id = 220;
update public.clubs set description = 'Bar de karaoke con escenario tradicional, efectos de luz y un amplio catálogo de canciones.' where id = 221;
update public.clubs set description = 'Pub frente al mar en Badalona con terraza, mojitos, cócteles y ambiente nocturno.' where id = 223;
update public.clubs set description = 'Icónico bar musical de Badalona con copas, música en directo, dardos y ambiente acogedor.' where id = 224;
update public.clubs set description = 'Espacio de música en directo y coctelería en Badalona, con conciertos tributo y tardeos.' where id = 226;
update public.clubs set description = 'Discoteca al aire libre en Badalona con dos ambientes musicales y mucho ambiente de fiesta.' where id = 229;
update public.clubs set description = 'Salón de shisha en Badalona con horario de madrugada los fines de semana y acceso solo para adultos.' where id = 235;
update public.clubs set description = 'Lounge bar en L''Hospitalet centrado en música latina y baile.' where id = 238;
update public.clubs set description = 'Bar musical en L''Hospitalet con zona chill y noches de fiesta los fines de semana.' where id = 244;
update public.clubs set description = 'Discoteca de Cornellà con fiestas temáticas, shows y una gran pista de baile.' where id = 246;
update public.clubs set description = 'Pequeño espacio cultural y de conciertos en L''Hospitalet.' where id = 248;
update public.clubs set description = 'Lounge en Esplugues con shishas prémium, cócteles, música y ambiente chill.' where id = 250;
update public.clubs set description = 'Bar de Horta con ambiente de fiesta y pantallas para ver deporte.' where id = 251;
update public.clubs set description = 'Bar de Horta-Guinardó para tomar copas, tapas, con ambiente de pub de barrio.' where id = 253;
update public.clubs set description = 'Bar musical de Horta con aire brasileño, terraza y noches para bailar.' where id = 256;
update public.clubs set description = 'Bar arcade retro con máquinas de los 80 y 90, copas y música alternativa.' where id = 258;
update public.clubs set description = 'Coctelería de Sarrià-Sant Gervasi con rones venezolanos y destilados prémium.' where id = 261;
update public.clubs set description = 'Restaurante-club del Port Olímpic con terraza de playa y noches de lounge-club hasta tarde.' where id = 262;
update public.clubs set description = 'Coctelería y bar de shisha con mixología prémium, comida y ambiente con estilo.' where id = 263;
update public.clubs set description = 'Pequeño bar de copas en la calle Zaragoza para tomar algo y ver fútbol con amigos.' where id = 265;
update public.clubs set description = 'Lounge club con cócteles, mesas VIP, shisha y ambiente exclusivo.' where id = 266;
update public.clubs set description = 'Salón de shisha con cachimbas prémium, cócteles de autor y ambiente exclusivo.' where id = 273;

-- Verificación: debería salir 0 (ya no queda ninguna de las 34 fichas en inglés).
select count(*) as pendientes_en_ingles from public.clubs
where id in (27,29,37,54,55,58,61,211,212,213,216,217,220,221,223,224,226,229,235,238,244,246,248,250,251,253,256,258,261,262,263,265,266,273)
  and description ~ '^[A-Za-z0-9 .,''"&/-]+$' and description !~ '[áéíóúñÁÉÍÓÚÑ]'
  and description like '%the %' or description like '% and %' or description like '% with %';
