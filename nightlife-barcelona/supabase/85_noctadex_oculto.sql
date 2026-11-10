-- =====================================================================================
-- Noctua · Noctadex oculto en la cuenta · 10/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- El Noctadex (el registro de locales con check-in del perfil) se puede ocultar y volver a mostrar. Hasta ahora
-- esa elección se guardaba solo en el dispositivo; con esta columna se guarda en la cuenta y la persona
-- la ve igual en el móvil, en el ordenador o si borra los datos del navegador.
--
-- No hace falta ninguna política nueva: es una columna más de profiles y la persona ya puede editar su propia
-- fila. El trigger protect_profile_columns (SQL 77) solo restaura XP, nivel y bloqueo, así que no la toca.
-- Mientras la columna no exista, la web sigue funcionando y recuerda la elección en el dispositivo.
-- =====================================================================================

alter table public.profiles add column if not exists hide_checkin_dex boolean not null default false;

-- Comprobación: debe salir la columna, de tipo boolean y por defecto false.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'hide_checkin_dex';
