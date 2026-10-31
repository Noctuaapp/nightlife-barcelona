-- =====================================================================================
-- Noctua · Avisos de cierre, celebraciones y respuestas a opiniones · 31/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 59). Se puede repetir sin problema.
--
-- 1) «Hoy cerramos» / horarios especiales / avisos del local (clubs.schedule_notices):
--    una lista pequeña (máx. 20) que el propietario gestiona desde Mi club › Avisos. Cada aviso
--    lleva tipo (cerrado, horario especial o aviso), fechas y un texto corto. Los pasados los
--    limpia la web al guardar. Lo puede editar el dueño vinculado de ESE club (igual que el resto
--    de su ficha) y el admin.
-- 2) Tres etiquetas nuevas de servicios: cumpleaños, eventos privados y alquiler del local.
-- 3) Respuestas del local a las opiniones (venue_review_replies):
--      · Solo puede responder el dueño vinculado del club o del evento de esa opinión
--        (lo comprueba la base de datos, no solo la web). Una respuesta por opinión, máx. 600
--        caracteres, máx. 30 respuestas al día por cuenta.
--      · Puede editarla o borrarla. El admin puede ocultarla o borrarla.
--      · Cuando responde, a quien escribió la opinión le sale una notificación dentro de Noctua
--        (la campana) y a ti te llega un aviso en Admin › Avisos para que puedas moderarla.
--      · Es una tabla aparte: no toca la tabla de opiniones ni sus reglas.
-- =====================================================================================

-- 1) Avisos de cierre / horario especial -------------------------------------------------
alter table public.clubs add column if not exists schedule_notices jsonb not null default '[]'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'clubs_schedule_notices_check') then
    alter table public.clubs add constraint clubs_schedule_notices_check
      check (
        jsonb_typeof(schedule_notices) = 'array'
        and jsonb_array_length(schedule_notices) <= 20
        and octet_length(schedule_notices::text) <= 12000
      );
  end if;
end $$;

-- 2) Etiquetas: cumpleaños, eventos privados, alquiler del local ------------------------
alter table public.clubs add column if not exists birthdays boolean not null default false;
alter table public.clubs add column if not exists private_events boolean not null default false;
alter table public.clubs add column if not exists venue_rental boolean not null default false;

-- 3) Respuestas a opiniones ----------------------------------------------------------------
create table if not exists public.venue_review_replies (
  id bigint generated always as identity primary key,
  review_id bigint not null unique references public.venue_reviews(id) on delete cascade,
  venue_type text not null check (venue_type in ('club', 'event')),
  venue_id bigint not null,
  author_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 600),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists venue_review_replies_venue_idx on public.venue_review_replies (venue_type, venue_id);

-- ¿Soy el dueño vinculado de este club o evento?
create or replace function public.noctua_owns_venue(p_type text, p_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select case when p_type = 'club' then public.noctua_owns_club(p_id)
              when p_type = 'event' then public.noctua_owns_event(p_id)
              else false end
$$;

alter table public.venue_review_replies enable row level security;

drop policy if exists "Respuestas: leer" on public.venue_review_replies;
create policy "Respuestas: leer" on public.venue_review_replies
  for select to anon, authenticated
  using (hidden = false or public.is_noctua_admin());

drop policy if exists "Respuestas: escribir" on public.venue_review_replies;
create policy "Respuestas: escribir" on public.venue_review_replies
  for insert to authenticated
  with check (public.is_noctua_admin() or (author_user_id = auth.uid() and public.noctua_owns_venue(venue_type, venue_id)));

drop policy if exists "Respuestas: editar" on public.venue_review_replies;
create policy "Respuestas: editar" on public.venue_review_replies
  for update to authenticated
  using (public.is_noctua_admin() or public.noctua_owns_venue(venue_type, venue_id))
  with check (public.is_noctua_admin() or public.noctua_owns_venue(venue_type, venue_id));

drop policy if exists "Respuestas: borrar" on public.venue_review_replies;
create policy "Respuestas: borrar" on public.venue_review_replies
  for delete to authenticated
  using (public.is_noctua_admin() or public.noctua_owns_venue(venue_type, venue_id));

revoke all on public.venue_review_replies from anon;
grant select on public.venue_review_replies to anon;
grant select, insert, update, delete on public.venue_review_replies to authenticated;

-- Antes de guardar: a qué local pertenece lo fija la base de datos (mirando la opinión, no lo que
-- mande la web), el autor es quien escribe, y el dueño solo puede cambiar el texto. (Se ejecuta con
-- los permisos de quien escribe, para distinguir la web del SQL Editor.)
create or replace function public.noctua_reply_before()
returns trigger language plpgsql set search_path = public as $$
declare
  is_admin boolean := coalesce(public.is_noctua_admin(), false);
  from_web boolean := current_user in ('anon', 'authenticated');
  r record;
begin
  new.body := btrim(coalesce(new.body, ''));

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if from_web then
      new.review_id := old.review_id;
      new.venue_type := old.venue_type;
      new.venue_id := old.venue_id;
      new.author_user_id := old.author_user_id;
      new.created_at := old.created_at;
      if not is_admin then new.hidden := old.hidden; end if;
    end if;
    return new;
  end if;

  select id, venue_type, venue_id into r from public.venue_reviews where id = new.review_id;
  if not found then
    raise exception 'La opinión no existe';
  end if;
  new.venue_type := r.venue_type;
  new.venue_id := r.venue_id;

  if from_web then
    new.author_user_id := auth.uid();
    new.hidden := false;
    new.created_at := now();
    new.updated_at := now();
    if new.author_user_id is null then
      raise exception 'Inicia sesión para responder';
    end if;
    if (
      select count(*) from public.venue_review_replies
      where author_user_id = new.author_user_id and created_at > now() - interval '1 day'
    ) >= 30 then
      raise exception 'Has llegado al máximo de respuestas por hoy';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists noctua_reply_before on public.venue_review_replies;
create trigger noctua_reply_before
  before insert or update on public.venue_review_replies
  for each row execute function public.noctua_reply_before();

-- Después de responder: notificación para quien escribió la opinión + aviso para ti.
-- Si algo fallase aquí, la respuesta se guarda igual.
create or replace function public.noctua_reply_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r record;
  venue text;
begin
  select user_id into r from public.venue_reviews where id = new.review_id;
  venue := coalesce(public.noctua_venue_name(new.venue_type, new.venue_id), 'El local');

  if r.user_id is not null and r.user_id <> new.author_user_id then
    insert into public.notifications(user_id, title, body, type)
    values (r.user_id, venue || ' ha respondido a tu opinión', left(new.body, 140), 'reply');
  end if;

  perform public.noctua_admin_notify(
    'review_reply',
    'Respuesta de ' || venue || ' a una opinión',
    left(new.body, 300),
    public.noctua_venue_link(new.venue_type, new.venue_id)
  );
  return null;
exception when others then
  return null;
end $$;

drop trigger if exists noctua_reply_after on public.venue_review_replies;
create trigger noctua_reply_after
  after insert on public.venue_review_replies
  for each row execute function public.noctua_reply_after();

-- Comprobación: deben salir las 4 columnas nuevas de clubs, la tabla con RLS activado y los 2
-- disparadores de respuestas.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'clubs'
  and column_name in ('schedule_notices', 'birthdays', 'private_events', 'venue_rental')
order by column_name;
select relname as tabla, relrowsecurity as rls_activado from pg_class where relname = 'venue_review_replies';
select tgname from pg_trigger where tgname in ('noctua_reply_before', 'noctua_reply_after');
