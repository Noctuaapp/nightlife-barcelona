-- =====================================================================================
-- Noctua · Planes de noche más difíciles de adivinar + candado real en noctua_review_author
-- 03/11/2026 (auditoría de seguridad)
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema. Todo o nada.
--
--  1) Planes de noche (create_night_plan)
--     · Los códigos nuevos pasan de 8 a 12 caracteres y salen de un generador seguro. Con 8
--       (4.300 millones de combinaciones) un robot podía probar códigos hasta dar con planes
--       ajenos; con 12 es inviable. Los planes ya creados siguen funcionando con su código de 8.
--     · Cada cuenta puede crear como mucho 20 planes al día (antes, ilimitados).
--     · Antes de cambiar nada comprueba que la tabla acepta códigos de 12; si no, se detiene y no
--       toca nada.
--     · Necesita el cambio de la web «src/app/plan/[code]/page.tsx» (acepta 8 a 12 caracteres en la
--       vista previa del enlace). Sin ese cambio todo funciona igual, salvo que el enlace compartido
--       enseña el título genérico en lugar del título del plan.
--
--  2) noctua_review_author
--     Debía devolver nombre y nivel solo de uno mismo, del admin o de tareas del servidor, pero la
--     comprobación «no viene de la web» miraba current_user, que dentro de una función security
--     definer siempre es el dueño: dejaba pasar a cualquiera. Ahora mira el rol de la sesión de
--     verdad (service_role o sin sesión, como en el SQL Editor). Quien escribe una opinión sigue
--     viendo su propio nombre, que es el único uso de la web.
-- =====================================================================================

-- 1) Planes de noche --------------------------------------------------------------------------

alter table public.night_plans add column if not exists created_at timestamptz not null default now();

-- ¿La tabla admite códigos de 12 caracteres? (La prueba se deshace sola.)
do $$
begin
  begin
    insert into public.night_plans (code, title, plan_date, stops, creator)
    values ('0123456789ab', 'prueba', current_date, '[]'::jsonb, null);
    raise exception 'deshacer prueba' using errcode = 'P0001';
  exception
    when check_violation or string_data_right_truncation then
      raise exception 'night_plans no admite códigos de 12 caracteres (%). No se ha cambiado nada.', sqlerrm;
    when others then
      null; -- la prueba se deshace aquí, o falla por algo que no tiene que ver con el código
  end;
end $$;

create or replace function public.create_night_plan(p_title text, p_plan_date date, p_stops jsonb)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  new_code text;
  tries int := 0;
begin
  if p_title is null or length(trim(p_title)) = 0 or length(p_title) > 80 then
    raise exception 'Titulo no valido';
  end if;
  if p_stops is null or jsonb_typeof(p_stops) <> 'array' or jsonb_array_length(p_stops) < 1 or jsonb_array_length(p_stops) > 8 then
    raise exception 'Paradas no validas';
  end if;
  if length(p_stops::text) > 8000 then
    raise exception 'Plan demasiado grande';
  end if;
  if (select count(*) from public.night_plans
      where creator = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Has creado demasiados planes hoy. Prueba mañana.';
  end if;

  loop
    new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    begin
      insert into public.night_plans (code, title, plan_date, stops, creator)
      values (new_code, trim(p_title), p_plan_date, p_stops, auth.uid());
      return new_code;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 5 then raise; end if;
    end;
  end loop;
end;
$function$;

-- 2) noctua_review_author ---------------------------------------------------------------------

create or replace function public.noctua_review_author(p_user uuid)
 returns table (author_name text, author_level text)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce(nullif(pr.username, ''), 'Usuario de Noctua'), to_jsonb(pr)->>'level_key'
  from public.profiles pr
  where pr.id = p_user
    and (p_user = auth.uid()
         or public.is_noctua_admin()
         or coalesce(auth.role(), 'service_role') = 'service_role')
$function$;

-- Comprobación: una fila con un JSON. Pégamela entera.
select jsonb_build_object(
  'codigos_de_12', pg_get_functiondef('public.create_night_plan(text,date,jsonb)'::regprocedure) ilike '%substr(replace(gen_random_uuid()::text%, 1, 12)%',
  'tope_de_20_al_dia', pg_get_functiondef('public.create_night_plan(text,date,jsonb)'::regprocedure) ilike '%>= 20%',
  'candado_autor_opiniones', pg_get_functiondef('public.noctua_review_author(uuid)'::regprocedure) ilike '%service_role%',
  'permisos', jsonb_build_object(
    'crear_plan_anon', has_function_privilege('anon', 'public.create_night_plan(text,date,jsonb)', 'execute'),
    'crear_plan_con_sesion', has_function_privilege('authenticated', 'public.create_night_plan(text,date,jsonb)', 'execute'),
    'autor_anon', has_function_privilege('anon', 'public.noctua_review_author(uuid)', 'execute'),
    'autor_con_sesion', has_function_privilege('authenticated', 'public.noctua_review_author(uuid)', 'execute')),
  'planes_guardados', (select count(*) from public.night_plans),
  'columna_created_at', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'night_plans' and column_name = 'created_at')
) as resultado;
