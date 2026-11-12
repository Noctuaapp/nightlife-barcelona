-- =====================================================================================
-- Noctua · Enlace de compra de entradas de cada club · 12/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace: añade la columna clubs.tickets_url. Después, el admin (y el dueño del local) puede escribir el enlace
-- en la propia ficha del club, en el recuadro morado «Redes y entradas (solo lo ves tú)», fila «Entradas».
-- Con enlace, la ficha enseña el botón «Entradas» y cada clic se anota (tickets_click, con el dominio al que
-- va) en Admin › Datos › Clics, para poder hablar luego con cada local con datos reales.
-- =====================================================================================

alter table public.clubs add column if not exists tickets_url text;
