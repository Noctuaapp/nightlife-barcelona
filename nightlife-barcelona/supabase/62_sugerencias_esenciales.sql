-- =====================================================================================
-- Noctua · Sugerencias de esenciales · 31/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 61). Se puede repetir sin problema.
--
-- «¿Nos faltan esenciales? ¡Ayúdanos!» (Esenciales › botón de la portada):
--   · Cualquier persona CON CUENTA puede proponer un esencial: tipo (farmacia, cajero...), nombre,
--     calle y número (y, si quiere, una nota). Se guarda como «pendiente».
--   · Tú lo ves en Admin › Sugerencias de esenciales, lo compruebas en Google Maps y decides:
--       - «Aprobar y dar XP»: se guarda como aprobada y quien lo propuso recibe 10 XP (una sola
--         vez por sugerencia; el XP sube aunque el Club Noctua esté pausado, porque lo das tú).
--       - «Aprobar sin XP» o «Rechazar».
--     En los tres casos a esa persona le llega una notificación dentro de la web.
--   · Aprobar NO crea el esencial en el mapa (hace falta su ubicación): lo añades tú después desde
--     Admin › Esenciales con los datos que ves en la sugerencia.
--   · Anti-abuso: 5 sugerencias cada 24 horas por cuenta y no se puede repetir la misma mientras
--     siga pendiente. Quien propone solo ve las suyas; nadie puede cambiarlas ni darse XP solo:
--     solo lo hace la función de revisión, y esa solo la puede usar el admin.
-- =====================================================================================

-- 1) Tabla ---------------------------------------------------------------------------------
create table if not exists public.essential_suggestions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('Pharmacy', 'ATM', 'Food', 'Supermarket', 'Hospital', 'Gas Station', 'Other')),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  street text not null check (char_length(btrim(street)) between 2 and 160),
  street_number text check (street_number is null or char_length(btrim(street_number)) between 1 and 20),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  xp_awarded integer not null default 0,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists essential_suggestions_status_idx on public.essential_suggestions(status, created_at desc);
create index if not exists essential_suggestions_user_idx on public.essential_suggestions(user_id, created_at desc);

-- 2) Permisos (RLS) ------------------------------------------------------------------------
alter table public.essential_suggestions enable row level security;

drop policy if exists "Sugerencias: leer" on public.essential_suggestions;
create policy "Sugerencias: leer" on public.essential_suggestions
  for select to authenticated
  using (user_id = auth.uid() or public.is_noctua_admin());

drop policy if exists "Sugerencias: proponer" on public.essential_suggestions;
create policy "Sugerencias: proponer" on public.essential_suggestions
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "Sugerencias: borrar" on public.essential_suggestions;
create policy "Sugerencias: borrar" on public.essential_suggestions
  for delete to authenticated
  using (public.is_noctua_admin());

revoke all on public.essential_suggestions from anon;
revoke all on public.essential_suggestions from authenticated;
grant select, insert, delete on public.essential_suggestions to authenticated;

-- 3) Antes de guardar: limpiar, fijar los campos que no se pueden elegir y poner topes ----------
create or replace function public.essential_suggestions_before_insert()
returns trigger language plpgsql as $$
begin
  new.name := btrim(new.name);
  new.street := btrim(new.street);
  new.street_number := nullif(btrim(coalesce(new.street_number, '')), '');
  new.note := nullif(btrim(coalesce(new.note, '')), '');

  -- Solo desde la web (el editor SQL no pasa por aquí): la persona no puede elegir el estado, el
  -- XP ni a nombre de quién se guarda.
  if current_user in ('anon', 'authenticated') then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.xp_awarded := 0;
    new.admin_note := null;
    new.reviewed_at := null;

    if (select count(*) from public.essential_suggestions
        where user_id = new.user_id and created_at > now() - interval '24 hours') >= 5 then
      raise exception 'limite_sugerencias';
    end if;
    if exists (
      select 1 from public.essential_suggestions
      where user_id = new.user_id and status = 'pending'
        and lower(name) = lower(new.name) and lower(street) = lower(new.street)
        and coalesce(street_number, '') = coalesce(new.street_number, '')
    ) then
      raise exception 'sugerencia_repetida';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists essential_suggestions_before_insert_trg on public.essential_suggestions;
