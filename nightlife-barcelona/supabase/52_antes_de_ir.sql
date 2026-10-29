-- =====================================================================================
-- Noctua · Bloque «Antes de ir» de la ficha del club · 29/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 51). Se puede repetir sin problema.
--
-- Crea cinco campos de texto, todos vacíos al principio. La ficha solo enseña el bloque cuando
-- alguno tiene contenido, así que no cambia nada hasta que se rellenen. Se rellenan tocando el
-- texto en la propia ficha (el admin, o el dueño vinculado a ese club):
--   highlights  · «Lo mejor»      — una frase por línea (se enseñan hasta 5)
--   watchouts   · «Ojo con esto»  — una frase por línea (se enseñan hasta 5)
--   tip         · «Consejo de Noc» — una o dos frases
--   peak_hours  · «Hora punta»    — por ejemplo «02:30 – 05:00»
--   audience    · «Para quién es» — por ejemplo «Gente de 20 a 30 años, mucho turista»
--
-- Regla de la casa: vacío antes que inventado. Solo se rellena lo que se ha comprobado.
-- =====================================================================================

alter table public.clubs
  add column if not exists highlights text,
  add column if not exists watchouts text,
  add column if not exists tip text,
  add column if not exists peak_hours text,
  add column if not exists audience text;

-- Comprobación: las cinco columnas existen (debe salir una fila por columna).
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'clubs'
  and column_name in ('highlights', 'watchouts', 'tip', 'peak_hours', 'audience')
order by column_name;
