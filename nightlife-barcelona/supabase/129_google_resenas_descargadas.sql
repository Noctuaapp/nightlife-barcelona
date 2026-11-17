-- =====================================================================================
-- Noctua · Marca de «reseñas de Google ya descargadas» en cada club · 17/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Añade clubs.google_reviews_at: la fecha en que el cron de Google bajó las reseñas de ese club. Sirve para que, con
-- GOOGLE_PLACES_FETCH_REVIEWS activada en Vercel, cada club pague esa llamada una sola vez y no en cada vuelta.
-- No cambia ningún dato ni lo que ve el público. Mientras no se active la variable en Vercel, no pasa nada más.
-- =====================================================================================

alter table public.clubs add column if not exists google_reviews_at timestamptz;

-- Comprobación: debe salir ok = true.
select jsonb_build_object(
  'ok', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clubs' and column_name = 'google_reviews_at'
  )
) as resultado;
