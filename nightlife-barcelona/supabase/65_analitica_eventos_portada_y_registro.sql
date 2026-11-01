-- =====================================================================================
-- Noctua · Eventos nuevos de la portada, el registro y los favoritos · 01/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Sustituye a 64_analitica_tipos_de_evento.sql (incluye todo lo que tenía): si ya ejecutaste la
-- 64, ejecuta esta encima; si no, basta con esta.
--
-- Eventos nuevos:
--   zone_pick         → elige una zona (o «Cerca de mí») en «Esta noche» de la portada
--   home_tile_click   → abre un local desde una tarjeta de la portada (meta.section)
--   auth_gate_view    → sale el aviso de registro al intentar guardar un favorito sin cuenta
--   banner_click      → pulsa «Crear cuenta» en la franja general de arriba
--   banner_dismiss    → cierra esa franja
-- (favorite_click ya estaba permitido, pero la web no lo enviaba: ahora sí, al guardar un local;
-- es el «Guardar» de las estadísticas de los dueños.)
-- Sigue siendo una lista cerrada: un tipo inventado desde fuera se sigue descartando.
-- Al añadir un evento nuevo en el código hay que añadirlo aquí también: el test
-- src/lib/__tests__/analyticsEvents.test.ts avisa si falta.
-- =====================================================================================

create or replace function public.analytics_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  -- Solo filtra lo que llega del navegador (anon / authenticated). El servidor y el editor SQL pasan.
  if caller_role is null or caller_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.event_type is null or new.event_type not in (
    -- visita y recorrido
    'session_start', 'page_nav', 'page_view', 'search', 'filter_used',
    -- clics en la ficha de un local o evento
    'tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
    'share_click', 'favorite_click', 'phone_click', 'ride_click',
    'tab_open', 'nearby_click', 'related_click', 'next_click', 'top_pick_click', 'welcome_click',
    -- aviso de registro y registro
    'join_view', 'join_click', 'join_dismiss',
    'signup_view', 'signup_email_open', 'signup_submit', 'signup_ok', 'signup_error', 'google_click',
    'confirm_age_view', 'confirm_age_done',
    -- app instalada y encuesta del día
    'install_click', 'install_choice', 'app_installed', 'party_poll_vote',
    -- portada, aviso de registro de favoritos y franja general de «Crear cuenta»
    'zone_pick', 'home_tile_click', 'auth_gate_view', 'banner_click', 'banner_dismiss',
    -- esenciales
    'essential_category', 'essential_open', 'essential_directions', 'essential_maps', 'essential_nearby'
  ) then
    return null; -- se descarta sin dar error
  end if;

  new.created_at := now();                       -- nada de fechas inventadas
  new.item_name := left(new.item_name, 200);
  new.path := left(new.path, 200);
  new.source := left(new.source, 60);
  new.device := left(new.device, 20);
  new.locale := left(new.locale, 10);
  new.session_id := left(new.session_id, 64);
  if new.meta is not null and length(new.meta::text) > 2000 then
    new.meta := null;
  end if;

  -- Más de 120 eventos en 10 minutos desde la misma sesión/usuario = no es una persona.
  if (new.session_id is not null or new.user_id is not null)
     and public.analytics_recent_count(new.session_id, new.user_id) >= 120 then
    return null;
  end if;

  return new;
end $function$;

-- Comprobación: debe devolver las 45 filas con "permitido = true".
select t as tipo_de_evento, true as permitido
from unnest(array[
  'session_start', 'page_nav', 'page_view', 'search', 'filter_used',
  'tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
  'share_click', 'favorite_click', 'phone_click', 'ride_click',
  'tab_open', 'nearby_click', 'related_click', 'next_click', 'top_pick_click', 'welcome_click',
  'join_view', 'join_click', 'join_dismiss',
  'signup_view', 'signup_email_open', 'signup_submit', 'signup_ok', 'signup_error', 'google_click',
  'confirm_age_view', 'confirm_age_done',
  'install_click', 'install_choice', 'app_installed', 'party_poll_vote',
  'zone_pick', 'home_tile_click', 'auth_gate_view', 'banner_click', 'banner_dismiss',
  'essential_category', 'essential_open', 'essential_directions', 'essential_maps', 'essential_nearby'
]) as t
where pg_get_functiondef('public.analytics_guard()'::regprocedure) like '%''' || t || '''%';
