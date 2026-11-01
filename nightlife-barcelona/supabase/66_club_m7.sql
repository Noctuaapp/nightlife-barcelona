-- =====================================================================================
-- Noctua · Nuevo local: M7 (The Club M7) · 01/11/2026
-- Ejecutar entero en Supabase › SQL Editor DESPUÉS de 28_locales_repetidos.sql (usa su función
-- de nombre limpio). Se puede repetir sin problema: no crea nada que ya exista con el mismo
-- nombre (sin contar tildes, mayúsculas ni "club/the...").
--
-- Datos: Time Out Barcelona (dirección, estilo, descripción), Discotech (capacidad y ambiente) y
-- Viberate (Instagram). El horario NO se rellena a propósito: Time Out dice «jueves a domingo, de 18
-- a 6 h», pero las sesiones en Xceed/Discotech empiezan a las 23:59, y con el horario equivocado la
-- ficha diría «abierto ahora» a las 18:00. Ponlo tú en Admin › Clubs › M7 › Horario.
--
-- Después, en Ajustes y herramientas, pasa estas tres (en este orden) para que tenga mapa, foto y
-- datos de Google: "Poner coordenadas a clubs sin ubicación", "Asignar ficha de Google a clubs
-- nuevos" y "Actualizar datos de Google (clubs)".
-- =====================================================================================

-- Slug igual que createSlug() de la web (src/lib/slug.ts); ya existe si pasaste la 29, pero así este
-- archivo funciona solo.
create or replace function public.noctua_make_slug(p text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    translate(lower(coalesce(p, '')), 'áàäâãéèëêíìïîóòöôõúùüûñçł·''’', 'aaaaaeeeeiiiiooooouuuuncl   '),
    '[^a-z0-9]+', '-', 'g'))
$$;

insert into public.clubs (name, slug, address, neighborhood, city, venue_type, music, hours, description, hidden)
select 'M7', public.noctua_make_slug('M7'),
       'Carrer de Mèxic, 7, 08004 Barcelona', 'Poble-sec', 'Barcelona', 'Discoteca', 'Electrónica',
       null,
       'Club de música electrónica en Poble-sec, a dos pasos de Plaça Espanya, de aire underground: paredes oscuras, '
       || 'buen sistema de sonido y sesiones de DJs locales e internacionales. No pinchan música comercial.',
       false
where not exists (
  select 1 from public.clubs c
  where public.noctua_norm_venue_name(c.name) in (public.noctua_norm_venue_name('M7'), public.noctua_norm_venue_name('The Club M7'), public.noctua_norm_venue_name('M7 Club'))
);

-- Instagram, solo si la tabla tiene la columna y el local aún no tiene uno.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clubs' and column_name = 'instagram') then
    update public.clubs set instagram = 'https://www.instagram.com/TheClubM7/'
    where slug = 'm7' and (instagram is null or instagram = '');
  end if;
end $$;

select id, name, slug, neighborhood, hidden, hours from public.clubs
where public.noctua_norm_venue_name(name) in (public.noctua_norm_venue_name('M7'), public.noctua_norm_venue_name('The Club M7'), public.noctua_norm_venue_name('M7 Club'));
