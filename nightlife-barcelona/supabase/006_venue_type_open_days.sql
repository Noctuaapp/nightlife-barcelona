-- Añade el tipo de local (Discoteca / Pub / Bar musical) y los días de apertura a "clubs".
-- Pégalo entero en Supabase → SQL Editor → Run, una sola vez.

alter table clubs
add column if not exists venue_type text not null default 'Discoteca'
check (venue_type in ('Discoteca', 'Pub', 'Bar musical'));

-- Array de días abreviados: 'Lun','Mar','Mié','Jue','Vie','Sáb','Dom'.
-- NULL o vacío = "sin dato" -> "Planifica tu noche" no filtra ese club por día.
alter table clubs
add column if not exists open_days text[];
