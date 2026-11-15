-- =====================================================================================
-- Noctua · Esenciales · hospitales de Barcelona con urgencias 24 h verificadas · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace (solo 5 esenciales, los que he podido comprobar en su web oficial hoy):
--   - Los marca como 24 h y como verificados hoy, y guarda la web oficial donde se comprobó (source_url, solo si estaba vacía).
--   - Con esto la web pasa de «Horario sin confirmar» a «Abierto 24 h», y cuentan en «Disponible ahora».
--   - Los hospitales son categoría estricta: la verificación caduca a los 90 días; entonces vuelven a «sin confirmar».
--   - No toca ningún otro dato. Antes de cambiar nada guarda lo que había en public.essentials_hospitales_backup_20261115.
--
-- Fuente de cada uno:
--   341 Hospital Clínic: web del Hospital Clínic: urgencias abiertas 24 h, 365 días
--   340 Hospital de la Santa Creu i Sant Pau: web de Sant Pau: urgencias «obert 24 hores»
--   343 Hospital Vall d'Hebron: web de Vall d’Hebron: urgencias siempre abiertas, 24 h, 365 días
--   587 Hospital Universitari de Bellvitge - Urgències: web de Bellvitge: urgencias 24 h, 365 días
--   611 CUAP Casernes: Generalitat de Catalunya: «Horari: 24 hores»
--
-- No incluidos por no poder confirmarlos hoy en su web oficial: el resto de hospitales y CUAP (Hospital del Mar, Germans Trias,
-- Sant Joan de Déu, H. General de l'Hospitalet, H. Municipal de Badalona, Esperit Sant, Diagonal, los otros 4 CUAP) y CAP Roger de Flor
-- (dice «24 h» pero un CAP normalmente cierra por la noche: pendiente de revisar).
-- =====================================================================================

create table if not exists public.essentials_hospitales_backup_20261115 (
  id bigint primary key,
  is_24h_antes boolean,
  open_hours_antes text,
  verification_status_antes text,
  last_verified_at_antes timestamptz,
  source_url_antes text,
  guardado_el timestamptz not null default now()
);
alter table public.essentials_hospitales_backup_20261115 enable row level security;
revoke all on public.essentials_hospitales_backup_20261115 from anon, authenticated;

with m(id, nombre, url) as (
  values
  (341, 'Hospital Clínic', 'https://www.clinicbarcelona.org/en/assistance/urgencies'),
  (340, 'Hospital de la Santa Creu i Sant Pau', 'https://www.santpau.cat/urgencies1'),
  (343, 'Hospital Vall d''Hebron', 'https://hospital.vallhebron.com/pacients/urgencies/adult/moment-admissio'),
  (587, 'Hospital Universitari de Bellvitge - Urgències', 'https://bellvitgehospital.cat/en/services/accident-and-emergency'),
  (611, 'CUAP Casernes', 'http://serveisoberts.gencat.cat/equipaments/3621372')
), objetivo as (
  select e.id, m.url
  from m
  join public.essentials e on e.id = m.id and e.name = m.nombre and e.category = 'Hospital'
), copia as (
  insert into public.essentials_hospitales_backup_20261115 (id, is_24h_antes, open_hours_antes, verification_status_antes, last_verified_at_antes, source_url_antes)
  select e.id, e.is_24h, e.open_hours, e.verification_status, e.last_verified_at, e.source_url
  from public.essentials e join objetivo o on o.id = e.id
  on conflict (id) do nothing
  returning id
)
update public.essentials e
set is_24h = true,
    open_hours = case when coalesce(btrim(e.open_hours), '') = '' then 'Open 24 hours' else e.open_hours end,
    verification_status = 'verified',
    last_verified_at = now(),
    source_url = case when coalesce(btrim(e.source_url), '') = '' then o.url else e.source_url end
from objetivo o
where e.id = o.id;

-- Comprobación: deben salir los 5, con is_24h = true y verificados hoy.
select e.id, e.name, e.is_24h, e.open_hours, e.verification_status, e.last_verified_at, e.source_url
from public.essentials e
where e.id in (select id from public.essentials_hospitales_backup_20261115)
order by e.id;
