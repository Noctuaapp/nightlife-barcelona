-- =====================================================================================
-- Noctua · Racha diaria de inicios de sesión (XP) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Columnas nuevas en profiles para la racha diaria de login (distinta de la racha semanal que
-- ya existía con "streak_week"): login_streak_days guarda cuántos días seguidos lleva entrando
-- la persona, y last_login_date el último día (hora de Madrid) que ya se le contó, para no sumar
-- la racha dos veces el mismo día. Las actualiza el cliente (Header.tsx) con el service normal
-- de usuario autenticado — no hace falta ninguna política RLS nueva, ya existe la de "el usuario
-- puede actualizar su propio profile".
-- =====================================================================================

alter table public.profiles add column if not exists login_streak_days integer not null default 0;
alter table public.profiles add column if not exists last_login_date date;

-- Comprobación: las dos columnas deberían existir ahora.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name in ('login_streak_days', 'last_login_date');
