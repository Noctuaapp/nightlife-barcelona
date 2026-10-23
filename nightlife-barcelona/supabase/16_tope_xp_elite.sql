-- =====================================================================================
-- Noctua · Tanda J (tope de XP en el máximo de Élite) · 23/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué arregla: el XP seguía subiendo por encima de 10000 aunque ya se hubiera llegado a Élite
-- (el nivel máximo — ver LEVELS en src/lib/xp.ts). Da igual qué función sea la que suma el XP
-- (award_xp/_grant_xp, do_checkin, evaluate_badges, un ajuste manual desde SQL...): en vez de
-- tener que localizar y tocar cada una por separado, este trigger actúa justo antes de guardar
-- cualquier UPDATE en profiles y, si el nuevo valor de xp supera 10000, lo recorta a 10000. Así
-- el contador nunca pasa del máximo sin importar de dónde venga la subida.
--
-- IMPORTANTE: 10000 es el mínimo de Élite en LEVELS (src/lib/xp.ts). Si ese número cambia algún
-- día, hay que cambiarlo también aquí abajo (en el "if new.xp > 10000").
-- =====================================================================================

create or replace function public.cap_profile_xp()
returns trigger
language plpgsql
as $$
begin
  if new.xp is not null and new.xp > 10000 then
    new.xp := 10000;
  end if;
  return new;
end;
$$;

drop trigger if exists cap_profile_xp_trigger on public.profiles;
create trigger cap_profile_xp_trigger
before update on public.profiles
for each row
when (new.xp is distinct from old.xp)
execute function public.cap_profile_xp();

-- Por si alguien ya se había quedado con más de 10000 guardado antes de este trigger (como tu
-- propio perfil de admin, puesto a propósito a 10000 en 14_admin_elite.sql pero que puede haber
-- seguido subiendo desde entonces).
update public.profiles set xp = 10000 where xp > 10000;

-- Verificación: debería verse el trigger, y ningún perfil con xp > 10000.
select tgname from pg_trigger where tgname = 'cap_profile_xp_trigger';
select count(*) as perfiles_por_encima_del_tope from public.profiles where xp > 10000;
