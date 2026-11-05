-- =====================================================================================
-- Noctua · Esenciales · Fase 0 (base) · 05/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace (todo aditivo: no borra ni cambia datos existentes salvo ocultar Hotel):
--   1) Tabla `cities` con Barcelona. Preparada para más ciudades; hoy solo la lee el importador.
--   2) Columnas nuevas en `essentials`, todas opcionales:
--        city_id, phone, website, is_24h, night_available, hours_note, kitchen_hours, attrs,
--        source, source_url, last_verified_at, verification_status
--      `source` se rellena desde `import_source` (lo que ya había).
--      `verification_status` empieza en 'unverified' para todo lo existente: nadie ha confirmado el
--      horario todavía. Se pasa a 'verified' desde Admin › Esenciales con «Verificado hoy».
--   3) Hotel sale de Esenciales: las filas se ocultan (hidden = true), no se borran. Para recuperar
--      un hotel:  update public.essentials set hidden = false where id = X;
--   4) Las sugerencias de usuarios aceptan las categorías nuevas.
-- =====================================================================================

-- 1) Ciudades ----------------------------------------------------------------------------
create table if not exists public.cities (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  country text not null default 'ES',
  timezone text not null default 'Europe/Madrid',
  latitude double precision,
  longitude double precision,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cities (slug, name, latitude, longitude)
values ('barcelona', 'Barcelona', 41.3874, 2.1686)
on conflict (slug) do nothing;

alter table public.cities enable row level security;

drop policy if exists "Ciudades: leer" on public.cities;
create policy "Ciudades: leer" on public.cities for select to anon, authenticated using (true);

drop policy if exists "Ciudades: admin" on public.cities;
create policy "Ciudades: admin" on public.cities for all to authenticated
  using (public.is_noctua_admin()) with check (public.is_noctua_admin());

grant select on public.cities to anon, authenticated;

-- 2) Columnas nuevas en essentials ---------------------------------------------------------
alter table public.essentials
  add column if not exists city_id bigint references public.cities(id),
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists is_24h boolean,
  add column if not exists night_available boolean,
  add column if not exists hours_note text,
  add column if not exists kitchen_hours text,
  add column if not exists attrs jsonb not null default '{}'::jsonb,
  add column if not exists source text,
  add column if not exists source_url text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_status text not null default 'unverified';

alter table public.essentials drop constraint if exists essentials_verification_status_check;
alter table public.essentials
  add constraint essentials_verification_status_check
  check (verification_status in ('verified', 'unverified', 'needs_review'));

alter table public.essentials drop constraint if exists essentials_source_check;
alter table public.essentials
  add constraint essentials_source_check
  check (source is null or source in ('official_municipal', 'official_operator', 'business_site', 'business', 'osm', 'overture', 'google', 'manual', 'user'));

-- Barcelona por defecto (y para todo lo que ya existe).
do $$
declare
  bcn bigint;
begin
  select id into bcn from public.cities where slug = 'barcelona';
  update public.essentials set city_id = bcn where city_id is null;
  execute format('alter table public.essentials alter column city_id set default %s', bcn);
end $$;

create index if not exists essentials_city_category_idx on public.essentials (city_id, category);

-- `source` desde lo que ya sabíamos del origen de cada fila. Lo que no tiene origen conocido se
-- queda en NULL (mejor «no se sabe» que inventarlo).
update public.essentials
set source = case lower(coalesce(import_source, ''))
  when 'osm' then 'osm'
  when 'overture' then 'overture'
  when 'google' then 'google'
  when 'nitbus' then 'osm'
  else source
end
where source is null and import_source is not null;

-- 3) Hotel fuera de Esenciales ----------------------------------------------------------------
update public.essentials set hidden = true where lower(category) = 'hotel' and coalesce(hidden, false) = false;

-- 3b) Taxi: las filas de antes eran oficinas y apps (Uber, Cabify, FREE NOW…), no paradas. Se ocultan para
--     que no se mezclen con las paradas reales que se importen ahora.
update public.essentials
set hidden = true
where lower(category) = 'taxi'
  and coalesce(hidden, false) = false
  and name ~* '(cabify|uber|bolt|free\s?now|oficina|office|headquarter)';

-- 4) Sugerencias: categorías nuevas ------------------------------------------------------------
alter table public.essential_suggestions drop constraint if exists essential_suggestions_category_check;
alter table public.essential_suggestions
  add constraint essential_suggestions_category_check
  check (category in ('Pharmacy', 'ATM', 'Food', 'Supermarket', 'Hospital', 'Gas Station', 'Taxi', 'Veterinary', 'Toilets', 'Vending', 'Other'));

-- Comprobación: cuántas filas hay por categoría y cuántas siguen sin verificar.
select category,
       count(*) filter (where coalesce(hidden, false) = false) as visibles,
       count(*) filter (where verification_status = 'verified') as verificadas
from public.essentials
group by category
order by category;
