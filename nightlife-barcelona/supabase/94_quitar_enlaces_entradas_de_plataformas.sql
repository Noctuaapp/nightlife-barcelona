-- =====================================================================================
-- Noctua · Quitar los enlaces de entradas que puso el SQL 93 · 12/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace: deja vacío tickets_url en los clubs cuyo enlace de entradas va a una plataforma de venta externa
-- (Xceed, Fever, Fourvenues, Entradium, Dice o Shotgun). Eran los que había puesto el 93, que se anuló porque
-- mandaba a los clubs a la competencia de Noctua. Un enlace puesto a mano a la web propia de un club NO se toca.
-- Al final enseña qué clubs se han limpiado.
-- =====================================================================================
update public.clubs
set tickets_url = null
where tickets_url ~* '^https?://([a-z0-9-]+\.)*(xceed\.me|feverup\.com|fourvenues\.com|entradium\.com|dice\.fm|shotgun\.live)(/|$)'
returning id, name;
