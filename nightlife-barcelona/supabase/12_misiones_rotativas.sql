-- =====================================================================================
-- Noctua · Tanda K (misiones que rotan cada semana) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué cambia: los retos semanales dejan de ser siempre los mismos 3. Ahora hay una bolsa de 6
-- (src/lib/badges.ts → CHALLENGE_POOL) y cada semana se activan 3, rotando — mismos 3 para
-- todo el mundo, distintos cada semana, vuelven a repetirse cada 6 semanas. Esta función ahora
-- sabe validar los 6, no solo los 3 de antes (los 3 nuevos: barrio nuevo esta semana, valorar
-- la nota de alguien, y hacer check-in en 2 noches distintas).
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
    -- Antes: n between 1 and 3. Ahora la bolsa tiene 6 misiones posibles.
    if week_code not in (this_week, last_week) or n not between 1 and 6 then return false; end if;
    mon := to_date(substr(week_code::text, 1, 4) || '-' || substr(week_code::text, 5, 2) || '-1', 'IYYY-IW-ID');
    mon_ts := (mon::timestamp) at time zone 'Europe/Madrid';

    if n = 1 then
      -- Rincón nuevo: check-in esta semana en un club donde nunca habías estado antes.
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
      -- Voz de la noche: dejar una nota esta semana.
      amount := 15;
      select exists (
        select 1 from public.club_checkins
        where user_id = uid and note_created_at >= mon_ts and note_created_at < mon_ts + interval '7 days'
      ) into ok;

    elsif n = 3 then
      -- Plan en marcha: 2 "asistiré" esta semana.
      amount := 15;
      select count(*) >= 2 from public.attendances
      where user_id = uid and created_at >= mon_ts and created_at < mon_ts + interval '7 days'
      into ok;

    elsif n = 4 then
      -- Barrio nuevo: check-in esta semana en un barrio donde no habías hecho check-in antes
      -- (mismo principio que el reto 1, pero por barrio en vez de por club concreto).
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
      -- Vecino de la noche: valorar (pulgar arriba o abajo) la nota de check-in de alguien
      -- esta semana — se apoya en club_checkin_votes, la tabla nueva de la Tanda H.
      amount := 10;
      select exists (
        select 1 from public.club_checkin_votes
        where user_id = uid and created_at >= mon_ts and created_at < mon_ts + interval '7 days'
      ) into ok;

    else
      -- n = 6 — Doble noche: check-in real (no "asistiré") en 2 noches distintas esta semana.
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

-- Comprobación: pega el resultado y lo reviso.
select pg_get_functiondef(oid) from pg_proc
where proname = 'award_xp' and pronamespace = 'public'::regnamespace;
