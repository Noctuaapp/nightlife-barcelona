-- =====================================================================================
-- Noctua · Registrarse no da XP · 24/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué arregla: "por registrarte no deberías tener xp, si entra otro día sí". El premio de
-- inicio de sesión diario (2 XP) se daba también el mismo día del registro, así que todo el que
-- se daba de alta aparecía con 2 XP sin haber hecho nada (p. ej. @fiorenzo, 22/10).
--
--   1) award_xp: misma función que en 18_pausar_club_noctua.sql (la última versión), con un único
--      cambio en la rama 'daily_login': si hoy es el día en que se creó la cuenta, no da nada.
--   2) Corrige a quien ya los recibió: borra esos 2 XP del día de registro y los resta de su
--      perfil. Si algo de esa parte no encaja con tu base de datos, solo avisa y no rompe el resto.
-- =====================================================================================

-- 1) award_xp
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
    -- El día que te registras NO cuenta: registrarse no da XP. A partir del día siguiente, cada
    -- día que entras sí (2 XP).
    if exists (
      select 1 from auth.users
      where id = uid and (created_at at time zone 'Europe/Madrid')::date >= today
    ) then
      return false;
    end if;
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


-- 2) Devolver los XP ya dados el mismo día del registro.
do $$
declare
  fixed int := 0;
begin
  with wrong as (
    delete from public.xp_events x
    using auth.users u
    where x.user_id = u.id
      and x.action_type = 'daily_login'
      and (x.created_at at time zone 'Europe/Madrid')::date = (u.created_at at time zone 'Europe/Madrid')::date
    returning x.user_id, x.xp_amount
  ), per_user as (
    select user_id, sum(xp_amount) as total from wrong group by user_id
  ), upd as (
    update public.profiles p
    set xp = greatest(0, coalesce(p.xp, 0) - per_user.total)
    from per_user
    where p.id = per_user.user_id
    returning p.id
  )
  select count(*) into fixed from upd;
  raise notice 'Perfiles corregidos: %', fixed;
exception when others then
  raise notice 'No se pudo corregir el XP antiguo automáticamente (%). La regla nueva sí queda aplicada.', sqlerrm;
end $$;

-- Verificación: debería salir award_xp. Arriba, en "Messages"/avisos, verás cuántos perfiles se han corregido.
select proname from pg_proc where proname = 'award_xp' and pronamespace = 'public'::regnamespace;
