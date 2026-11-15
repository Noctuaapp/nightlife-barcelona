-- =====================================================================================
-- Noctua · Eventos del plan en grupo (crear, votar, apuntarse) · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Sustituye a 84_clics_y_tiempo.sql en lo que toca a analytics_guard (copia su lista entera y añade
-- cuatro tipos). Es la misma función con la misma lógica: solo cambia la lista de tipos permitidos.
--
-- Eventos nuevos:
--   plan_create       → una cuenta crea y comparte un plan de noche (meta.stops = nº de paradas)
--   plan_poll_create  → una cuenta crea una votación entre sitios (meta.options = nº de sitios)
--   plan_poll_vote    → alguien vota (con o sin cuenta; meta.changed = true si cambia su voto)
--   plan_rsvp         → alguien se apunta a un plan (sin cuenta)
-- Con ellos se mide el bucle entero: crea → los amigos abren el enlace (page_view de /plan/…) →
-- votan o se apuntan. Sigue siendo una lista cerrada: un tipo inventado desde fuera se descarta.
-- El test src/lib/__tests__/analyticsEvents.test.ts avisa si el código envía un tipo que falte aquí.
--
-- Para deshacerlo: vuelve a ejecutar la 84 (deja la lista como estaba). Los eventos ya guardados
-- se quedan, solo dejarían de llegar los nuevos.
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
    'essential_category', 'essential_open', 'essential_directions', 'essential_maps', 'essential_nearby',
    -- tiempo que se queda en cada página (segundos con la pestaña a la vista, en meta)
    'page_time',
    -- planes en grupo: crear un plan o una votación, votar y apuntarse (sin cuenta)
    'plan_create', 'plan_poll_create', 'plan_poll_vote', 'plan_rsvp'
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

-- Comprobación: debe salir ok = true en los cuatro tipos nuevos y en los de antes. Pégamela entera.
select jsonb_build_object(
  'ok', bool_and(pg_get_functiondef('public.analytics_guard()'::regprocedure) like '%''' || t || '''%'),
  'tipos_comprobados', count(*),
  'faltan', coalesce(jsonb_agg(t) filter (where pg_get_functiondef('public.analytics_guard()'::regprocedure) not like '%''' || t || '''%'), '[]'::jsonb)
) as resultado
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
  'essential_category', 'essential_open', 'essential_directions', 'essential_maps', 'essential_nearby',
  'page_time',
  'plan_create', 'plan_poll_create', 'plan_poll_vote', 'plan_rsvp'
]) as t;
