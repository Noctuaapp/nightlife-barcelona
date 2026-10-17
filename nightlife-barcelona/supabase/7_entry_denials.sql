-- =====================================================================================
-- Noctua · Tanda I (aviso "RLS Policy Always True" del Security Advisor) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- entry_denials guarda el motivo cuando a alguien le deniegan la entrada (lo rellena
-- NearbyVenuesSheet.tsx, la hoja de "sitios cercanos"). La política actual ("Allow public
-- insert entry_denials") deja insertar a CUALQUIERA, incluso sin haber iniciado sesión, con
-- cualquier dato (with_check = true, sin ninguna condición) — de ahí el aviso.
--
-- Por diseño de producto, elegir un motivo ya exige haber iniciado sesión (sin cuenta solo se
-- ven los 3 locales más cercanos, sin selector de motivo — ver el comentario en
-- NearbyVenuesSheet.tsx), así que la política puede ser bastante más estricta sin afectar a
-- nadie: solo usuarios logueados, y solo pudiendo guardar su propio user_id (no el de otra
-- persona). Esto no cambia nada de lo que ve o hace quien usa la web con normalidad.
-- =====================================================================================

drop policy if exists "Allow public insert entry_denials" on public.entry_denials;

create policy "Authenticated insert own entry_denials"
on public.entry_denials as permissive for insert to authenticated
with check (user_id = auth.uid());

-- Comprobación: debería quedar una sola política de INSERT, solo para "authenticated".
select policyname, cmd, permissive, roles, with_check
from pg_policies
where schemaname = 'public' and tablename = 'entry_denials' and cmd = 'INSERT';
