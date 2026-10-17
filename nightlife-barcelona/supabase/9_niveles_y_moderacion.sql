-- =====================================================================================
-- Noctua · Tanda H (niveles con tiempo mínimo + moderación de notas de check-in) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema (todo usa
-- "if not exists" / "create or replace" / "drop ... if exists").
--
-- Qué añade:
--   1) profiles.member_since / level_key / level_since — para que subir de nivel no dependa
--      solo del XP, sino también de llevar un tiempo mínimo en el nivel anterior (lo pediste:
--      "que debas estar almenos un mes usando la aplicacion para subir de bronce").
--   2) recompute_level(p_user_id) — la función que de verdad decide si alguien sube de nivel.
--      El cliente (src/lib/xp.ts) ya la llama; mientras no se ejecute este SQL, el nivel se
--      sigue calculando solo por XP (sin el mínimo de días) — no se rompe nada por no haberlo
--      ejecutado todavía, pero el requisito de tiempo no se aplica hasta que lo ejecutes.
--   3) club_checkin_votes y club_checkin_reports — para los pulgares arriba/abajo y el botón
--      de denunciar en las notas de check-in (lo pediste: "me gustaria que tuviera
--      valoraciones esas notas... y se puede denunciar el perfil o lo que sea"). El código ya
--      intenta usarlas y, si no existen, simplemente no cuenta votos ni denuncias todavía.
--
-- IMPORTANTE: el umbral de XP y los días mínimos de cada nivel están escritos aquí Y en
-- src/lib/xp.ts (LEVELS / LEVEL_GATE_DAYS). Si algún día cambias la curva en un sitio,
-- cámbiala también en el otro o el cliente y el servidor dejarán de estar de acuerdo.
-- =====================================================================================

-- 1) Columnas nuevas en profiles. member_since (desde cuándo existe la cuenta, por si algún
--    día se quiere medir "un mes desde el registro" sin depender de created_at de auth.users),
--    level_key (nivel actual) y level_since (desde cuándo está en ese nivel).
alter table public.profiles add column if not exists member_since timestamptz;
alter table public.profiles add column if not exists level_key text;
alter table public.profiles add column if not exists level_since timestamptz;

-- Primer backfill, solo para quien todavía no tiene nada rellenado:
--   - member_since: cuando se creó el perfil (si no se sabe, ahora mismo).
--   - level_key: el nivel que le toca YA por su XP actual (no se le hace esperar por algo
--     pasado que no podemos medir con fecha exacta).
--   - level_since: a partir de hoy, para que el tiempo de espera del SIGUIENTE nivel empiece
--     a contar desde que se ejecuta este SQL, no desde una fecha retroactiva inventada.
update public.profiles
set member_since = coalesce(member_since, created_at, now())
where member_since is null;

update public.profiles
set level_key = coalesce(level_key, case
  when xp >= 10000 then 'elite'
  when xp >= 6000  then 'diamante'
  when xp >= 3500  then 'zafiro'
  when xp >= 1800  then 'platino'
  when xp >= 800   then 'oro'
  when xp >= 300   then 'plata'
  else 'bronce'
end)
where level_key is null;

update public.profiles
set level_since = coalesce(level_since, now())
where level_since is null;

