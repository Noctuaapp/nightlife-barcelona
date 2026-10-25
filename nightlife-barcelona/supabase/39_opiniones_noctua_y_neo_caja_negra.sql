-- =====================================================================================
-- Noctua · Opiniones de usuarios de Noctua + Neo Caja Negra + etiquetas Partidos en TV y Ambiente hot · 25/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 38). Se puede repetir sin problema.
--
-- 1) Opiniones propias de Noctua en cada club y evento (pestaña «Opiniones» de la ficha):
--      · Hay que tener cuenta. Una opinión por persona y local (se puede editar o borrar).
--      · De 1 a 5 estrellas + texto opcional (máx. 800 caracteres).
--      · El dueño vinculado NO puede opinar de su propio local.
--      · Máximo 10 opiniones al día por persona (contra el spam).
--      · Se puede denunciar una opinión; con 3 denuncias se oculta sola hasta que la revises.
--      · Te llega un aviso en Admin › Avisos por cada opinión nueva y por cada denuncia.
--      · El nombre y el nivel del autor se guardan en la propia opinión, así no hace falta
--        abrir la tabla de perfiles a todo el mundo.
--
-- 2) Añade Neo Caja Negra (Carrer del Torrent de l'Olla, 121, Gràcia), si no existe ya.
--
-- 3) Etiquetas nuevas: «Partidos en TV» (sports_tv), para los que ponen fútbol y deportes, y
--    «Ambiente hot» (hot_shows), para los que hacen striptease y shows para adultos.
-- =====================================================================================

-- 1) Opiniones ------------------------------------------------------------------------
create table if not exists public.venue_reviews (
  id bigint generated always as identity primary key,
  venue_type text not null check (venue_type in ('club', 'event')),
  venue_id bigint not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 800),
  author_name text,
  author_level text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_type, venue_id, user_id)
);
create index if not exists venue_reviews_venue_idx on public.venue_reviews (venue_type, venue_id, created_at desc);

alter table public.venue_reviews enable row level security;

drop policy if exists "Opiniones: leer" on public.venue_reviews;
create policy "Opiniones: leer" on public.venue_reviews
  for select to anon, authenticated
  using (hidden = false or user_id = auth.uid() or public.is_noctua_admin());
drop policy if exists "Opiniones: escribir la mía" on public.venue_reviews;
create policy "Opiniones: escribir la mía" on public.venue_reviews
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Opiniones: editar la mía" on public.venue_reviews;
create policy "Opiniones: editar la mía" on public.venue_reviews
  for update to authenticated
  using (user_id = auth.uid() or public.is_noctua_admin())
  with check (user_id = auth.uid() or public.is_noctua_admin());
drop policy if exists "Opiniones: borrar la mía" on public.venue_reviews;
create policy "Opiniones: borrar la mía" on public.venue_reviews
  for delete to authenticated using (user_id = auth.uid() or public.is_noctua_admin());

-- Nombre y nivel del autor (lee perfiles con permisos propios, solo esos dos datos).
create or replace function public.noctua_review_author(p_user uuid)
returns table (author_name text, author_level text)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(pr.username, ''), 'Usuario de Noctua'), to_jsonb(pr)->>'level_key'
  from public.profiles pr
  where pr.id = p_user and (p_user = auth.uid() or public.is_noctua_admin() or current_user not in ('anon', 'authenticated'))
$$;
revoke all on function public.noctua_review_author(uuid) from public, anon;
grant execute on function public.noctua_review_author(uuid) to authenticated;

-- Antes de guardar: autor, nivel, límites y campos que solo decide Noctua. (Se ejecuta con los
-- permisos de quien escribe, para saber si viene de la web o del admin.)
create or replace function public.noctua_review_before()
returns trigger language plpgsql set search_path = public as $$
declare
  is_admin boolean := public.is_noctua_admin();
  from_web boolean := current_user in ('anon', 'authenticated');
  p record;
  today_count int;
