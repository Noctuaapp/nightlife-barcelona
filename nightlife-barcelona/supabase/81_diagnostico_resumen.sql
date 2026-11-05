-- =====================================================================================
-- Noctua · Diagnóstico de las cifras del Resumen de admin · 05/11/2026
-- Ejecutar en Supabase › SQL Editor. NO cambia nada: solo lee.
-- Ejecuta cada consulta por separado (selecciónala y pulsa Run) y pásame los resultados.
--
-- Qué se comprueba (lo que ves en Admin › Resumen):
--   · «Clics en entradas» sale 0.
--   · «Usuarios registrados» dice «2 nuevos y 4 activos esta semana».
-- =====================================================================================

-- 1) Clics en entradas de verdad en los últimos 7 días (con el nombre que usa la web)
select count(*) as clics_entradas_7d
from public.analytics
where event_type = 'tickets_click'
  and created_at >= now() - interval '7 days';

-- 2) Qué tipos de evento hay y cuántos, últimos 7 días (para ver si hay algún nombre antiguo)
select event_type, count(*) as veces
from public.analytics
where created_at >= now() - interval '7 days'
group by event_type
order by veces desc;

-- 3) Cuentas creadas en los últimos 7 días (con fecha)
select id, email, created_at, last_sign_in_at
from auth.users
where created_at >= now() - interval '7 days'
order by created_at desc;

-- 4) Cuentas con actividad registrada en la web en los últimos 7 días
select count(distinct user_id) as cuentas_activas_7d
from public.analytics
where user_id is not null
  and created_at >= now() - interval '7 days';

-- 5) Cuentas que han iniciado sesión (último acceso) en los últimos 7 días
--    (esto es lo que usaba el Resumen hasta ahora para «activos»)
select count(*) as con_ultimo_acceso_7d
from auth.users
where last_sign_in_at >= now() - interval '7 days';

-- 6) Cómo cuenta «entradas» la función del Resumen (para ver si busca un nombre distinto)
select pg_get_functiondef(p.oid) as definicion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'admin_data_overview';
