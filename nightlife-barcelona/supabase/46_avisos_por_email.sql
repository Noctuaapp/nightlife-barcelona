-- =====================================================================================
-- Noctua · Avisos del admin por email · 26/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 45). Se puede repetir sin problema.
--
--   · Al momento: mensajes de Contáctanos, denuncias, alertas y cualquier aviso «Importante».
--     La base de datos avisa a la web (www.noctuaapp.com/api/admin/notify-email) y la web manda
--     el email con Resend.
--   · Cada mañana: un resumen con el resto (usuarios nuevos, opiniones, cambios de dueños...).
--
-- AL FINAL te sale una clave (columna «NOTIFY_SECRET para Vercel»): cópiala en Vercel como
-- variable NOTIFY_SECRET. Es la contraseña con la que la base de datos se identifica ante la web.
-- =====================================================================================

alter table public.admin_notifications add column if not exists emailed_at timestamptz;

-- Para que la base de datos pueda llamar a la web (extensión oficial de Supabase).
create extension if not exists pg_net with schema extensions;

-- Clave compartida, guardada cifrada en el Vault de Supabase (se crea solo la primera vez).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'noctua_notify_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'noctua_notify_secret', 'Avisos del admin por email');
  end if;
end $$;

create or replace function public.noctua_admin_notify_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  secret text;
begin
  if not (new.important or new.kind in ('message', 'report', 'alert')) then
    return null; -- va en el resumen diario
  end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'noctua_notify_secret';
  if secret is null then return null; end if;
  perform net.http_post(
    url := 'https://www.noctuaapp.com/api/admin/notify-email',
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret),
    timeout_milliseconds := 8000
  );
  return null;
exception when others then
  return null; -- un fallo de email nunca impide guardar el aviso
end $$;

revoke all on function public.noctua_admin_notify_email() from public, anon, authenticated;

drop trigger if exists noctua_admin_notify_email on public.admin_notifications;
create trigger noctua_admin_notify_email after insert on public.admin_notifications
  for each row execute function public.noctua_admin_notify_email();

-- Copia este valor en Vercel › Settings › Environment Variables como NOTIFY_SECRET (tipo Secret).
select decrypted_secret as "NOTIFY_SECRET para Vercel"
from vault.decrypted_secrets where name = 'noctua_notify_secret';
