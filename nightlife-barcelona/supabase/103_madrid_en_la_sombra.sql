-- =====================================================================================
-- Noctua · Madrid en la sombra · 14/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema (no duplica nada).
--
-- Qué hace: apunta Madrid en la tabla `cities` como ciudad NO abierta (enabled = false). No toca ningún club,
-- ni ninguna ficha, ni nada de lo que ve el público. La web no cambia.
--
-- Cuando se abra Madrid al público, el mismo día:
--   update public.cities set enabled = true where slug = 'madrid';
-- (y prelaunch: false en Madrid dentro de src/lib/cities.ts).
-- =====================================================================================

insert into public.cities (slug, name, latitude, longitude, enabled)
values ('madrid', 'Madrid', 40.4168, -3.7038, false)
on conflict (slug) do nothing;

-- Comprobación: debe salir Barcelona con enabled = true y Madrid con enabled = false.
select slug, name, enabled from public.cities order by id;
