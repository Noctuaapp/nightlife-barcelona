-- =====================================================================================
-- Noctua · «Gracias» en las opiniones + edad obligatoria también en la base de datos · 26/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 40). Se puede repetir sin problema.
--
-- 1) Botón «Gracias» en cada opinión de un local:
--      · Hay que tener cuenta. Una vez por persona y opinión (se puede quitar). No a la tuya.
--      · El autor gana 1 XP por cada «Gracias», SOLO si el Club Noctua está activado (mientras
--        esté en pausa no se da nada, igual que el resto de XP). Máximo 10 XP al día por esto,
--        y quitar y volver a dar las gracias no suma otra vez.
--      · Al autor le llega un aviso en su perfil la 1.ª, 5.ª, 10.ª, 25.ª, 50.ª y 100.ª vez.
--
-- 2) Edad: el registro ya pedía la fecha de nacimiento (y a quien entra con Google le lleva a
--    /confirm-age). Ahora además la base de datos rechaza un año de nacimiento de menos de 18
--    años, y una vez puesto, el usuario no puede cambiarlo él mismo (tú sí, desde el admin).
-- =====================================================================================

-- 1) Gracias -----------------------------------------------------------------------------
create table if not exists public.venue_review_thanks (
  review_id bigint not null references public.venue_reviews(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
create index if not exists venue_review_thanks_user_idx on public.venue_review_thanks (user_id);

alter table public.venue_review_thanks enable row level security;

-- Los recuentos son públicos (se ve «12 personas lo agradecen»), pero no quién fue.
drop policy if exists "Gracias: ver las mías" on public.venue_review_thanks;
create policy "Gracias: ver las mías" on public.venue_review_thanks
  for select to authenticated using (user_id = auth.uid() or public.is_noctua_admin());
drop policy if exists "Gracias: dar" on public.venue_review_thanks;
create policy "Gracias: dar" on public.venue_review_thanks
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Gracias: quitar" on public.venue_review_thanks;
create policy "Gracias: quitar" on public.venue_review_thanks
  for delete to authenticated using (user_id = auth.uid());

-- Recuento por opinión (público, sin nombres).
alter table public.venue_reviews add column if not exists thanks_count int not null default 0;
-- Máximo alcanzado (para no repetir el aviso si alguien quita y vuelve a dar las gracias).
alter table public.venue_reviews add column if not exists thanks_peak int not null default 0;

create or replace function public.noctua_review_thanks_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  author uuid;
  total int;
  peak int;
  today_xp int;
  club_on boolean;
  vname text;
begin
  if tg_op = 'DELETE' then
    update public.venue_reviews set thanks_count = greatest(0, thanks_count - 1) where id = old.review_id;
    return null;
  end if;

  select user_id, thanks_peak into author, peak from public.venue_reviews where id = new.review_id;
  if author is null then return null; end if;
  update public.venue_reviews set thanks_count = thanks_count + 1, thanks_peak = greatest(thanks_peak, thanks_count + 1)
  where id = new.review_id
  returning thanks_count into total;

  -- 1 XP al autor, solo con el Club Noctua activado y como mucho 10 al día por esta vía.
  begin
    select enabled into club_on from public.club_noctua_settings where id = 1;
    if coalesce(club_on, false) then
      select count(*) into today_xp
      from public.venue_review_thanks t join public.venue_reviews r on r.id = t.review_id
      where r.user_id = author and t.created_at >= date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid';
      if today_xp <= 10 then
        -- La clave incluye quién da las gracias: quitar y volver a darlas no suma otra vez.
        perform public._grant_xp(author, 'review_thanks', 'thanks:' || new.user_id::text, new.review_id, 1);
      end if;
    end if;
  exception when others then null;
  end;

  -- Aviso al autor en algunos hitos.
  if total > coalesce(peak, 0) and total in (1, 5, 10, 25, 50, 100) then
    begin
      select public.noctua_venue_name(r.venue_type, r.venue_id) into vname from public.venue_reviews r where r.id = new.review_id;
      insert into public.notifications (user_id, title, body)
      values (
        author,
        case when total = 1 then '¡Tu opinión le ha servido a alguien!' else '¡' || total || ' personas te dan las gracias!' end,
        'Tu opinión' || coalesce(' sobre ' || vname, '') || ' está ayudando a otros a decidir dónde salir. ¡Gracias por compartirla!'
      );
    exception when others then null;
    end;
  end if;
  return null;
end $$;

drop trigger if exists noctua_review_thanks_after on public.venue_review_thanks;
create trigger noctua_review_thanks_after after insert or delete on public.venue_review_thanks
  for each row execute function public.noctua_review_thanks_after();

-- No a tu propia opinión.
create or replace function public.noctua_review_thanks_before()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.venue_reviews where id = new.review_id and user_id = new.user_id) then
    raise exception 'No puedes darte las gracias a ti mismo';
  end if;
  return new;
end $$;
drop trigger if exists noctua_review_thanks_before on public.venue_review_thanks;
create trigger noctua_review_thanks_before before insert on public.venue_review_thanks
  for each row execute function public.noctua_review_thanks_before();

-- thanks_count solo lo cambia el sistema (no el autor al editar su opinión).
create or replace function public.noctua_review_before()
returns trigger language plpgsql set search_path = public as $$
declare
  is_admin boolean := public.is_noctua_admin();
  from_web boolean := current_user in ('anon', 'authenticated');
  p record;
  today_count int;
begin
  new.body := nullif(btrim(coalesce(new.body, '')), '');

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if from_web and not is_admin then
      new.user_id := old.user_id; new.venue_type := old.venue_type; new.venue_id := old.venue_id;
      new.hidden := old.hidden; new.created_at := old.created_at;
      new.author_name := old.author_name; new.author_level := old.author_level;
      new.thanks_count := old.thanks_count; new.thanks_peak := old.thanks_peak;
    end if;
    return new;
  end if;

  if from_web and not is_admin then
    new.user_id := auth.uid();
    new.hidden := false;
    new.created_at := now();
    new.thanks_count := 0; new.thanks_peak := 0;
    if new.user_id is null then raise exception 'Inicia sesión para opinar'; end if;

    if (new.venue_type = 'club' and exists (select 1 from public.clubs where id = new.venue_id and owner_user_id = new.user_id))
       or (new.venue_type = 'event' and exists (select 1 from public.events where id = new.venue_id and owner_user_id = new.user_id)) then
      raise exception 'No puedes opinar de tu propio local';
    end if;

    select count(*) into today_count from public.venue_reviews
    where user_id = new.user_id and created_at > now() - interval '1 day';
    if today_count >= 10 then raise exception 'Has llegado al máximo de opiniones por hoy'; end if;
  end if;

  select a.author_name, a.author_level into p from public.noctua_review_author(new.user_id) a;
  new.author_name := coalesce(p.author_name, 'Usuario de Noctua');
  new.author_level := p.author_level;
  return new;
end $$;

-- 2) Edad ---------------------------------------------------------------------------------
create or replace function public.noctua_profile_age_guard()
returns trigger language plpgsql set search_path = public as $$
declare
  is_admin boolean := public.is_noctua_admin();
  from_web boolean := current_user in ('anon', 'authenticated');