begin
  new.body := nullif(btrim(coalesce(new.body, '')), '');

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if from_web and not is_admin then
      -- El autor solo cambia estrellas y texto.
      new.user_id := old.user_id; new.venue_type := old.venue_type; new.venue_id := old.venue_id;
      new.hidden := old.hidden; new.created_at := old.created_at;
      new.author_name := old.author_name; new.author_level := old.author_level;
    end if;
    return new;
  end if;

  if from_web and not is_admin then
    new.user_id := auth.uid();
    new.hidden := false;
    new.created_at := now();
    if new.user_id is null then raise exception 'Inicia sesión para opinar'; end if;

    if (new.venue_type = 'club' and exists (select 1 from public.clubs where id = new.venue_id and owner_user_id = new.user_id))
       or (new.venue_type = 'event' and exists (select 1 from public.events where id = new.venue_id and owner_user_id = new.user_id)) then
      raise exception 'No puedes opinar de tu propio local';
    end if;

    select count(*) into today_count from public.venue_reviews
    where user_id = new.user_id and created_at > now() - interval '1 day';
    if today_count >= 10 then raise exception 'Has llegado al máximo de opiniones por hoy'; end if;
  end if;

  select a.author_name, a.author_level into p from public.noctua_review_author(new.user_id) a;
  new.author_name := coalesce(p.author_name, 'Usuario de Noctua');
  new.author_level := p.author_level;
  return new;
end $$;
drop trigger if exists noctua_review_before on public.venue_reviews;
create trigger noctua_review_before before insert or update on public.venue_reviews
  for each row execute function public.noctua_review_before();

-- Denuncias de opiniones.
create table if not exists public.venue_review_reports (
  id bigint generated always as identity primary key,
  review_id bigint not null references public.venue_reviews(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);
alter table public.venue_review_reports enable row level security;
drop policy if exists "Denunciar opinión" on public.venue_review_reports;
create policy "Denunciar opinión" on public.venue_review_reports
  for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "Ver mis denuncias de opiniones" on public.venue_review_reports;
create policy "Ver mis denuncias de opiniones" on public.venue_review_reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_noctua_admin());
drop policy if exists "Admin borra denuncias de opiniones" on public.venue_review_reports;
create policy "Admin borra denuncias de opiniones" on public.venue_review_reports
  for delete to authenticated using (public.is_noctua_admin());

-- Nombre del local para los avisos.
create or replace function public.noctua_venue_name(p_type text, p_id bigint)
returns text language sql stable security definer set search_path = public as $$
  select case when p_type = 'club' then (select name from public.clubs where id = p_id)
              else (select coalesce(to_jsonb(e)->>'name', to_jsonb(e)->>'title') from public.events e where id = p_id) end
$$;

-- Enlace a la ficha pública (ahí el admin puede borrar la opinión desde la pestaña Opiniones).
create or replace function public.noctua_venue_link(p_type text, p_id bigint)
returns text language sql stable security definer set search_path = public as $$
  select case when p_type = 'club'
    then (select '/clubs/' || coalesce(nullif(to_jsonb(c)->>'slug', ''), public.noctua_make_slug(c.name)) || '?tab=reviews' from public.clubs c where id = p_id)
    else (select '/event/' || public.noctua_make_slug(coalesce(to_jsonb(e)->>'name', to_jsonb(e)->>'title')) from public.events e where id = p_id) end
$$;

-- Aviso al admin por cada opinión nueva.
create or replace function public.noctua_notify_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.noctua_admin_notify(
    'review',
    'Opinión de ' || new.rating || '★ en ' || coalesce(public.noctua_venue_name(new.venue_type, new.venue_id), 'un local'),
    coalesce(new.author_name, 'Usuario') || coalesce(' — «' || left(new.body, 180) || '»', ''),
    public.noctua_venue_link(new.venue_type, new.venue_id));
  return null;
