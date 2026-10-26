-- =====================================================================================
-- Noctua · Quitar de la analítica las visitas de pruebas · 26/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Desde esta versión, la web solo registra visitas en www.noctuaapp.com: lo que haces en tu
-- ordenador con "npm run dev" (localhost) o en las versiones de prueba de Vercel ya no cuenta.
-- Esto borra lo que ya se había colado de ahí (todas las visitas de esas mismas sesiones).
-- =====================================================================================

with test_sessions as (
  select distinct session_id from public.analytics
  where session_id is not null
    and (source ilike 'other:localhost%' or source ilike 'other:127.0.0.1%' or source ilike 'other:%vercel.app%')
),
deleted as (
  delete from public.analytics
  where source ilike 'other:localhost%' or source ilike 'other:127.0.0.1%' or source ilike 'other:%vercel.app%'
     or session_id in (select session_id from test_sessions)
  returning 1
)
select count(*) as filas_borradas from deleted;
