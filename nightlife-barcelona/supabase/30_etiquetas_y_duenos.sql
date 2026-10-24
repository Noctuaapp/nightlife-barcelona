-- =====================================================================================
-- Noctua · Etiquetas nuevas + los dueños editan su ficha desde la propia página · 25/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- 1) Nueve etiquetas nuevas para los locales (todas empiezan desactivadas):
--    máquina de tabaco, dardos, karaoke, música en directo, pista de baile, guardarropa,
--    comida/cocina, shisha y accesible en silla de ruedas.
--
-- 2) El dueño vinculado a un club (clubs.owner_user_id) o a un evento (events.owner_user_id) puede
--    editar SU ficha desde la página pública igual que el admin: textos, fotos, galería, sesiones,
--    noches y etiquetas. Solo la suya. Y sigue sin poder tocar lo que decide Noctua (verificado,
--    tendencia, valoración, dueño, datos de Google): eso ya lo bloquea el trigger de 3_seguridad.sql.
--    Estas reglas se SUMAN a las que ya tengas (no quitan ninguna).
--
-- 3) Fotos de clubs y eventos: solo el admin o el dueño de esa ficha pueden subirlas.
-- =====================================================================================

-- 1) Etiquetas -----------------------------------------------------------------------
alter table public.clubs add column if not exists cigarette_machine boolean not null default false;
alter table public.clubs add column if not exists darts boolean not null default false;
alter table public.clubs add column if not exists karaoke boolean not null default false;
alter table public.clubs add column if not exists live_music boolean not null default false;
alter table public.clubs add column if not exists dance_floor boolean not null default false;
alter table public.clubs add column if not exists cloakroom boolean not null default false;
alter table public.clubs add column if not exists food boolean not null default false;
alter table public.clubs add column if not exists shisha boolean not null default false;
alter table public.clubs add column if not exists wheelchair_accessible boolean not null default false;

-- Punto de partida razonable: los karaokes llevan la etiqueta karaoke, y los locales con "shisha"
-- en el nombre, la de shisha. El resto, a mano desde la ficha.
update public.clubs set karaoke = true
where not karaoke and (venue_type = 'Karaoke' or name ilike '%karaoke%' or music ilike '%karaoke%');
update public.clubs set shisha = true
where not shisha and (name ilike '%shisha%' or name ilike '%hookah%' or name ilike '%cachimba%');

-- 2) Dueños --------------------------------------------------------------------------
-- Su club
drop policy if exists "Dueño edita su club" on public.clubs;
create policy "Dueño edita su club" on public.clubs
for update to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- Las noches de su club
drop policy if exists "Dueño edita las noches de su club" on public.club_events;
create policy "Dueño edita las noches de su club" on public.club_events
for update to authenticated
using (exists (select 1 from public.clubs c where c.id = club_events.club_id and c.owner_user_id = auth.uid()))
with check (exists (select 1 from public.clubs c where c.id = club_events.club_id and c.owner_user_id = auth.uid()));

-- Las sesiones semanales de su club (si la tabla existe)
do $$
begin
  if to_regclass('public.club_sessions') is not null then
    execute 'drop policy if exists "Dueño edita las sesiones de su club" on public.club_sessions';
    execute $p$
      create policy "Dueño edita las sesiones de su club" on public.club_sessions
      for update to authenticated
      using (exists (select 1 from public.clubs c where c.id = club_sessions.club_id and c.owner_user_id = auth.uid()))
      with check (exists (select 1 from public.clubs c where c.id = club_sessions.club_id and c.owner_user_id = auth.uid()))
    $p$;
  end if;
end $$;

-- Su evento / festival
drop policy if exists "Organizador edita su evento" on public.events;
create policy "Organizador edita su evento" on public.events
for update to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

-- 3) Fotos: NADIE salvo el admin y el dueño de esa ficha puede subir, cambiar o borrar fotos de
--    clubs y eventos. Cada foto se guarda en una carpeta con el nombre de su ficha:
--      club/<id>/...  event/<id>/...  club_event/<id>/...  club_session/<id>/...
--      organizer/<id de usuario>/...  (fotos de un festival nuevo, desde /mi-festival)
--    y la base de datos comprueba que quien sube es el dueño de esa ficha. Las reglas "restrictivas"
--    se aplican SIEMPRE, aunque haya otras reglas antiguas más permisivas en el almacenamiento.
--    Las tareas automáticas del servidor (fotos de Google) no se ven afectadas.
create or replace function public.noctua_can_upload(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[] := string_to_array(coalesce(p_path, ''), '/');
  kind text;
  ref text;
  uid uuid := auth.uid();
begin
  if public.is_noctua_admin() then
    return true;
  end if;
  if uid is null or coalesce(array_length(parts, 1), 0) < 3 then
    return false;
  end if;
  kind := parts[1];
  ref := parts[2];

  if kind = 'organizer' then
    -- Solo organizadores que Noctua ya ha vinculado a algún evento, y solo en su propia carpeta.
    return ref = uid::text and exists (select 1 from public.events where owner_user_id = uid);
  end if;

  if ref !~ '^[0-9]+$' then
    return false;
  end if;

  if kind = 'club' then
    return exists (select 1 from public.clubs where id = ref::bigint and owner_user_id = uid);
  elsif kind = 'event' then
    return exists (select 1 from public.events where id = ref::bigint and owner_user_id = uid);
  elsif kind = 'club_event' then
    return exists (
      select 1 from public.club_events ce join public.clubs c on c.id = ce.club_id
      where ce.id = ref::bigint and c.owner_user_id = uid
    );
  elsif kind = 'club_session' and to_regclass('public.club_sessions') is not null then
    return exists (
      select 1 from public.club_sessions cs join public.clubs c on c.id = cs.club_id
      where cs.id = ref::bigint and c.owner_user_id = uid
    );
  end if;
  return false;
end $$;

drop policy if exists "Usuarios con sesión suben fotos de fichas" on storage.objects;

drop policy if exists "Fotos de fichas: subir admin o dueño" on storage.objects;
create policy "Fotos de fichas: subir admin o dueño" on storage.objects
for insert to authenticated
with check (bucket_id in ('club-images', 'club-photos', 'event-images', 'event-photos') and public.noctua_can_upload(name));

drop policy if exists "Fotos de fichas: solo admin o dueño (subir)" on storage.objects;
create policy "Fotos de fichas: solo admin o dueño (subir)" on storage.objects
as restrictive for insert
with check (bucket_id not in ('club-images', 'club-photos', 'event-images', 'event-photos') or public.noctua_can_upload(name));

drop policy if exists "Fotos de fichas: solo admin o dueño (cambiar)" on storage.objects;
create policy "Fotos de fichas: solo admin o dueño (cambiar)" on storage.objects
as restrictive for update
using (bucket_id not in ('club-images', 'club-photos', 'event-images', 'event-photos') or public.noctua_can_upload(name))
with check (bucket_id not in ('club-images', 'club-photos', 'event-images', 'event-photos') or public.noctua_can_upload(name));

drop policy if exists "Fotos de fichas: solo admin o dueño (borrar)" on storage.objects;
create policy "Fotos de fichas: solo admin o dueño (borrar)" on storage.objects
as restrictive for delete
using (bucket_id not in ('club-images', 'club-photos', 'event-images', 'event-photos') or public.noctua_can_upload(name));

-- Comprobación: las columnas nuevas y las reglas creadas.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'clubs'
  and column_name in ('cigarette_machine', 'darts', 'karaoke', 'live_music', 'dance_floor', 'cloakroom', 'food', 'shisha', 'wheelchair_accessible')
order by column_name;
