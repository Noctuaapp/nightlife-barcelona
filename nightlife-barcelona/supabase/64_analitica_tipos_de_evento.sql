-- =====================================================================================
-- Noctua · La analítica deja de descartar eventos · 01/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Problema: el trigger `analytics_guard` (el que filtra lo que llega del navegador) solo dejaba
-- pasar 11 tipos de evento y DESCARTABA el resto sin dar error. Todo lo que se añadió después a la
-- web se enviaba y se perdía: cambios de página (page_nav), embudo de registro (signup_*, join_*,
-- google_click), pestañas de la ficha, locales cercanos/parecidos, esenciales, instalación de la
-- app, taxi/VTC y TikTok (estos dos también faltaban en las estadísticas de los dueños).
--
-- Esto es la misma función de siempre (mismas protecciones: solo filtra lo que viene del navegador,
-- fecha puesta por el servidor, textos recortados, tope de 120 eventos en 10 min por sesión) con la
-- lista ampliada a todos los eventos que el código envía de verdad. Sigue siendo una lista cerrada:
-- un tipo inventado desde fuera se sigue descartando.
--
-- Lo que se perdió hasta hoy no se puede recuperar; los datos nuevos empiezan a contar desde ya.
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

-- Comprobación: debe devolver las 40 filas con "permitido = true".
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
  'essential_category', 'essential_open', 'essential_directions', 'essential_maps', 'essential_nearby'
]) as t
where pg_get_functiondef('public.analytics_guard()'::regprocedure) like '%''' || t || '''%';
