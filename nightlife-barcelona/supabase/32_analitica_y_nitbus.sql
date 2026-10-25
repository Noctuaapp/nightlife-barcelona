-- =====================================================================================
-- Noctua · La analítica no cuenta lo que hace el admin + paradas de Nitbus · 25/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Desde esta versión de la web, nada de lo que hace info@noctuaapp.com se registra (ni búsquedas,
-- ni clicks, ni visitas), y su navegador tampoco cuenta aunque entre sin sesión. Esto borra lo que
-- ya se había registrado: todo lo hecho con la cuenta de admin y también lo de esas mismas visitas
-- antes de iniciar sesión (mismo session_id).
-- =====================================================================================

-- Paradas de Nitbus importadas de OpenStreetMap (Ajustes y herramientas › "Cargar paradas de
-- Nitbus"): se marcan con import_source = 'osm' para poder reemplazarlas en cada importación sin
-- tocar las que hayas creado tú a mano.
alter table public.essentials add column if not exists import_source text;
create index if not exists essentials_category_idx on public.essentials (category);

-- Analítica: borrar lo que ya se había registrado del admin (al final, para que se vea el resultado).
with admin_users as (
  select id from auth.users where lower(email) = 'info@noctuaapp.com'
),
admin_sessions as (
  select distinct session_id
  from public.analytics
  where user_id in (select id from admin_users) and session_id is not null
),
deleted as (
  delete from public.analytics
  where user_id in (select id from admin_users)
     or session_id in (select session_id from admin_sessions)
  returning 1
)
select count(*) as filas_borradas from deleted;
