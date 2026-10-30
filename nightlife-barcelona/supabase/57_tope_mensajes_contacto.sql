-- =====================================================================================
-- Noctua · Tope de mensajes de contacto · 30/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 56). Se puede repetir sin problema.
--
-- El formulario de Contacto exige cuenta, pero no había ningún límite de mensajes: con los avisos por
-- email activos, una sola cuenta podría llenarte la bandeja. Ahora cada cuenta puede enviar como
-- máximo 5 mensajes cada 24 horas (tú, como admin, no tienes tope). Al llegar al tope, la web
-- enseña un aviso claro y la dirección de correo.
-- =====================================================================================

create or replace function public.contact_messages_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and not coalesce(public.is_noctua_admin(), false) then
    if (
      select count(*) from public.contact_messages
      where user_id = new.user_id and created_at > now() - interval '24 hours'
    ) >= 5 then
      raise exception 'contact_rate_limit';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists contact_messages_limit_trg on public.contact_messages;
create trigger contact_messages_limit_trg
  before insert on public.contact_messages
  for each row execute function public.contact_messages_limit();

-- Comprobación: debe salir 1 fila con el disparador creado.
select tgname, tgrelid::regclass as tabla from pg_trigger where tgname = 'contact_messages_limit_trg';
