-- =====================================================================================
-- Noctua · Bacon Bear Bar (id 674) · horario y promociones · 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace (solo el club 674, Bacon Bear Bar, Carrer de Casanova 64):
--   - Pone el horario y los días de apertura.
--   - Pone las tres promociones en «Promoción» (discount_info), cada una con sus días y horas.
--   - Antes de cambiar nada guarda lo que había en public.clubs_bacon_bear_backup_20261115.
--
-- Fuente: web oficial del local (baconbearbar.com/inicio), datos facilitados por Jordi el 15/11/2026.
--   Horario general: lunes a miércoles 18:00/18:30 a 02:30; jueves 19:00 a 02:30; viernes y sábado 18:30 a 03:00
--   (hasta las 03:30 en verano); domingo 18:00 a 02:30.
--   Promociones: Súper Tardeo (lun-mié 18:30-22:00, ofertas en cerveza), Happy Bacon (jueves 19:00-22:00, aperitivos),
--   Domingos BB+ (domingos 18:00-22:00, precios especiales).
--
-- Dos criterios, porque el horario tiene dos opciones y la web no las separa:
--   · Lunes a miércoles abre «18:00/18:30»: se pone 18:30 (la promoción Súper Tardeo empieza a las 18:30; mejor decir
--     «cerrado» media hora antes que mandar a alguien a una puerta cerrada).
--   · Viernes y sábado cierra a las 03:00; las 03:30 de verano no se ponen (es solo en temporada). Cuando empiece el
--     verano se puede cambiar el horario a 03:30 desde Admin.
--
-- Para deshacerlo hay un archivo aparte (121_DESHACER_...).
-- =====================================================================================

create table if not exists public.clubs_bacon_bear_backup_20261115 (
  id bigint primary key,
  hours_antes text,
  open_days_antes text[],
  discount_info_antes text,
  guardado_el timestamptz not null default now()
);
alter table public.clubs_bacon_bear_backup_20261115 enable row level security;
revoke all on public.clubs_bacon_bear_backup_20261115 from anon, authenticated;

with copia as (
  insert into public.clubs_bacon_bear_backup_20261115 (id, hours_antes, open_days_antes, discount_info_antes)
  select c.id, c.hours, c.open_days, c.discount_info
  from public.clubs c
  where c.id = 674 and c.name = 'Bacon Bear Bar'
  on conflict (id) do nothing
  returning id
)
update public.clubs c
set hours = 'L/M/X 18:30-02:30, J 19:00-02:30, V/S 18:30-03:00, D 18:00-02:30',
    open_days = array['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']::text[],
    discount_info = 'Súper Tardeo: lunes a miércoles, 18:30-22:00 (ofertas en cerveza). Happy Bacon: jueves, 19:00-22:00 (aperitivos). Domingos BB+: domingos, 18:00-22:00 (precios especiales).'
where c.id = 674 and c.name = 'Bacon Bear Bar';

-- Comprobación: una fila con lo que había antes y lo que hay ahora.
select c.id, c.name, c.hidden,
       b.hours_antes, c.hours as hours_ahora,
       b.discount_info_antes, c.discount_info as promocion_ahora,
       c.open_days as dias_ahora
from public.clubs c
left join public.clubs_bacon_bear_backup_20261115 b on b.id = c.id
where c.id = 674;
