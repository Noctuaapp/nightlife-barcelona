-- =====================================================================================
-- Noctua · Ajuste de permisos tras la revisión de seguridad (SQL 42) · 26/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Resultado de la revisión: ninguna tabla sin protección, ninguna regla que deje escribir a
-- cualquiera, nada de datos personales legible por todos, ninguna vista que se salte las reglas
-- y las fotos bien cerradas. Solo salieron funciones que se pueden llamar sin sesión; casi todas
-- son a propósito (contadores públicos, planes compartidos, resultados de encuestas) o ya se
-- protegen solas por dentro. Aquí se cierran las que no tienen por qué estar abiertas:
--   · noctua_purge_audit: borraba el registro de cambios de más de 13 meses sin comprobar quién
--     la llamaba. Ahora solo la usa el sistema (el panel de estado la llama por dentro).
--   · canjear / marcar ventajas de nivel y «volver a mostrar» un local: solo con sesión.
-- =====================================================================================

revoke all on function public.noctua_purge_audit() from public, anon, authenticated;

revoke all on function public.mark_perk_redemption_used(text) from public, anon;
grant execute on function public.mark_perk_redemption_used(text) to authenticated;

revoke all on function public.redeem_level_perk(text) from public, anon;
grant execute on function public.redeem_level_perk(text) to authenticated;

revoke all on function public.restore_denied_venue(text, bigint) from public, anon;
grant execute on function public.restore_denied_venue(text, bigint) to authenticated;

select 'Permisos ajustados' as resultado;
