-- =====================================================================================
-- Noctua · horarios de 5 clubs (3 de Madrid, 2 de Barcelona) · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace:
--   - Pone horario y días de apertura SOLO donde están vacíos (nunca pisa nada).
--   - Antes de cambiar guarda lo que había en public.clubs_horarios_backup_20261115_tanda2.
--   - No toca nada más.
--
-- Ojo: Oops Barcelona Swinger Club y Seisynueve son de Barcelona y SE VEN en la web (los de Madrid siguen ocultos).
--
-- Fuente y horario de cada uno (los de madrugada están escritos como noche: «J-V 00:00-05:30» es la noche del
-- miércoles y la del jueves; así los lee la web):
--   867 Gabana (Madrid): J-V 00:00-05:30 | S-D 00:00-06:00   ← esMadrid (turismo oficial del Ayuntamiento)
--   910 Elefante Blanco (Madrid): V-S 20:00-06:00   ← esMadrid (turismo oficial del Ayuntamiento)
--   922 Panda Club Madrid (Madrid): S-D 00:30-06:00   ← esMadrid (turismo oficial del Ayuntamiento)
--   427 Oops Barcelona Swinger Club (Barcelona): L-J 23:00-05:00 | V 23:00-06:00 | S 17:00-07:00 | D 17:00-05:00   ← web oficial oops.barcelona
--   684 Seisynueve (Barcelona): L-J 17:30-02:00 | V-S 17:30-03:00 | D 18:00-02:00   ← web oficial 6y9.com (la web lleva «© 2013»)
--
-- No incluido por no poder verificarlo: Libert Swinger Club (su web da la apertura pero no la hora de cierre),
-- M7 y A Viva Voz (solo fuentes de terceros que no coinciden entre sí).
-- =====================================================================================

create table if not exists public.clubs_horarios_backup_20261115_tanda2 (
  id bigint primary key,
  hours_antes text,
  open_days_antes text[],
  guardado_el timestamptz not null default now()
);
alter table public.clubs_horarios_backup_20261115_tanda2 enable row level security;
revoke all on public.clubs_horarios_backup_20261115_tanda2 from anon, authenticated;

with m(id, nombre, horario, dias) as (
  values
  (867, 'Gabana', 'J-V 00:00-05:30 | S-D 00:00-06:00', array['Mié','Jue','Vie','Sáb']::text[]),
  (910, 'Elefante Blanco', 'V-S 20:00-06:00', array['Vie','Sáb']::text[]),
  (922, 'Panda Club Madrid', 'S-D 00:30-06:00', array['Vie','Sáb']::text[]),
  (427, 'Oops Barcelona Swinger Club', 'L-J 23:00-05:00 | V 23:00-06:00 | S 17:00-07:00 | D 17:00-05:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[]),
  (684, 'Seisynueve', 'L-J 17:30-02:00 | V-S 17:30-03:00 | D 18:00-02:00', array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[])
), objetivo as (
  select c.id, m.horario, m.dias
  from m
  join public.clubs c on c.id = m.id and c.name = m.nombre
), copia as (
  insert into public.clubs_horarios_backup_20261115_tanda2 (id, hours_antes, open_days_antes)
  select c.id, c.hours, c.open_days
  from public.clubs c join objetivo o on o.id = c.id
  on conflict (id) do nothing
  returning id
)
update public.clubs c
set hours = case when coalesce(btrim(c.hours), '') = '' then o.horario else c.hours end,
    open_days = case when (c.open_days is null or cardinality(c.open_days) = 0) then o.dias else c.open_days end
from objetivo o
where c.id = o.id;

-- Comprobación: los 5 clubs con su horario, días y si se ven en la web.
select c.id, c.name, c.city, c.hours, c.open_days, c.hidden
from public.clubs c
where c.id in (select id from public.clubs_horarios_backup_20261115_tanda2)
order by c.id;
