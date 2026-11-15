-- =====================================================================================
-- Noctua · Sugerencias de esenciales por ciudad · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 62). Se puede repetir sin problema.
--
-- Qué hace: cada sugerencia de esencial guarda de qué ciudad es ('barcelona' | 'madrid'). El formulario público de Madrid la
-- manda; las que ya existían (y las de Barcelona) quedan como 'barcelona'. Así Admin › Sugerencias de esenciales enseña solo
-- las de la ciudad elegida arriba, y el aviso de la campana dice de qué ciudad es cuando no es Barcelona.
--
-- Cambios:
--   · Columna city (por defecto 'barcelona') con solo esos dos valores.
--   · «Repetida» ahora compara también la ciudad: la misma farmacia en dos ciudades no es una repetición.
--   · El aviso del admin añade la ciudad cuando no es Barcelona.
-- Seguridad: no toca datos de nadie, ni la revisión (admin_review_essential_suggestion), ni los permisos.
-- =====================================================================================

-- 1) Columna ------------------------------------------------------------------------------
alter table public.essential_suggestions add column if not exists city text not null default 'barcelona';

alter table public.essential_suggestions drop constraint if exists essential_suggestions_city_check;
alter table public.essential_suggestions
  add constraint essential_suggestions_city_check check (city in ('barcelona', 'madrid'));

create index if not exists essential_suggestions_city_idx on public.essential_suggestions(city, status, created_at desc);

-- 2) Antes de guardar: igual que en el 62, con la ciudad (y la comprobación de repetida por ciudad) ----
create or replace function public.essential_suggestions_before_insert()
returns trigger language plpgsql as $$
begin
  new.name := btrim(new.name);
  new.street := btrim(new.street);
  new.street_number := nullif(btrim(coalesce(new.street_number, '')), '');
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  new.city := coalesce(nullif(lower(btrim(coalesce(new.city, ''))), ''), 'barcelona');

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
        and city = new.city
        and lower(name) = lower(new.name) and lower(street) = lower(new.street)
        and coalesce(street_number, '') = coalesce(new.street_number, '')
    ) then
      raise exception 'sugerencia_repetida';
    end if;
  end if;
  return new;
end $$;

-- 3) Después de guardar: aviso en la campana del admin, con la ciudad si no es Barcelona -------------
create or replace function public.essential_suggestions_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.noctua_admin_notify(
    'essential_suggestion',
    'Nueva sugerencia de esencial',
    new.name || ' · ' || new.street || coalesce(' ' || new.street_number, '')
      || case when new.city = 'madrid' then ' · Madrid' else '' end,
    '/admin/sugerencias'
  );
  return null;
exception when others then
  return null;
end $$;

-- Comprobación: debe salir la columna city y cuántas sugerencias hay de cada ciudad.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'essential_suggestions' and column_name = 'city';

select city, count(*) as sugerencias from public.essential_suggestions group by city order by city;
