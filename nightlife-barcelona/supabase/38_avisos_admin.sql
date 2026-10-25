-- =====================================================================================
-- Noctua · Avisos para el admin · 25/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 37). Se puede repetir sin problema.
--
-- "Que me llegue a notificaciones en el admin y poder ver en alguna zona cosas importantes."
-- Una bandeja de avisos (Admin › Avisos, y la campana del menú) que se llena SOLA, en el momento,
-- cuando pasa algo que merece tu atención:
--   · Mensaje nuevo en Contáctanos (no se avisa del spam)
--   · Una nota denunciada
--   · Un usuario nuevo registrado
--   · Un "no me dejan entrar" (y aviso IMPORTANTE si un local acumula 3 o más en 30 días)
--   · Una opinión de la web (IMPORTANTE si es de 1 o 2 estrellas)
--   · Un dueño vinculado edita su ficha (máximo un aviso por ficha cada 3 horas)
-- Solo el admin puede leerlos. Si algo fallase al crear un aviso, lo que hace el usuario
-- (enviar el mensaje, registrarse...) sigue funcionando igual: el aviso nunca lo bloquea.
-- =====================================================================================

create table if not exists public.admin_notifications (
  id bigint generated always as identity primary key,
  kind text not null,              -- message | report | signup | entry_denial | feedback | alert | owner_change
  important boolean not null default false,
  title text not null,
  body text,
  link text,                       -- pantalla del admin donde se gestiona
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists admin_notifications_created_idx on public.admin_notifications(created_at desc);
create index if not exists admin_notifications_unread_idx on public.admin_notifications(created_at desc) where read_at is null;

alter table public.admin_notifications enable row level security;

drop policy if exists "Admin lee avisos" on public.admin_notifications;
create policy "Admin lee avisos" on public.admin_notifications
  for select to authenticated using (public.is_noctua_admin());
drop policy if exists "Admin marca avisos" on public.admin_notifications;
create policy "Admin marca avisos" on public.admin_notifications
  for update to authenticated using (public.is_noctua_admin()) with check (public.is_noctua_admin());
drop policy if exists "Admin borra avisos" on public.admin_notifications;
create policy "Admin borra avisos" on public.admin_notifications
  for delete to authenticated using (public.is_noctua_admin());
-- Sin política de INSERT: solo los crean los disparadores de abajo (nadie desde la web).

-- Crea un aviso sin poder romper nunca la acción del usuario.
create or replace function public.noctua_admin_notify(p_kind text, p_title text, p_body text, p_link text, p_important boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications(kind, title, body, link, important)
  values (p_kind, left(p_title, 200), left(p_body, 500), p_link, coalesce(p_important, false));
exception when others then
  null;
end $$;
revoke all on function public.noctua_admin_notify(text, text, text, text, boolean) from public, anon, authenticated;

-- 1) Contáctanos ------------------------------------------------------------------------
create or replace function public.noctua_notify_contact()
returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(new);
begin
  if coalesce((r->>'is_spam')::boolean, false) then return null; end if;
  perform public.noctua_admin_notify(
    'message',
    'Mensaje nuevo' || coalesce(': ' || nullif(r->>'subject', ''), ''),
    coalesce(nullif(r->>'name', ''), 'Alguien') || coalesce(' · ' || nullif(r->>'type', ''), '') ||
      coalesce(' — ' || left(nullif(r->>'message', ''), 160), ''),
    '/admin/messages');
  return null;
exception when others then return null;
end $$;
do $$ begin
  if to_regclass('public.contact_messages') is not null then
    drop trigger if exists noctua_notify_contact on public.contact_messages;
    create trigger noctua_notify_contact after insert on public.contact_messages
      for each row execute function public.noctua_notify_contact();
  end if;
end $$;

-- 2) Notas denunciadas ------------------------------------------------------------------
create or replace function public.noctua_notify_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare club_name text; note text;
begin
  select c.name, left(k.note, 120) into club_name, note
  from public.club_checkins k left join public.clubs c on c.id = k.club_id
  where k.id = new.checkin_id;
  perform public.noctua_admin_notify(
    'report',
    'Nota denunciada' || coalesce(' en ' || club_name, ''),
    coalesce('«' || note || '»', 'Revísala en Notas denunciadas'),
    '/admin/notas');
  return null;
exception when others then
  perform public.noctua_admin_notify('report', 'Nota denunciada', 'Revísala en Notas denunciadas', '/admin/notas');
  return null;
end $$;
drop trigger if exists noctua_notify_report on public.club_checkin_reports;
create trigger noctua_notify_report after insert on public.club_checkin_reports
  for each row execute function public.noctua_notify_report();

