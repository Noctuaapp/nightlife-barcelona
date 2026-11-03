-- =====================================================================================
-- Noctua · Cierre de agujeros encontrados en la auditoría de seguridad · 03/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema. Todo o nada: si algo
-- falla, no se aplica nada.
--
-- Qué arregla (todo salió de leer la base de datos real con los diagnósticos 75 y 76):
--
--  1) profiles · un usuario podía darse a sí mismo nivel «elite» y canjear las ventajas de ese
--     nivel en los locales, o quitarse un bloqueo temporal/permanente.
--     protect_profile_columns protegía una columna llamada «level» que no existe; las de verdad son
--     level_key y level_since. Y blocked_until (la fecha que usa is_blocked_user()) y member_since
--     no estaban protegidas. Ahora lo están, al crear el perfil y al editarlo.
--     El admin y las funciones de Postgres (recompute_level, award_xp...) siguen pudiendo.
--     La web no escribe esas columnas, solo las lee, así que no cambia nada visible.
--
--  2) Fotos de esenciales · cualquier cuenta con sesión podía subir y SOBRESCRIBIR fotos en el
--     bucket essential-photos (las del cron de Google), porque las reglas de club/evento exigen ser
--     admin o dueño pero esas dos no. Se quitan: el cron usa la clave de servicio, que no depende
--     de estas reglas, y la subida manual del admin va a essential-images, que ya es solo admin.
--
--  3) club_checkins · un usuario podía editar de su propio check-in el club, la fecha, la hora y la
--     distancia (para inflar «gente ahora» o los retos). Ahora solo puede cambiar la nota; la hora
--     de la nota la pone el servidor.
--
--  4) site_feedback (opiniones sin cuenta) · aceptaba cualquier texto, de cualquier tamaño, a nombre
--     de cualquier usuario, sin límite. Ahora: comentario hasta 500 letras (lo mismo que ya recorta
--     la web), página hasta 2000, el usuario solo puede ser él mismo (o nadie) y un tope de 60
--     opiniones por hora en total para que un robot no llene la tabla ni te inunde de avisos.
--
-- Lo que NO toca a propósito: los votos de la encuesta sin cuenta y la analítica siguen abiertos
-- (lo dejaste escrito en el SQL 53: es un juego y un contador). Si se llenan de falsos, los borras
-- desde admin.
-- =====================================================================================

-- 1) profiles ---------------------------------------------------------------------------------

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  safe jsonb;
begin
  if current_user in ('anon', 'authenticated') and not public.is_noctua_admin() then
    if tg_op = 'INSERT' then
      -- Un perfil nuevo empieza de cero: sin XP, sin bloqueo, nivel inicial y fecha de hoy.
      safe := jsonb_build_object(
        'xp', 0,
        'is_blocked', false, 'block_reason', null, 'block_note', null, 'blocked_at', null, 'blocked_until', null,
        'level_since', now(), 'member_since', now()
      );
      -- El nivel solo puede venir vacío o ser el primero; cualquier otro se descarta.
      if coalesce(to_jsonb(new)->>'level_key', '') not in ('', 'bronce') then
        safe := safe || jsonb_build_object('level_key', null);
      end if;
    else
      -- Al editar, todo lo que tiene que ver con XP, nivel y bloqueo vuelve a su valor anterior.
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into safe
      from jsonb_each(to_jsonb(old))
      where key like 'xp%'
         or key in ('is_blocked', 'level', 'level_key', 'level_since', 'member_since',
                    'block_reason', 'block_note', 'blocked_at', 'blocked_until');
    end if;
    new := jsonb_populate_record(new, safe);
  end if;
  return new;
end $function$;

-- 2) Fotos de esenciales ----------------------------------------------------------------------

drop policy if exists "authenticated can upload essential photos" on storage.objects;
drop policy if exists "authenticated can update essential photos" on storage.objects;

-- 3) club_checkins ----------------------------------------------------------------------------

create or replace function public.protect_checkin_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if current_user in ('anon', 'authenticated') and not public.is_noctua_admin() then
    new.id := old.id;
    new.user_id := old.user_id;
    new.club_id := old.club_id;
    new.checkin_date := old.checkin_date;
    new.created_at := old.created_at;
    new.distance_m := old.distance_m;
    new.accuracy_m := old.accuracy_m;
    -- La hora de la nota la pone el servidor: se actualiza solo si la nota cambia.
    if new.note is distinct from old.note then
      new.note_created_at := case when new.note is null then null else now() end;
    else
      new.note_created_at := old.note_created_at;
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists protect_checkin_columns_trg on public.club_checkins;
create trigger protect_checkin_columns_trg
  before update on public.club_checkins
  for each row execute function public.protect_checkin_columns();

-- 4) site_feedback ----------------------------------------------------------------------------

drop policy if exists "Opinar" on public.site_feedback;
create policy "Opinar" on public.site_feedback
  as permissive for insert to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and (comment is null or char_length(comment) <= 500)
    and (page is null or char_length(page) <= 2000)
  );

create or replace function public.site_feedback_throttle()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if (select count(*) from public.site_feedback where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Demasiadas opiniones seguidas. Inténtalo dentro de un rato.';
  end if;
  return new;
end $function$;

revoke all on function public.site_feedback_throttle() from public, anon, authenticated;

drop trigger if exists site_feedback_throttle_trg on public.site_feedback;
create trigger site_feedback_throttle_trg
  before insert on public.site_feedback
  for each row execute function public.site_feedback_throttle();

-- Comprobación: una fila con un JSON. Pégamela entera.
select jsonb_build_object(
  'perfiles_protege_nivel_y_bloqueo', (
    select pg_get_functiondef('public.protect_profile_columns()'::regprocedure) ilike '%blocked_until%'
       and pg_get_functiondef('public.protect_profile_columns()'::regprocedure) ilike '%level_key%'),
  'reglas_que_quedan_en_essential_photos', (
    select coalesce(jsonb_agg(policyname order by policyname), '[]'::jsonb)
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%essential-photos%' or coalesce(with_check, '') ilike '%essential-photos%')),
  'disparadores_checkins', (
    select coalesce(jsonb_agg(tgname order by tgname), '[]'::jsonb)
    from pg_trigger where tgrelid = 'public.club_checkins'::regclass and not tgisinternal),
  'disparadores_opiniones', (
    select coalesce(jsonb_agg(tgname order by tgname), '[]'::jsonb)
    from pg_trigger where tgrelid = 'public.site_feedback'::regclass and not tgisinternal),
  'regla_opinar', (
    select with_check from pg_policies
    where schemaname = 'public' and tablename = 'site_feedback' and policyname = 'Opinar'),
  -- Para la última ronda: cómo se dan los puntos y cómo se protege la nota.
  'grant_xp', (
    select pg_get_functiondef(p.oid) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = '_grant_xp' limit 1),
  'guarda_de_nota', (
    select pg_get_functiondef(t.tgfoid) from pg_trigger t
    where t.tgrelid = 'public.club_checkins'::regclass and t.tgname = 'checkin_note_guard_trg' limit 1)
) as resultado;
