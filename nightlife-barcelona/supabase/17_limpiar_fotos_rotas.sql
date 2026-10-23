-- =====================================================================================
-- Noctua · Tanda K (limpia las fotos de galería rotas) · 23/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué arregla: el cron que trae fotos de Google (refresh-google-data y
-- refresh-events-google-data) no comprobaba si la descarga o la subida a Storage fallaban, y
-- guardaba la URL igualmente — de ahí las fotos "rotas" (icono de imagen caída) en la galería
-- del admin que viste en las capturas. Ya está corregido en el código (solo a partir de ahora
-- guarda la URL si la foto se descargó y subió de verdad), pero esto no arregla las que ya
-- quedaron guardadas rotas antes del arreglo.
--
-- Este SQL vacía la galería SOLO de los clubs/eventos que no has editado tú a mano
-- (manual_photos = false/null) — los que sí has tocado desde el admin se dejan intactos. En el
-- próximo paso del cron (automático, programado) esas galerías se rellenan otra vez, ya con el
-- código corregido, así que no hace falta hacer nada más después de esto.
-- =====================================================================================

update public.clubs
set gallery = null
where coalesce(manual_photos, false) = false
  and gallery is not null;

update public.events
set gallery = null
where coalesce(manual_photos, false) = false
  and gallery is not null;

-- Verificación: cuántas filas se han limpiado en cada tabla.
select
  (select count(*) from public.clubs where gallery is null and coalesce(manual_photos, false) = false) as clubs_sin_galeria,
  (select count(*) from public.events where gallery is null and coalesce(manual_photos, false) = false) as eventos_sin_galeria;