-- 2) recompute_level(p_user_id): sube de nivel a alguien solo si cumple XP Y lleva el mínimo
--    de días en el nivel anterior. Puede subir varios niveles de golpe en una sola llamada
--    (por ejemplo si alguien no abre la app en meses y luego vuelve con XP de sobra), pero
--    nivel a nivel, respetando cada gate por el camino.
--    Seguridad: solo la propia persona (o el admin) puede recalcular su nivel — nadie puede
--    pedir el de otra cuenta.
create or replace function public.recompute_level(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp integer;
  v_level_key text;
  v_level_since timestamptz;
  v_leveled_up boolean := false;
  v_last_new_level text;
  v_next_min integer;
  v_next_key text;
  v_gate_days integer;
begin
  if auth.uid() is distinct from p_user_id and not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  select xp, level_key, level_since into v_xp, v_level_key, v_level_since
  from public.profiles where id = p_user_id;

  if v_xp is null then
    return jsonb_build_object('leveled_up', false, 'new_level', null);
  end if;

  v_level_key := coalesce(v_level_key, 'bronce');
  v_level_since := coalesce(v_level_since, now());

  loop
    -- Nivel y umbral de XP siguientes, y cuántos días hay que llevar en el nivel actual
    -- antes de poder desbloquearlo. Mismos números que LEVELS / LEVEL_GATE_DAYS en xp.ts.
    v_next_key := case v_level_key
      when 'bronce'   then 'plata'
      when 'plata'    then 'oro'
      when 'oro'      then 'platino'
      when 'platino'  then 'zafiro'
      when 'zafiro'   then 'diamante'
      when 'diamante' then 'elite'
      else null
    end;
    exit when v_next_key is null;

    v_next_min := case v_next_key
      when 'plata'    then 300
      when 'oro'      then 800
      when 'platino'  then 1800
      when 'zafiro'   then 3500
      when 'diamante' then 6000
      when 'elite'    then 10000
    end;
    v_gate_days := case v_next_key
      when 'plata'    then 45
      when 'oro'      then 40
      when 'platino'  then 60
      when 'zafiro'   then 90
      when 'diamante' then 120
      when 'elite'    then 180
    end;

    exit when v_xp < v_next_min;
    exit when now() < v_level_since + make_interval(days => v_gate_days);

    -- Cumple XP y tiempo mínimo: sube de nivel y el contador de días del SIGUIENTE
    -- nivel empieza a correr desde ahora.
    v_level_key := v_next_key;
    v_level_since := now();
    v_leveled_up := true;
    v_last_new_level := v_next_key;
  end loop;

  if v_leveled_up then
    update public.profiles
    set level_key = v_level_key, level_since = v_level_since
    where id = p_user_id;
  end if;

  return jsonb_build_object('leveled_up', v_leveled_up, 'new_level', v_last_new_level);
end $$;

revoke all on function public.recompute_level(uuid) from public, anon;
grant execute on function public.recompute_level(uuid) to authenticated, service_role;

-- 3) Votos en las notas de check-in: un pulgar arriba o abajo por persona y nota, se puede
--    cambiar o quitar (el cliente hace upsert/delete). Los conteos los puede ver cualquiera
--    (son públicos en la ficha del club, igual que la nota); solo se puede votar si no estás
--    bloqueado.
create table if not exists public.club_checkin_votes (
  id bigint generated always as identity primary key,
  checkin_id bigint not null references public.club_checkins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote smallint not null check (vote in (1, -1)),
  created_at timestamptz not null default now(),
  unique (checkin_id, user_id)
);
create index if not exists club_checkin_votes_checkin_idx on public.club_checkin_votes(checkin_id);

alter table public.club_checkin_votes enable row level security;

drop policy if exists "Ver votos" on public.club_checkin_votes;
create policy "Ver votos" on public.club_checkin_votes
  as permissive for select to public using (true);

drop policy if exists "Votar" on public.club_checkin_votes;
create policy "Votar" on public.club_checkin_votes
  as permissive for insert to authenticated
  with check (auth.uid() = user_id and not public.is_blocked_user());

drop policy if exists "Cambiar mi voto" on public.club_checkin_votes;
create policy "Cambiar mi voto" on public.club_checkin_votes
  as permissive for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Quitar mi voto" on public.club_checkin_votes;
create policy "Quitar mi voto" on public.club_checkin_votes
  as permissive for delete to authenticated using (auth.uid() = user_id);

-- 4) Denuncias de notas: a diferencia de los votos, aquí solo quien denuncia (y el admin)
--    puede ver sus propias denuncias — no son públicas, para que nadie sepa quién denunció
--    a quién con solo mirar la ficha del club.
create table if not exists public.club_checkin_reports (
  id bigint generated always as identity primary key,
  checkin_id bigint not null references public.club_checkins(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (checkin_id, reporter_id)
);
create index if not exists club_checkin_reports_checkin_idx on public.club_checkin_reports(checkin_id);

alter table public.club_checkin_reports enable row level security;

drop policy if exists "Ver mis denuncias" on public.club_checkin_reports;
create policy "Ver mis denuncias" on public.club_checkin_reports
  as permissive for select to authenticated
  using (reporter_id = auth.uid() or public.is_noctua_admin());

drop policy if exists "Denunciar" on public.club_checkin_reports;
create policy "Denunciar" on public.club_checkin_reports
  as permissive for insert to authenticated
  with check (reporter_id = auth.uid() and not public.is_blocked_user());

-- 5) Comprobación: deberías ver las 2 tablas nuevas, la función y las columnas nuevas de profiles.
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('club_checkin_votes', 'club_checkin_reports');
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'recompute_level';
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('member_since', 'level_key', 'level_since');
