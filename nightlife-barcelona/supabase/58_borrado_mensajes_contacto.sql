-- =====================================================================================
-- Noctua · Borrado automático de mensajes de contacto · 30/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 57). Se puede repetir sin problema.
--
-- La política de Privacidad dice que los mensajes de Contacto se guardan como máximo 12 meses, y hasta
-- ahora nada los borraba. Esta función borra los de más de 12 meses. La llama cada lunes la tarea
-- /api/cron/purge-contact (queda anotada en vercel.json) y solo la puede ejecutar el servidor.
-- Con la web arrancada en septiembre de 2026, no borrará nada hasta septiembre de 2027.
-- =====================================================================================

create or replace function public.purge_old_contact_messages(p_months int default 12)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  -- Nunca menos de 12 meses, aunque alguien la llame con otro número.
  delete from public.contact_messages
  where created_at < now() - make_interval(months => greatest(p_months, 12));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.purge_old_contact_messages(int) from public, anon, authenticated;
grant execute on function public.purge_old_contact_messages(int) to service_role;

-- Comprobación: debe salir 1 fila con la función creada.
select proname from pg_proc where proname = 'purge_old_contact_messages';
