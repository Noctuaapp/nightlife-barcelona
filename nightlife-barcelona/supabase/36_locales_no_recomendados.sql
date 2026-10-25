-- =====================================================================================
-- Noctua · Locales que no te recomendamos (para siempre, hasta que tú digas) · 25/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 35). Se puede repetir sin problema.
--
-- Cuando a alguien no le dejan entrar en un local y lo cuenta, la web deja de recomendárselo
-- PARA SIEMPRE (antes eran 90 días). En su perfil ve la lista de esos locales y puede pulsar
-- "Volver a mostrarlo". El aviso NO se borra (sigue contando en tus estadísticas y en las del
-- local): solo se marca restored_at, la fecha en que la persona pidió volver a verlo.
-- =====================================================================================

alter table public.entry_denials add column if not exists restored_at timestamptz;

create or replace function public.restore_denied_venue(p_venue_type text, p_venue_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    raise exception 'sin sesión';
  end if;
  update public.entry_denials
  set restored_at = now()
  where user_id = auth.uid() and venue_type = p_venue_type and venue_id = p_venue_id and restored_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.restore_denied_venue(text, bigint) from public;
grant execute on function public.restore_denied_venue(text, bigint) to authenticated;

select 'Locales no recomendados: listo' as resultado;
