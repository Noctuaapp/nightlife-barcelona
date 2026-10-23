-- =====================================================================================
-- Noctua · Tanda L (pausar Club Noctua con un interruptor desde admin) · 23/10/2026 · v2
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- v2: la primera versión usaba una tabla "app_settings" asumiendo que no existía todavía, pero
-- ya había una con columnas distintas (de algo anterior, ajeno a esto) y chocó. Esta versión usa
-- una tabla propia, solo para este interruptor, sin tocar la que ya existía.
--
-- Qué añade: "de momento solo se gana xp compartiendo a amigos y no se puedan ver las misiones
-- ni nada aun del club de noctua hasta que lo active yo" (pedido el 23/10/2026).
--
--   1) club_noctua_settings — una tabla de una sola fila con el interruptor. Cualquiera puede
--      LEER (el frontend necesita saber si está activo o no para decidir qué enseñar), pero
--      solo tú puedes escribir.
--   2) enabled = false por defecto — lo activas tú desde /admin/herramientas cuando quieras (ya
--      tiene el interruptor ahí, no hace falta tocar SQL para encenderlo).
--   3) award_xp se reescribe entero (mismo código que ya tenía en 12_misiones_rotativas.sql, la
--      última vez que se tocó) con un solo añadido al principio: si el interruptor está en
--      false, no da XP por check-in, racha, login diario ni misiones semanales — ninguna rama
--      llega a ejecutarse. No hace falta tocar nada más: invitar amigos (/invitar) sigue dando
--      su recompensa normal porque esa nunca pasó por esta función, va por su cuenta.
--   4) El frontend (ya subido) oculta en /club-noctua las misiones, insignias de barrio y la
--      lista de niveles mientras esté en false, y enseña un aviso de "en pausa" en su lugar —
--      excepto para ti, que lo sigues viendo todo para poder decidir cuándo activarlo.
-- =====================================================================================

create table if not exists public.club_noctua_settings (
  id int primary key default 1,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint club_noctua_settings_single_row check (id = 1)
);

alter table public.club_noctua_settings enable row level security;

drop policy if exists "Cualquiera puede leer el interruptor" on public.club_noctua_settings;
create policy "Cualquiera puede leer el interruptor" on public.club_noctua_settings
  for select using (true);

drop policy if exists "Solo admin cambia el interruptor" on public.club_noctua_settings;
create policy "Solo admin cambia el interruptor" on public.club_noctua_settings
  for all using (public.is_noctua_admin()) with check (public.is_noctua_admin());

insert into public.club_noctua_settings (id, enabled) values (1, false)
on conflict (id) do nothing;

create or replace function public.award_xp(p_user_id uuid, p_action_type text, p_item_type text, p_item_id bigint, p_amount integer)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Europe/Madrid')::date;
  this_week bigint := to_char(today, 'IYYYIW')::bigint;
  last_week bigint := to_char(today - 7, 'IYYYIW')::bigint;
  week_code bigint;
  n int;
  mon date;
  mon_ts timestamptz;
  amount int := 0;
  ok boolean := false;
  enabled boolean;
begin
  if uid is null or p_user_id is distinct from uid then
    raise exception 'No autorizado';
  end if;

  -- Interruptor de pausa: si no está activado, ninguna de las ramas de abajo llega a darse.
  -- Invitar amigos no pasa por aquí, así que sigue funcionando igual durante la pausa.
  select club_noctua_settings.enabled into enabled
  from public.club_noctua_settings where id = 1;
  if not coalesce(enabled, false) then
    return false;
  end if;

  if p_action_type = 'streak' then
    return public._grant_xp(uid, 'streak', 'week', this_week, 15);

  elsif p_action_type = 'daily_login' then
    return public._grant_xp(uid, 'daily_login', 'day', to_char(today, 'YYYYMMDD')::bigint, 2);

  elsif p_action_type = 'checkin' then
    if exists (
      select 1 from public.club_checkins
      where user_id = uid and club_id = p_item_id and checkin_date = public.noctua_night()
    ) then
      return public._grant_xp(uid, 'checkin', 'club', p_item_id, 20);
    end if;
    return false;

  elsif p_action_type = 'challenge' then
    if p_item_id is null then return false; end if;
    n := (p_item_id % 10)::int;
    week_code := p_item_id / 10;
    if week_code not in (this_week, last_week) or n not between 1 and 6 then return false; end if;
    mon := to_date(substr(week_code::text, 1, 4) || '-' || substr(week_code::text, 5, 2) || '-1', 'IYYY-IW-ID');
    mon_ts := (mon::timestamp) at time zone 'Europe/Madrid';

    if n = 1 then
      amount := 25;
      select exists (
        select 1 from public.club_checkins c
        where c.user_id = uid and c.checkin_date >= mon and c.checkin_date < mon + 7
          and not exists (
            select 1 from public.club_checkins c2
            where c2.user_id = uid and c2.club_id = c.club_id and c2.checkin_date < mon
          )
      ) into ok;

    elsif n = 2 then
      amount := 15;
      select exists (
        select 1 from public.club_checkins
        where user_id = uid and note_created_at >= mon_ts and note_created_at < mon_ts + interval '7 days'
      ) into ok;

    elsif n = 3 then
      amount := 15;
      select count(*) >= 2 from public.attendances
      where user_id = uid and created_at >= mon_ts and created_at < mon_ts + interval '7 days'
      into ok;

    elsif n = 4 then
      amount := 20;
      select exists (
        select 1 from public.club_checkins c
        join public.clubs cl on cl.id = c.club_id
        where c.user_id = uid and c.checkin_date >= mon and c.checkin_date < mon + 7
          and cl.neighborhood is not null and cl.neighborhood <> ''
          and not exists (
            select 1 from public.club_checkins c2
            join public.clubs cl2 on cl2.id = c2.club_id
            where c2.user_id = uid and c2.checkin_date < mon and cl2.neighborhood = cl.neighborhood
          )
      ) into ok;

    elsif n = 5 then
      amount := 10;
      select exists (
        select 1 from public.club_checkin_votes
        where user_id = uid and created_at >= mon_ts and created_at < mon_ts + interval '7 days'
      ) into ok;

    else
      amount := 20;
      select count(distinct checkin_date) >= 2 from public.club_checkins
      where user_id = uid and checkin_date >= mon and checkin_date < mon + 7
      into ok;
    end if;

    if not ok then return false; end if;
    return public._grant_xp(uid, 'challenge', 'challenge', p_item_id, amount);
  end if;

  return false;
end $function$;

-- Verificación: debería verse la fila (enabled = false) y la función actualizada.
select id, enabled from public.club_noctua_settings where id = 1;
select proname from pg_proc where proname = 'award_xp' and pronamespace = 'public'::regnamespace;
