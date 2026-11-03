-- =====================================================================================
-- Noctua · Límites en las subidas de fotos · 02/11/2026 (auditoría de seguridad)
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Hasta ahora los buckets públicos de fotos aceptaban cualquier tipo de archivo y de cualquier
-- tamaño (el único control era el del navegador: accept="image/*", que se salta con una petición
-- a mano). Con esto es Supabase quien lo exige, suba quien suba (admin, dueño o un usuario):
--   · solo imágenes: JPEG, PNG, WebP, GIF, AVIF y HEIC/HEIF (fotos de iPhone). Sin SVG ni HTML;
--   · como mucho 15 MB por archivo (una foto de móvil pesa 3–12 MB; la web ya reduce a ~0,5 MB las
--     que sube el admin).
-- No toca lo ya subido: solo afecta a las subidas nuevas.
-- Si en algún bucket subes algo que no sea imagen (un PDF, un vídeo), sácalo de la lista de abajo.
-- =====================================================================================

update storage.buckets
set file_size_limit = 15 * 1024 * 1024,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'
    ]
where id in (
  'club-images', 'club-photos', 'event-images', 'event-photos',
  'essential-images', 'essential-photos', 'avatars'
);

-- Comprobación: cada bucket debe salir con max_mb = 15 y la lista de tipos.
select id, public, round(file_size_limit / 1048576.0) as max_mb, allowed_mime_types
from storage.buckets
order by id;
