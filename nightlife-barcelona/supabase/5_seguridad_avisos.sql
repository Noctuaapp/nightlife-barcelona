-- =====================================================================================
-- Noctua · Tanda G (avisos del Security Advisor de Supabase) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Esto cubre SOLO los avisos que se pueden arreglar sin riesgo de romper nada y sin
-- necesitar ver antes el código de ninguna función:
--   1) "Function Search Path Mutable" en 7 funciones — un endurecimiento de seguridad
--      estándar (fija el esquema donde buscan las tablas) que no cambia su comportamiento.
--   2) "Security Definer View" en club_live_notes — la vista pasa a respetar los permisos
--      de quien consulta en vez de los de quien la creó. Es el arreglo que recomienda
--      Supabase, pero HAY QUE PROBAR después que "notas en vivo" del club sigue
--      funcionando igual para un usuario normal — si deja de verse algo, dímelo y lo reviso.
--   3) "Public Bucket Allows Listing" en storage.avatars — la política "Avatar público de
--      lectura" dejaba listar TODOS los avatares a cualquiera, sin excepción. Se cambia para
--      que cada cual solo pueda listar/consultar su propia carpeta. Esto NO afecta a cómo se
--      ve el avatar de otra persona en la web (eso usa getPublicUrl, que es una URL directa y
--      no pasa por esta política) — solo cierra la posibilidad de pedir "la lista completa".
--
-- Lo que falta (avisos del listado que NO están aquí, a propósito):
--   - "Leaked Password Protection Disabled" → es una función de pago (plan Pro de Supabase),
--     no se puede activar desde el plan Free. Alternativa gratuita ya añadida en el código:
--     el registro ya rechaza contraseñas muy obvias o repetidas.
--   - Las funciones admin_* que salen como ejecutables por cualquiera → quiero ver antes
--     su código real (la consulta para sacarlo está en el chat) para no arriesgarme a
--     romper el panel de admin arreglándolo a ciegas.
--   - "RLS Policy Always True" en entry_denials → necesito ver la política exacta primero.
-- =====================================================================================

-- 1) Search path fijo en las funciones que lo tenían sin fijar. Usa el catálogo de Postgres
--    para encontrar la firma exacta de cada una (nombre + tipos de argumentos), así no hace
--    falta adivinarla a mano ni arriesgarse a escribirla mal.
do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'is_noctua_admin', 'protect_profile_columns', 'noctua_night',
        'noctua_distance_m', 'protect_club_columns', 'protect_event_columns',
        'checkin_note_guard', 'attendances_guard'
      )
  loop
    execute format('alter function %I.%I(%s) set search_path = public', r.nspname, r.proname, r.args);
  end loop;
end $$;

-- 2) La vista deja de "saltarse" las políticas de seguridad de quien la consulta.
alter view public.club_live_notes set (security_invoker = on);

-- 3) El bucket de avatares deja de poder listarse por completo. Cada persona (logueada) solo
--    puede listar/leer su propia carpeta — igual que ya pasa con actualizar/borrar su avatar.
--    Ver un avatar ajeno en la web sigue funcionando porque eso usa la URL pública directa,
--    que no pasa por esta política.
drop policy if exists "Avatar público de lectura" on storage.objects;
create policy "Avatar público de lectura"
on storage.objects as permissive for select to public
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4) Comprobación: todas las funciones de la lista deberían salir con un search_path ya fijado.
select p.proname, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_noctua_admin', 'protect_profile_columns', 'noctua_night',
    'noctua_distance_m', 'protect_club_columns', 'protect_event_columns',
    'checkin_note_guard', 'attendances_guard'
  );