exception when others then return null;
end $$;
drop trigger if exists noctua_notify_review on public.venue_reviews;
create trigger noctua_notify_review after insert on public.venue_reviews
  for each row execute function public.noctua_notify_review();

-- Denuncia: aviso al admin y, con 3 denuncias, se oculta sola.
create or replace function public.noctua_review_reported()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int; r record;
begin
  select * into r from public.venue_reviews where id = new.review_id;
  select count(*) into n from public.venue_review_reports where review_id = new.review_id and id <= new.id;
  if n >= 3 and not r.hidden then
    update public.venue_reviews set hidden = true where id = new.review_id;
  end if;
  perform public.noctua_admin_notify(
    'report',
    'Opinión denunciada en ' || coalesce(public.noctua_venue_name(r.venue_type, r.venue_id), 'un local') ||
      case when n >= 3 then ' (ocultada: ' || n || ' denuncias)' else '' end,
    coalesce(r.author_name, 'Usuario') || ' · ' || r.rating || '★' || coalesce(' — «' || left(r.body, 160) || '»', ''),
    public.noctua_venue_link(r.venue_type, r.venue_id),
    n >= 3);
  return null;
exception when others then return null;
end $$;
drop trigger if exists noctua_review_reported on public.venue_review_reports;
create trigger noctua_review_reported after insert on public.venue_review_reports
  for each row execute function public.noctua_review_reported();

-- 2) Neo Caja Negra ----------------------------------------------------------------------
insert into public.clubs (name, slug, address, neighborhood, city, venue_type, music, hours, open_days,
                          latitude, longitude, description, hidden)
select 'Neo Caja Negra', public.noctua_make_slug('Neo Caja Negra'),
       'Carrer del Torrent de l''Olla, 121, 08012 Barcelona', 'Gràcia', 'Barcelona', 'Coctelería', null,
       'X/J/D 19:30-02:30, V/S 19:30-03:00', array['Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
       41.402695, 2.156421,
       'Coctelería de Gràcia dedicada al cine de terror: una colección de máscaras y figuras de películas de miedo, '
       || 'películas de culto proyectadas mientras tomas algo y hasta el baño tiene sonidos de ultratumba. '
       || 'Buenos cócteles y una cerveza de la casa roja, con maracuyá e hibisco. Lunes y martes, cerrado.',
       false
where not exists (
  select 1 from public.clubs c
  where public.noctua_norm_venue_name(c.name) in (public.noctua_norm_venue_name('Neo Caja Negra'), public.noctua_norm_venue_name('Caja Negra Cocktails'))
);

-- Web del local, solo si la tabla tiene la columna "website".
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clubs' and column_name = 'website') then
    update public.clubs set website = 'https://neocajanegra.com/'
    where name = 'Neo Caja Negra' and (website is null or website = '');
  end if;
end $$;

-- 3) Etiqueta «Partidos en TV» ---------------------------------------------------------
alter table public.clubs add column if not exists sports_tv boolean not null default false;
-- Punto de partida: los que ya lo dicen en el nombre, el estilo o la descripción.
update public.clubs set sports_tv = true
where not sports_tv and (name ilike '%sport%' or music ilike '%sport%' or description ilike '%partidos%'
  or description ilike '%retransmi%' or description ilike '%pantalla gigante%');

select id, name, slug, neighborhood, hidden from public.clubs where name = 'Neo Caja Negra';
alter table public.clubs add column if not exists hot_shows boolean not null default false;
update public.clubs set hot_shows = true
where not hot_shows and (name ilike '%strip%' or description ilike '%striptease%' or description ilike '%stripper%'
  or description ilike '%show erótico%' or description ilike '%shows eróticos%' or description ilike '%gogó%');

select count(*) filter (where sports_tv) as locales_con_partidos_en_tv,
       count(*) filter (where hot_shows) as locales_ambiente_hot
from public.clubs;
