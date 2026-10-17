-- =====================================================================================
-- Noctua · Tanda I (corrige las cantidades reales de XP) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué arregla (visto al auditar award_xp, do_checkin y _grant_xp):
--   1) El rebalanceo de esta sesión (checkin 15→20 XP, racha semanal 30→15 XP) solo se había
--      aplicado en el código de la web (src/lib/xp.ts), que es lo que se MUESTRA. El XP que de
--      verdad se apuntaba en Postgres seguía siendo el antiguo: do_checkin y award_xp tenían
--      esos números fijos y p_amount (lo que manda el navegador) nunca se usaba — así que no es
--      un agujero de seguridad, pero sí es que la racha semanal (la que queríamos que diera
--      MENOS por ser la más "gratis") seguía dando 30 en vez de 15, y el check-in real seguía
--      dando 15 en vez de 20.
--   2) El inicio de sesión diario nunca había dado XP: award_xp no tenía ninguna rama para
--      p_action_type = 'daily_login' (caía siempre al "return false" final), aunque la racha de
--      días seguidos sí se guardaba bien en el perfil. Ahora da 2 XP, una vez al día como mucho
--      — _grant_xp ya protege esto solo: si la clave (usuario, acción, día) se repite, la
--      segunda vez no inserta nada y no se suma XP de más.
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
begin
  if uid is null or p_user_id is distinct from uid then
    raise exception 'No autorizado';
  end if;

  if p_action_type = 'streak' then
    -- Una vez por semana ISO. Antes 30 XP; ahora 15 (era la fuente de XP más fácil y la que más
    -- pagaba, así que se baja a propósito).
    return public._grant_xp(uid, 'streak', 'week', this_week, 15);

  elsif p_action_type = 'daily_login' then
    -- Nuevo: antes esta rama no existía y el login diario nunca daba XP de verdad. 2 XP, como
    -- mucho una vez al día (la clave incluye el día, así que un segundo intento el mismo día no
    -- suma nada, lo llame quien lo llame).
    return public._grant_xp(uid, 'daily_login', 'day', to_char(today, 'YYYYMMDD')::bigint, 2);

  elsif p_action_type = 'checkin' then
    -- Normalmente lo da do_checkin(); aquí solo si hay un check-in real esta noche en ese local.
    -- Antes 15 XP; ahora 20 (pasa a ser la acción mejor pagada, por ser la más verificada: GPS +
    -- estar físicamente en el local).
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
    if week_code not in (this_week, last_week) or n not between 1 and 3 then return false; end if;
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
    else
      amount := 15;
      select count(*) >= 2 from public.attendances
      where user_id = uid and created_at >= mon_ts and created_at < mon_ts + interval '7 days'
      into ok;
    end if;

    if not ok then return false; end if;
    return public._grant_xp(uid, 'challenge', 'challenge', p_item_id, amount);
  end if;

  -- 'attendance' ya no da XP; 'badge' solo lo da evaluate_badges(); cualquier otra cosa, nada.
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

  -- Antes 15 XP; ahora 20 (ver nota arriba en award_xp).
  awarded := public._grant_xp(uid, 'checkin', 'club', p_club_id, 20);
  return jsonb_build_object('ok', true, 'awarded', awarded);
exception when unique_violation then
  return jsonb_build_object('ok', true, 'already', true, 'awarded', false);
end $function$;

-- Comprobación: pega el resultado y lo reviso — debería verse 20 en el checkin, 15 en la racha
-- semanal y una rama nueva para 'daily_login' con 2 XP.
select pg_get_functiondef(oid) from pg_proc
where proname in ('award_xp', 'do_checkin') and pronamespace = 'public'::regnamespace;
