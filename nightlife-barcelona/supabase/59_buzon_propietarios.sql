-- =====================================================================================
-- Noctua · Buzón de propietarios · 30/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 58). Se puede repetir sin problema.
--
-- Un buzón privado entre Noctua y la gente que hemos vinculado a un club o a un festival:
--   · Es una conversación (hilo) por cuenta: ella escribe, tú respondes desde Admin › Buzón.
--   · SOLO pueden usarlo las cuentas vinculadas como dueño de un club o de un evento. Cualquier
--     otro usuario (registrado o no) no puede ni leerlo ni escribir: lo impide la base de datos,
--     no solo la web. Un dueño solo ve SU hilo; tú ves todos.
--   · Sin email: cuando un dueño escribe, te sale un aviso en la campana del admin (entra en el
--     resumen diario) y un contador en el menú; cuando respondes tú, al dueño le sale una
--     notificación dentro de la web (la campana de Noctua).
--   · Tope anti-abuso: 15 mensajes cada 24 horas por cuenta (tú no tienes tope).
--   · Un mensaje no se puede editar. Solo cambia la marca de «leído».
-- =====================================================================================

-- 1) Tabla ---------------------------------------------------------------------------------
create table if not exists public.owner_messages (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,  -- de quién es el hilo
  sender text not null check (sender in ('owner', 'admin')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  club_id bigint references public.clubs(id) on delete set null,            -- sobre qué ficha (opcional)
  event_id bigint references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz                                                         -- cuándo lo leyó quien lo recibe
);
create index if not exists owner_messages_thread_idx on public.owner_messages(owner_user_id, created_at);
create index if not exists owner_messages_unread_idx on public.owner_messages(sender, created_at desc) where read_at is null;

-- 2) Quién es «dueño vinculado» -----------------------------------------------------------
create or replace function public.noctua_is_linked_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.clubs where owner_user_id = auth.uid())
    or exists (select 1 from public.events where owner_user_id = auth.uid())
  )
$$;

-- 3) Permisos (RLS) ------------------------------------------------------------------------
alter table public.owner_messages enable row level security;

drop policy if exists "Buzon: leer" on public.owner_messages;
create policy "Buzon: leer" on public.owner_messages
  for select to authenticated
  using (public.is_noctua_admin() or (owner_user_id = auth.uid() and public.noctua_is_linked_owner()));

drop policy if exists "Buzon: escribir" on public.owner_messages;
create policy "Buzon: escribir" on public.owner_messages
  for insert to authenticated
  with check (
    public.is_noctua_admin()
    or (
      sender = 'owner'
      and owner_user_id = auth.uid()
      and public.noctua_is_linked_owner()
      and (club_id is null or public.noctua_owns_club(club_id))
      and (event_id is null or public.noctua_owns_event(event_id))
    )
  );

-- Marcar como leído: el admin los de los dueños; cada dueño los de Noctua dentro de su hilo.
drop policy if exists "Buzon: marcar leido" on public.owner_messages;
create policy "Buzon: marcar leido" on public.owner_messages
  for update to authenticated
  using (
    (public.is_noctua_admin() and sender = 'owner')
    or (owner_user_id = auth.uid() and sender = 'admin' and public.noctua_is_linked_owner())
  )
  with check (
    (public.is_noctua_admin() and sender = 'owner')
    or (owner_user_id = auth.uid() and sender = 'admin' and public.noctua_is_linked_owner())
  );

-- Borrar: solo el admin.
drop policy if exists "Buzon: borrar" on public.owner_messages;
create policy "Buzon: borrar" on public.owner_messages
  for delete to authenticated
  using (public.is_noctua_admin());

-- Ni anónimos ni cuentas sin vincular tienen acceso a la tabla.
revoke all on public.owner_messages from anon;
grant select, insert, update, delete on public.owner_messages to authenticated;

-- 4) Que nadie pueda disfrazar un mensaje -------------------------------------------------
-- Al crear: el remitente lo fija la base de datos (un dueño siempre es "owner", tú "admin"), la
-- fecha es la real, nace sin leer y se aplica el tope de mensajes. (Si no hay sesión de usuario,
-- p. ej. desde el SQL Editor, se respeta lo que se indique.)
create or replace function public.owner_messages_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.body := btrim(new.body);
  new.created_at := now();
  new.read_at := null;
  if coalesce(public.is_noctua_admin(), false) then
    new.sender := 'admin';
  elsif auth.uid() is not null then
    new.sender := 'owner';
    new.owner_user_id := auth.uid();
    if (
      select count(*) from public.owner_messages
      where owner_user_id = new.owner_user_id and sender = 'owner' and created_at > now() - interval '24 hours'
    ) >= 15 then
      raise exception 'owner_msg_rate_limit';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists owner_messages_before_insert_trg on public.owner_messages;
create trigger owner_messages_before_insert_trg
  before insert on public.owner_messages
  for each row execute function public.owner_messages_before_insert();

-- Al editar: lo único que puede cambiar es la marca de leído (y solo una vez).
create or replace function public.owner_messages_before_update()
returns trigger language plpgsql as $$
begin
  new.id := old.id;
  new.owner_user_id := old.owner_user_id;
  new.sender := old.sender;
  new.body := old.body;
  new.club_id := old.club_id;
  new.event_id := old.event_id;
  new.created_at := old.created_at;
  new.read_at := coalesce(old.read_at, new.read_at);
  return new;
end $$;

drop trigger if exists owner_messages_before_update_trg on public.owner_messages;
create trigger owner_messages_before_update_trg
  before update on public.owner_messages
  for each row execute function public.owner_messages_before_update();

-- 5) Avisos ---------------------------------------------------------------------------------
-- Dueño escribe → aviso en el admin (campana + resumen diario, sin email inmediato).
-- Tú respondes → notificación dentro de la web para el dueño (sin email).
-- Si algo fallase aquí, el mensaje se guarda igual.
create or replace function public.owner_messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  place text;
  portal text;
begin
  if new.sender = 'owner' then
    select coalesce(
      (select c.name from public.clubs c where c.id = new.club_id),
      (select e.title from public.events e where e.id = new.event_id),
      (select c.name from public.clubs c where c.owner_user_id = new.owner_user_id order by c.id limit 1),
      (select e.title from public.events e where e.owner_user_id = new.owner_user_id order by e.id limit 1),
      'un propietario'
    ) into place;
    perform public.noctua_admin_notify(
      'owner_message',
      'Mensaje de ' || place,
      left(new.body, 160),
      '/admin/buzon'
    );
  else
    portal := case when exists (select 1 from public.clubs where owner_user_id = new.owner_user_id) then 'Mi club' else 'Mi festival' end;
    insert into public.notifications(user_id, title, body, type)
    values (new.owner_user_id, 'Noctua te ha respondido', 'Tienes un mensaje nuevo en el buzón de ' || portal || '.', 'admin_message');
  end if;
  return null;
exception when others then
  return null;
end $$;

drop trigger if exists owner_messages_after_insert_trg on public.owner_messages;
create trigger owner_messages_after_insert_trg
  after insert on public.owner_messages
  for each row execute function public.owner_messages_after_insert();

-- Comprobación: deben salir 2 disparadores de inserción + 1 de edición, y la tabla con RLS activado.
select tgname, tgrelid::regclass as tabla from pg_trigger
where tgname in ('owner_messages_before_insert_trg', 'owner_messages_before_update_trg', 'owner_messages_after_insert_trg');
select relname as tabla, relrowsecurity as rls_activado from pg_class where relname = 'owner_messages';
