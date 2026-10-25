-- =====================================================================================
-- Noctua · Redes sociales de cada local y evento · 25/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Columnas para Instagram, TikTok y web en clubs y eventos. Se rellenan desde la propia ficha
-- (el admin y el dueño vinculado ven los campos debajo del botón «Síguelos»): vale "@usuario"
-- o el enlace entero. Si alguna columna ya existía, no se toca.
-- =====================================================================================

alter table public.clubs add column if not exists instagram text;
alter table public.clubs add column if not exists tiktok text;
alter table public.clubs add column if not exists website text;

alter table public.events add column if not exists instagram text;
alter table public.events add column if not exists tiktok text;
alter table public.events add column if not exists website text;

-- Web de Neo Caja Negra (por si el SQL 39 no la pudo poner porque aún no existía la columna).
update public.clubs set website = 'https://neocajanegra.com/'
where name = 'Neo Caja Negra' and (website is null or website = '');

select table_name, column_name from information_schema.columns
where table_schema = 'public' and table_name in ('clubs', 'events') and column_name in ('instagram', 'tiktok', 'website')
order by table_name, column_name;
