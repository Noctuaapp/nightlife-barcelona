-- =====================================================================================
-- Noctua · Horarios en un solo formato (para que salgan «abierto» y «cerrado») · 14/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- POR QUÉ: la web solo sabe leer horarios escritos como «J-S 23:00-06:00» o «L/M/X 23:00-06:00, V/S 23:00-07:00».
-- 119 de los 365 locales visibles tenían el horario escrito de otra forma («Jue-Sa 23:55-06:00»,
-- «Jueves-sábado 20:00–2:30/3:00», «L/M/X/J: 00:00-05:00h. V/S/D: 00:00-06:00h.»…), y esos no salían nunca como
-- abiertos ni como cerrados, ni entraban en el filtro «Abiertos ahora».
--
-- QUÉ HACE: reescribe 74 formas de escribir el horario (79 locales) en el formato que sí se lee. Solo cambia la FORMA:
-- los días y las horas son los mismos que ponía el texto. Dos criterios, por si en el texto había dos opciones:
--     · «2:30/3:00» (cierra a una u otra hora)   → se pone la más temprana (mejor decir «cerrado» media hora antes
--       que mandar a alguien a una puerta cerrada).
--     · «20:00/21:00» (abre a una u otra hora)   → se pone la más tardía, por lo mismo.
--   «viernes-sábado hasta 3:00» detrás de «todos los días 18:00–2:00» usa la apertura de ese mismo texto (18:00).
--
-- QUÉ NO TOCA (siguen sin leerse, a propósito, porque inventar una hora sería peor que no saberla):
--     · Los que solo dicen cuándo cierran («Viernes-sábado hasta las 3:00»): falta la hora de apertura. Rellénala desde
--       Admin cuando la sepas.
--     · «Horario no especificado», «Según programación», «consultar», «Hasta medianoche»…
--     · «L-J 19:00-02:00. V-S» (Tandem): faltan las horas del viernes y el sábado.
--
-- SE PUEDE DESHACER: antes de cambiar nada se guarda cada horario original en public.clubs_hours_backup_20261114. Para
-- devolverlos todos:
--     update public.clubs c set hours = b.hours_antes from public.clubs_hours_backup_20261114 b where c.id = b.id;
-- =====================================================================================

create table if not exists public.clubs_hours_backup_20261114 (
  id bigint primary key,
  hours_antes text,
  hours_despues text,
  guardado_el timestamptz not null default now()
);
alter table public.clubs_hours_backup_20261114 enable row level security;
revoke all on public.clubs_hours_backup_20261114 from public, anon, authenticated;