-- 3) Usuario nuevo ----------------------------------------------------------------------
create or replace function public.noctua_notify_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare total bigint;
begin
  select count(*) into total from public.profiles;
  perform public.noctua_admin_notify(
    'signup',
    'Usuario nuevo' || coalesce(': ' || nullif(to_jsonb(new)->>'username', ''), ''),
    'Ya sois ' || total || ' en Noctua',
    '/admin/users');
  return null;
exception when others then return null;
end $$;
drop trigger if exists noctua_notify_signup on public.profiles;
create trigger noctua_notify_signup after insert on public.profiles
  for each row execute function public.noctua_notify_signup();

-- 4) "No me dejan entrar" (+ alerta si se repite en el mismo local) ----------------------
create or replace function public.noctua_notify_denial()
returns trigger language plpgsql security definer set search_path = public as $$
declare n bigint; place text := coalesce(nullif(new.venue_name, ''), 'un local');
begin
  select count(*) into n from public.entry_denials
  where venue_type = new.venue_type and venue_id = new.venue_id and created_at >= now() - interval '30 days' and id <= new.id;
  perform public.noctua_admin_notify(
    'entry_denial',
    'No le dejan entrar en ' || place,
    'Motivo: ' || case to_jsonb(new)->>'reason'
      when 'dress' then 'vestimenta' when 'full' then 'aforo lleno' when 'group' then 'grupo grande'
      when 'other' then 'otro motivo' else 'sin indicar' end,
    '/admin/entry-denials');
  if n = 3 or (n > 3 and n % 5 = 0) then
    perform public.noctua_admin_notify(
      'alert',
      place || ': ' || n || ' avisos de «no me dejan entrar» en 30 días',
      'Puede que el local esté siendo muy selectivo o que la ficha dé una idea equivocada (precio, dress code, edad). Revísalo.',
      '/admin/entry-denials', true);
  end if;
  return null;
exception when others then return null;
end $$;
drop trigger if exists noctua_notify_denial on public.entry_denials;
create trigger noctua_notify_denial after insert on public.entry_denials
  for each row execute function public.noctua_notify_denial();

-- 5) Opiniones de la web ----------------------------------------------------------------
create or replace function public.noctua_notify_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.noctua_admin_notify(
    'feedback',
    'Opinión de ' || new.rating || ' ' || case when new.rating = 1 then 'estrella' else 'estrellas' end ||
      case when new.rating <= 2 then ' — algo no les ha gustado' else '' end,
    coalesce('«' || left(nullif(new.comment, ''), 200) || '»', 'Sin comentario') || coalesce(' · en ' || nullif(new.page, ''), ''),
    '/admin/opinion',
    new.rating <= 2);
  return null;
exception when others then return null;
end $$;
drop trigger if exists noctua_notify_feedback on public.site_feedback;
create trigger noctua_notify_feedback after insert on public.site_feedback
  for each row execute function public.noctua_notify_feedback();

-- 6) Un dueño vinculado cambia su ficha -------------------------------------------------
-- (como mucho un aviso por ficha cada 3 horas, para no llenar la bandeja si edita mucho seguido)
create or replace function public.noctua_notify_owner_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if new.user_id is null or public.is_noctua_admin() then return null; end if;
  t := 'Un dueño ha editado ' || coalesce(new.row_name, 'su ficha');
  if exists (select 1 from public.admin_notifications where kind = 'owner_change' and title = t and created_at > now() - interval '3 hours') then
    return null;
  end if;
  perform public.noctua_admin_notify('owner_change', t,
    coalesce(new.user_email, 'Dueño vinculado') || ' · ' || coalesce(new.action, 'cambiar') || ' en ' || coalesce(new.table_name, ''),
    '/admin/cambios');
  return null;
exception when others then return null;
end $$;
do $$ begin
  if to_regclass('public.admin_audit_log') is not null then
    drop trigger if exists noctua_notify_owner_change on public.admin_audit_log;
    create trigger noctua_notify_owner_change after insert on public.admin_audit_log
      for each row execute function public.noctua_notify_owner_change();
  end if;
end $$;

-- Limpieza: los avisos leídos de hace más de 180 días se borran solos al crear uno nuevo.
create or replace function public.noctua_admin_notifications_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if random() < 0.02 then
    delete from public.admin_notifications where read_at is not null and created_at < now() - interval '180 days';
  end if;
  return null;
exception when others then return null;
end $$;
drop trigger if exists noctua_admin_notifications_cleanup on public.admin_notifications;
create trigger noctua_admin_notifications_cleanup after insert on public.admin_notifications
  for each statement execute function public.noctua_admin_notifications_cleanup();

select 'Avisos del admin listos' as resultado;