begin
  if to_jsonb(new) ? 'birth_year' then
    -- Una vez puesto, el usuario no lo cambia él mismo.
    if tg_op = 'UPDATE' and from_web and not is_admin and (to_jsonb(old)->>'birth_year') is not null then
      new := jsonb_populate_record(new, jsonb_build_object('birth_year', to_jsonb(old)->'birth_year'));
    end if;
    if (to_jsonb(new)->>'birth_year') is not null
       and (to_jsonb(new)->>'birth_year')::int > extract(year from now() at time zone 'Europe/Madrid')::int - 18 then
      raise exception 'Noctua es solo para mayores de 18 años';
    end if;
    if (to_jsonb(new)->>'birth_year') is not null and (to_jsonb(new)->>'birth_year')::int < 1900 then
      raise exception 'Año de nacimiento no válido';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists noctua_profile_age_guard on public.profiles;
create trigger noctua_profile_age_guard before insert or update on public.profiles
  for each row execute function public.noctua_profile_age_guard();

-- 3) Seguridad: funciones internas de los avisos que nadie necesita llamar desde la web.
revoke all on function public.noctua_venue_name(text, bigint) from public, anon, authenticated;
revoke all on function public.noctua_venue_link(text, bigint) from public, anon, authenticated;
revoke all on function public.noctua_admin_notify(text, text, text, text, boolean) from public, anon, authenticated;

-- Comprobación: cuántos usuarios tienen la edad confirmada y cuántos no.
select
  count(*) filter (where (to_jsonb(p)->>'birth_year') is not null) as con_edad,
  count(*) filter (where (to_jsonb(p)->>'birth_year') is null) as sin_edad,
  count(*) filter (where (to_jsonb(p)->>'terms_accepted_at') is null) as sin_aceptar_terminos
from public.profiles p;
