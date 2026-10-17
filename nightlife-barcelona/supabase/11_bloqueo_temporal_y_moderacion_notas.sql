-- =====================================================================================
-- Noctua · Tanda J (bloqueos con duración + moderación de notas denunciadas) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué añade:
--   1) profiles.blocked_until — para poder bloquear a alguien por 1 día, 1 semana, 1 mes, 1 año
--      o para siempre (NULL = para siempre). is_blocked_user() ya comprueba la fecha: si pasó,
--      deja de contar como bloqueado sin que nadie tenga que desbloquearlo a mano.
--   2) club_checkin_reports.reviewed_at — para poder marcar una denuncia como "ya revisada"
--      desde el nuevo panel /admin/notas, sin borrar el historial de quién denunció qué.
--   3) Permisos para que el admin pueda, desde ese panel, poner a null la nota de un check-in
--      ajeno (quitarla de la vista pública) y marcar denuncias como revisadas.
-- =====================================================================================

-- 1) Bloqueo con caducidad.
alter table public.profiles add column if not exists blocked_until timestamptz;

create or replace function public.is_blocked_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select is_blocked and (blocked_until is null or blocked_until > now())
      from public.profiles where id = auth.uid()
    ),
    false
  )
$$;
grant execute on function public.is_blocked_user() to anon, authenticated;

-- 2) Marcar denuncias de notas como revisadas (sin borrarlas).
alter table public.club_checkin_reports add column if not exists reviewed_at timestamptz;

drop policy if exists "Admin revisa denuncias" on public.club_checkin_reports;
create policy "Admin revisa denuncias" on public.club_checkin_reports
  as permissive for update to authenticated
  using (public.is_noctua_admin()) with check (public.is_noctua_admin());

-- 3) El admin puede quitar la nota de cualquier check-in (ponerla a null) desde /admin/notas.
--    Solo afecta al admin: el resto sigue sin poder editar check-ins ajenos.
drop policy if exists "Admin modera check-ins" on public.club_checkins;
create policy "Admin modera check-ins" on public.club_checkins
  as permissive for update to authenticated
  using (public.is_noctua_admin()) with check (public.is_noctua_admin());

-- 4) Comprobación.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'blocked_until';
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'club_checkin_reports' and column_name = 'reviewed_at';
select policyname, tablename from pg_policies
where policyname in ('Admin revisa denuncias', 'Admin modera check-ins');