-- 1) Copia de lo que se cambia (una vez por local: si se repite el SQL no pisa la copia original) y 2) cambio, en
--    una sola orden: o se hace todo o no se hace nada.
with m (viejo, nuevo) as (
  values
    ('Jue-Sa 23:55-06:00', 'J-S 23:55-06:00'),
    ('Jue-Sa 23:30-06:00', 'J-S 23:30-06:00'),
    ('Todos los días 16:00–2:00', '16:00-02:00'),
    ('Vi-Sa 23:55-06:00', 'V/S 23:55-06:00'),
    ('J/V/S: 23:00-03:00h', 'J-S 23:00-03:00'),
    ('Jue-Sa 00:00-06:00', 'J-S 00:00-06:00'),
    ('Jue-Sa 22:00-03:00', 'J-S 22:00-03:00'),
    ('Jueves 22:30–2:30, viernes-sábado 22:30–3:00', 'J 22:30-02:30, V/S 22:30-03:00'),
    ('Jueves 23:00–0:00, viernes-sábado 23:00–3:30', 'J 23:00-00:00, V/S 23:00-03:30'),
    ('Jueves y domingo 21:00–2:30, viernes y sábado 21:00–3:00', 'J/D 21:00-02:30, V/S 21:00-03:00'),
    ('Jueves-sábado 20:00–2:30/3:00, lunes-miércoles y domingo cerrado', 'J-S 20:00-02:30'),
    ('Jueves-sábado 20:00–5:00', 'J-S 20:00-05:00'),
    ('Jueves-sábado 20:00/21:00–3:00/3:30', 'J-S 21:00-03:00'),
    ('Jueves-sábado 23:00–2:30/3:00', 'J-S 23:00-02:30'),
    ('L-D 21:00-03:00 | V-S hasta 04:00', 'L/M/X/J/D 21:00-03:00, V/S 21:00-04:00'),
    ('L-J 18:00-02:15 | V/S hasta 03:00', 'L-J 18:00-02:15, V/S 18:00-03:00'),
    ('L-X 18:00-02:30 | J-S hasta 03:00', 'L-X 18:00-02:30, J-S 18:00-03:00'),
    ('L/D: 18:00h-00:00h. M/X: 18:00h-01:00h. J/V/S: 18:00h-02:00h', 'L/D 18:00-00:00, M/X 18:00-01:00, J-S 18:00-02:00'),
    ('L/M/X/J: 00:00-05:00h. V/S/D: 00:00-06:00h.', 'L-J 00:00-05:00, V-D 00:00-06:00'),
    ('L/M/X/J: 20:00-02:30h   V/S/D: 20:00-03:00h', 'L-J 20:00-02:30, V-D 20:00-03:00'),
    ('L/M/X/J/D: 23:00-04:00h.  V/S: 23:00-06:00h.', 'L/M/X/J/D 23:00-04:00, V/S 23:00-06:00'),
    ('L/M/X/J/V/D :20:00–02:30 S: 20:00-03:00h', 'L/M/X/J/V/D 20:00-02:30, S 20:00-03:00'),
    ('Lun-jue 12:00–2:00, viernes 12:00–3:00, sáb-dom 10:00–2:00/3:00', 'L-J 12:00-02:00, V 12:00-03:00, S/D 10:00-02:00'),
    ('Lun-jue y dom 11:00–2:30, viernes-sábado 11:00–3:30', 'L/M/X/J/D 11:00-02:30, V/S 11:00-03:30'),
    ('Lun-jue y dom 12:30–0:00, viernes y sábado 12:30–2:30', 'L/M/X/J/D 12:30-00:00, V/S 12:30-02:30'),
    ('Lun-jue y dom 17:00–0:30, viernes y sábado 17:00–2:30', 'L/M/X/J/D 17:00-00:30, V/S 17:00-02:30'),
    ('Lun-jue y dom 17:00–3:00, viernes-sábado 17:00–5:00', 'L/M/X/J/D 17:00-03:00, V/S 17:00-05:00'),
    ('Lun-jue y dom 18:00–0:00, viernes y sábado 20:00–3:00', 'L/M/X/J/D 18:00-00:00, V/S 20:00-03:00'),
    ('Lun-jue y dom 19:00–2:30, viernes-sábado 19:00–3:30', 'L/M/X/J/D 19:00-02:30, V/S 19:00-03:30'),
    ('Lun/mié/jue/dom 21:00–2:30, vie-sáb 21:00–3:00, martes cerrado', 'L/X/J/D 21:00-02:30, V/S 21:00-03:00'),
    ('Lunes 22:30–6:00, jueves-sábado 23:30–6:00', 'L 22:30-06:00, J-S 23:30-06:00'),
    ('Lunes-jueves 18:00–3:00, viernes-domingo 17:30–3:00/3:30', 'L-J 18:00-03:00, V-D 17:30-03:00'),
    ('M/X/J 17:00-00:00h. V:17:00-02:30h.  S: 12:00-02:30h. D: 12:00-00:00h', 'M-J 17:00-00:00, V 17:00-02:30, S 12:00-02:30, D 12:00-00:00'),
    ('M/X/J/D: 19:00-03:00.  V/S: 19:00-2:30', 'M/X/J/D 19:00-03:00, V/S 19:00-02:30'),
    ('Ma-Do 19:00-02:30', 'M-D 19:00-02:30'),
    ('Mar-dom 19:00–2:30/3:00, lunes cerrado', 'M-D 19:00-02:30'),
    ('Mar-jue y dom 19:30–2:30, vie-sáb 19:30–3:30, lunes cerrado', 'M/X/J/D 19:30-02:30, V/S 19:30-03:30'),
    ('Martes-domingo 17:00–2:30/3:00', 'M-D 17:00-02:30'),
    ('Martes-domingo 19:00–2:30/3:00', 'M-D 19:00-02:30'),
    ('Martes-jueves 21:00–2:30, viernes-sábado 21:00–3:00, lunes y domingo cerrado', 'M-J 21:00-02:30, V/S 21:00-03:00'),
    ('Mi-Do 19:00-03:00', 'X-D 19:00-03:00'),
    ('Mi-Do 23:55-06:00', 'X-D 23:55-06:00'),
    ('Mi-Sa 23:00-05:00', 'X-S 23:00-05:00'),
    ('Miércoles 23:00–1:30, jueves 23:00–2:00, viernes-sábado 23:00–3:30', 'X 23:00-01:30, J 23:00-02:00, V/S 23:00-03:30'),
    ('Miércoles-domingo 20:00–2:30/3:00', 'X-D 20:00-02:30'),
    ('Miércoles-jueves 22:30–2:30, viernes-sábado 22:30–3:00', 'X/J 22:30-02:30, V/S 22:30-03:00'),
    ('Miércoles-jueves y domingo 19:00–0:00, viernes-sábado 19:00–3:00', 'X/J/D 19:00-00:00, V/S 19:00-03:00'),
    ('Miércoles-sábado 22:00/23:00–2:30/3:00', 'X-S 23:00-02:30'),
    ('Solo sábado 00:00–5:30', 'S 00:00-05:30'),
    ('Solo sábado 23:30–6:00', 'S 23:30-06:00'),
    ('Solo viernes 23:00–5:00', 'V 23:00-05:00'),
    ('Solo viernes-sábado 23:00–3:00', 'V/S 23:00-03:00'),
    ('Todos los días 13:00/17:00–2:00', '17:00-02:00'),
    ('Todos los días 16:00–3:00', '16:00-03:00'),
    ('Todos los días 18:00–1:30/3:00', '18:00-01:30'),
    ('Todos los días 18:00–2:00, viernes-sábado hasta 3:00', 'L/M/X/J/D 18:00-02:00, V/S 18:00-03:00'),
    ('Todos los días 18:00–2:00/3:00', '18:00-02:00'),
    ('Todos los días 18:00–2:30, viernes-sábado hasta 3:00', 'L/M/X/J/D 18:00-02:30, V/S 18:00-03:00'),
    ('Todos los días 18:30–3:00/3:30', '18:30-03:00'),
    ('Todos los días 18:30/19:00–1:00, viernes-sábado hasta 2:30, lunes y domingo cerrado', 'M-J 19:00-01:00, V/S 19:00-02:30'),
    ('Todos los días 19:00–2:30/3:00', '19:00-02:30'),
    ('Todos los días 20:00–2:30/3:00', '20:00-02:30'),
    ('Todos los días 22:00–3:00', '22:00-03:00'),
    ('V-S 23:55-06:00h', 'V/S 23:55-06:00'),
    ('V/S: 23:00-3:00h', 'V/S 23:00-03:00'),
    ('V/S/D: 23:30-06:00h.', 'V-D 23:30-06:00'),
    ('Vi-Sa 23:30-06:00. Abierto Festivos.', 'V/S 23:30-06:00'),
    ('Viernes y sábado 22:00–3:00', 'V/S 22:00-03:00'),
    ('Viernes y sábado 23:00–3:30', 'V/S 23:00-03:30'),
    ('Viernes y sábado 23:00–6:00', 'V/S 23:00-06:00'),
    ('Viernes y sábado 23:30–6:00, domingo 23:30–5:00', 'V/S 23:30-06:00, D 23:30-05:00'),
    ('Viernes-sábado 23:55–6:00, domingo 21:00–6:00', 'V/S 23:55-06:00, D 21:00-06:00'),
    ('Viernes, sábado y domingo 18:00–3:00', 'V-D 18:00-03:00'),
    ('X/J/V: 00:00-05:00 S/D: 00:00-06:00', 'X-V 00:00-05:00, S/D 00:00-06:00')
),
copia as (
  insert into public.clubs_hours_backup_20261114 (id, hours_antes, hours_despues)
  select c.id, c.hours, m.nuevo
  from public.clubs c
  join m on btrim(c.hours) = btrim(m.viejo)
  on conflict (id) do nothing
  returning id
)
update public.clubs c
set hours = m.nuevo
from m
where btrim(c.hours) = btrim(m.viejo);

-- 3) Resultado: cuántos se han arreglado y cuántos siguen sin poder leerse.
select
  (select count(*) from public.clubs_hours_backup_20261114) as locales_arreglados_en_total,
  (select count(*) from public.clubs c
    where coalesce(c.hidden, false) = false and nullif(btrim(c.hours), '') is not null
      and exists (select 1 from regexp_split_to_table(c.hours, '[,|;]') p
                  where btrim(p) !~ '^([LMXJVSD/-]+\s+)?\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$')) as visibles_que_siguen_ilegibles,
  (select count(*) from public.clubs c where coalesce(c.hidden, false) = false and nullif(btrim(c.hours), '') is null) as visibles_sin_horario;
