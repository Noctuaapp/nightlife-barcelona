-- =====================================================================================
-- Noctua · Check-in a 5 XP · 24/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- "Reducir el xp del checkin a 5xp". El check-in se premia en dos funciones (do_checkin, la
-- normal, y award_xp, la de respaldo): las dos pasan de 20 a 5 XP. Los check-ins ya hechos
-- conservan lo que dieron.
--
-- De paso arregla un fallo: do_checkin daba el XP sin mirar el interruptor de pausa de Club
-- Noctua, así que con Club Noctua "en pausa" los check-ins seguían sumando XP. Ahora no.
-- (award_xp es la misma que la de 25_registro_sin_xp.sql, con solo el 20 → 5 cambiado.)
-- =====================================================================================

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
      return public._grant_xp(uid, 'checkin', 'club', p_item_id, 5);
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

create or replace function public.do_checkin(p_club_id bigint, p_lat double precision, p_lng double precision, p_accuracy double precision)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  night date := public.noctua_night();
  club_lat float8;
  club_lng float8;
  d float8;
  nearest_other float8;
  n_tonight int;
  last_at timestamptz;
  awarded boolean := false;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'login');
  end if;
  if exists (select 1 from public.profiles where id = uid and coalesce(is_blocked, false)) then
    return jsonb_build_object('ok', false, 'reason', 'blocked');
  end if;
  if p_lat is null or p_lng is null or p_accuracy is null
     or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return jsonb_build_object('ok', false, 'reason', 'no_location');
  end if;
  if p_accuracy > 50 then
    return jsonb_build_object('ok', false, 'reason', 'low_accuracy');
  end if;

  select nullif(latitude::text, '')::float8, nullif(longitude::text, '')::float8
  into club_lat, club_lng
  from public.clubs
  where id = p_club_id and hidden = false;
  if club_lat is null or club_lng is null then
    return jsonb_build_object('ok', false, 'reason', 'no_club');
  end if;

  d := public.noctua_distance_m(p_lat, p_lng, club_lat, club_lng);
  if d > 80 then
    return jsonb_build_object('ok', false, 'reason', 'too_far', 'distance', round(d));
  end if;

  select min(public.noctua_distance_m(p_lat, p_lng, nullif(latitude::text, '')::float8, nullif(longitude::text, '')::float8))
  into nearest_other
  from public.clubs
  where hidden = false and id <> p_club_id
    and nullif(latitude::text, '') is not null and nullif(longitude::text, '') is not null;
  if nearest_other is not null and nearest_other - d < 25 then
    return jsonb_build_object('ok', false, 'reason', 'ambiguous');
  end if;

  if exists (select 1 from public.club_checkins where user_id = uid and club_id = p_club_id and checkin_date = night) then
    return jsonb_build_object('ok', true, 'already', true, 'awarded', false);
  end if;

  select count(*), max(created_at) into n_tonight, last_at
  from public.club_checkins
  where user_id = uid and checkin_date = night;
  if n_tonight >= 4 then
    return jsonb_build_object('ok', false, 'reason', 'limit');
  end if;
  if last_at is not null and last_at > now() - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'too_soon');
  end if;

  insert into public.club_checkins (user_id, club_id, checkin_date, created_at, distance_m, accuracy_m)
  values (uid, p_club_id, night, now(), round(d)::int, round(p_accuracy)::int);

  -- 5 XP por check-in (antes 20). Y solo si Club Noctua está activo: antes esta función daba
  -- el XP directamente sin mirar el interruptor de pausa, así que los check-ins seguían sumando
  -- XP aunque Club Noctua estuviera "en pausa".
  if coalesce((select enabled from public.club_noctua_settings where id = 1), false) then
    awarded := public._grant_xp(uid, 'checkin', 'club', p_club_id, 5);
  end if;
  return jsonb_build_object('ok', true, 'awarded', awarded);
exception when unique_violation then
  return jsonb_build_object('ok', true, 'already', true, 'awarded', false);
end $function$;

-- Verificación: deberían salir las dos funciones.
select proname from pg_proc where proname in ('award_xp', 'do_checkin') and pronamespace = 'public'::regnamespace;