create trigger essential_suggestions_before_insert_trg
  before insert on public.essential_suggestions
  for each row execute function public.essential_suggestions_before_insert();

-- 4) Después de guardar: aviso en la campana del admin ---------------------------------------
create or replace function public.essential_suggestions_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.noctua_admin_notify(
    'essential_suggestion',
    'Nueva sugerencia de esencial',
    new.name || ' · ' || new.street || coalesce(' ' || new.street_number, ''),
    '/admin/sugerencias'
  );
  return null;
exception when others then
  return null;
end $$;

drop trigger if exists essential_suggestions_after_insert_trg on public.essential_suggestions;
create trigger essential_suggestions_after_insert_trg
  after insert on public.essential_suggestions
  for each row execute function public.essential_suggestions_after_insert();

-- 5) Revisión (solo admin): aprobar con o sin XP, o rechazar --------------------------------
create or replace function public.admin_review_essential_suggestion(
  p_id bigint,
  p_decision text,
  p_award_xp boolean default false,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.essential_suggestions%rowtype;
  xp integer := 0;
begin
  if not public.is_noctua_admin() then
    raise exception 'no_autorizado';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'decision_no_valida';
  end if;

  select * into s from public.essential_suggestions where id = p_id for update;
  if not found then
    raise exception 'no_existe';
  end if;
  if s.status <> 'pending' then
    raise exception 'ya_revisada';
  end if;

  -- 10 XP, una sola vez por sugerencia (la clave del XP lleva el id de la sugerencia). Si el XP
  -- falla por lo que sea, la sugerencia se aprueba igualmente y xp_awarded queda en 0.
  if p_decision = 'approve' and coalesce(p_award_xp, false) then
    begin
      perform public._grant_xp(s.user_id, 'essential_suggestion', 'suggestion', s.id, 10);
      if exists (
        select 1 from public.xp_events
        where user_id = s.user_id and action_type = 'essential_suggestion' and item_id = s.id
      ) then
        xp := 10;
      end if;
    exception when others then
      xp := 0;
    end;
  end if;

  update public.essential_suggestions
  set status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
      xp_awarded = xp,
      admin_note = nullif(btrim(coalesce(p_note, '')), ''),
      reviewed_at = now()
  where id = p_id;

  -- Aviso a quien lo propuso (campana de la web).
  begin
    insert into public.notifications(user_id, title, body, type)
    values (
      s.user_id,
      case when p_decision = 'approve'
        then '¡Gracias! Vamos a añadir «' || left(s.name, 60) || '»'
        else 'Hemos revisado tu sugerencia' end,
      case when p_decision = 'approve'
        then 'Has ayudado a completar Noctua.' || case when xp > 0 then ' Te sumamos ' || xp || ' XP.' else '' end
        else 'De momento no podemos añadir «' || left(s.name, 60) || '» (puede que ya lo tengamos o que no hayamos podido comprobarlo). ¡Gracias por ayudar!' end,
      'admin_message'
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('ok', true, 'xp', xp);
end $$;

revoke all on function public.admin_review_essential_suggestion(bigint, text, boolean, text) from public, anon;
grant execute on function public.admin_review_essential_suggestion(bigint, text, boolean, text) to authenticated;

-- Comprobación: debe salir la tabla con RLS activado y las dos funciones.
select tablename, rowsecurity as rls_activado from pg_tables
where schemaname = 'public' and tablename = 'essential_suggestions';
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('admin_review_essential_suggestion', 'essential_suggestions_before_insert', 'essential_suggestions_after_insert');
