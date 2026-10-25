-- =====================================================================================
-- Noctua · Los vinculados solo editan su ficha + métricas para dueños · 25/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 31). Se puede repetir sin problema.
--
-- 1) "Solo yo como admin debería poder crear un club o evento; los vinculados solo pueden añadir
--    noches y sesiones, y la info general de su página."
--      clubs / events        crear y borrar: SOLO el admin (antes un organizador ya vinculado
--                            podía crear más eventos y borrar el suyo).
--      ocultar / publicar    SOLO el admin: un dueño ya no puede ocultar ni volver a publicar su
--                            ficha (antes podía, y así reaparecía un repetido ocultado).
--      club_events, club_sessions, event_sessions: el dueño sigue pudiendo añadir, editar y
--                            borrar las noches y sesiones de SU club / festival.
--
-- 2) "No te dejan entrar": cada usuario puede leer SUS propios avisos, para que la web deje de
--    recomendarle el local donde no le dejaron entrar (90 días).
--
-- 3) Métricas para dueños: owner_item_stats() da a cada dueño las visitas y clics de SU ficha
--    (y al admin, de cualquiera). Solo números agregados: nunca quién ha sido.
-- =====================================================================================

-- 1) Crear y borrar clubs y eventos: solo admin (reglas restrictivas, se cumplen siempre).
drop policy if exists "Solo admin u organizador vinculado crea eventos" on public.events;
drop policy if exists "Solo admin crea eventos" on public.events;
create policy "Solo admin crea eventos" on public.events
as restrictive for insert with check (public.is_noctua_admin());

drop policy if exists "Solo admin u organizador borra su evento" on public.events;
drop policy if exists "Solo admin borra eventos" on public.events;
create policy "Solo admin borra eventos" on public.events
as restrictive for delete using (public.is_noctua_admin());

drop policy if exists "Solo admin crea clubs" on public.clubs;
create policy "Solo admin crea clubs" on public.clubs
as restrictive for insert with check (public.is_noctua_admin());
drop policy if exists "Solo admin borra clubs" on public.clubs;
create policy "Solo admin borra clubs" on public.clubs
as restrictive for delete using (public.is_noctua_admin());

-- Ocultar / publicar: se añade "hidden" (y "duplicate_of") a las columnas que solo decide Noctua.
create or replace function public.protect_club_columns()
returns trigger
language plpgsql
as $$
declare
  safe jsonb;
begin
  if current_user in ('anon', 'authenticated') and not public.is_noctua_admin() then
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into safe
    from jsonb_each(to_jsonb(old))
    where key in ('verified', 'trending', 'rating', 'owner_user_id', 'featured', 'place_id', 'hidden', 'duplicate_of', 'slug')
       or key like 'google\_%';
    new := jsonb_populate_record(new, safe);
  end if;
  return new;
end $$;

-- 2) Cada usuario lee sus propios avisos de "no me dejan entrar".
drop policy if exists "Usuario lee sus avisos de entrada" on public.entry_denials;
create policy "Usuario lee sus avisos de entrada" on public.entry_denials
for select to authenticated using (user_id = auth.uid());

-- 3) Métricas para dueños --------------------------------------------------------------
create or replace function public.owner_item_stats(p_type text, p_id bigint, p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  allowed boolean;
  t_to timestamptz := now();
  t_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  t_prev timestamptz := now() - make_interval(days => 2 * greatest(1, least(coalesce(p_days, 30), 365)));
  nights bigint[];
  result jsonb;
begin
  if p_type not in ('club', 'event') then
    raise exception 'tipo no válido';
  end if;
  allowed := public.is_noctua_admin()
    or (p_type = 'club' and exists (select 1 from public.clubs where id = p_id and owner_user_id = uid))
    or (p_type = 'event' and exists (select 1 from public.events where id = p_id and owner_user_id = uid));
  if not coalesce(allowed, false) then
    raise exception 'sin permiso';
  end if;

  if p_type = 'club' then
    select coalesce(array_agg(id), '{}') into nights from public.club_events where club_id = p_id;
  else
    nights := '{}';
  end if;

  with ev as (
    select event_type, session_id, source, device, created_at
    from public.analytics
    where item_type = p_type and item_id::text = p_id::text and created_at >= t_from and created_at < t_to
  )
  select jsonb_build_object(
    'days', greatest(1, least(coalesce(p_days, 30), 365)),
    'views', (select count(*) from ev where event_type = 'page_view'),
    'visitors', (select count(distinct session_id) from ev where event_type = 'page_view'),
    'views_prev', (
      select count(*) from public.analytics
      where item_type = p_type and item_id::text = p_id::text and event_type = 'page_view'
        and created_at >= t_prev and created_at < t_from
    ),
    'clicks', coalesce((
      select jsonb_object_agg(event_type, n) from (
        select event_type, count(*) n from ev where event_type <> 'page_view' group by event_type
      ) c
    ), '{}'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'views', n) order by d) from (
        select (created_at at time zone 'Europe/Madrid')::date d, count(*) n
        from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('label', s, 'n', n) order by n desc) from (
        select coalesce(source, 'direct') s, count(distinct session_id) n from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('label', dv, 'n', n) order by n desc) from (
        select coalesce(device, 'unknown') dv, count(distinct session_id) n from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h) from (
        select extract(hour from created_at at time zone 'Europe/Madrid')::int h, count(*) n
        from ev where event_type = 'page_view' group by 1
      ) x
    ), '[]'::jsonb),
    'night_views', (
      select count(*) from public.analytics
      where item_type = 'club_event' and item_id::text = any (select unnest(nights)::text)
        and event_type = 'page_view' and created_at >= t_from and created_at < t_to
    ),
    'favorites', (select count(*) from public.favorites where item_type = p_type and item_id = p_id),
    'attendances', (
      select count(*) from public.attendances
      where item_type = p_type and item_id = p_id and night >= (t_from at time zone 'Europe/Madrid')::date
    ),
    'checkins', case when p_type = 'club' then (
      select count(*) from public.club_checkins
      where club_id = p_id and checkin_date >= (t_from at time zone 'Europe/Madrid')::date
    ) else 0 end,
    'entry_denials', (
      select count(*) from public.entry_denials
      where venue_type = p_type and venue_id = p_id and created_at >= t_from
    )
  ) into result;

  return result;
end $$;

revoke all on function public.owner_item_stats(text, bigint, int) from public, anon;
grant execute on function public.owner_item_stats(text, bigint, int) to authenticated;

select 'Permisos de vinculados y métricas de dueños listos' as resultado;
