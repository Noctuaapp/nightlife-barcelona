-- =====================================================================================
-- Noctua · Esenciales de noche (Overture Maps) · 01/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema: no crea nada que ya
-- exista (misma categoría a menos de 15 m, o a menos de 150 m con el mismo nombre).
--
-- Todo entra OCULTO (hidden = true, import_source = 'overture'). Solo entran sitios de los que se
-- puede afirmar que sirven de noche:
--   - Farmacias cuyo propio nombre dice «24 horas».
--   - Dos CUAP (urgencias de atención primaria, abiertas 24 h).
--   - Cajeros Euro Automatic Cash de calle (sin horario, como hace el importador de OSM).
-- Comida y supermercados: Overture no trae horarios, así que no se puede saber si abren pasada la
-- 1:00 y no se añade ninguno.
--
-- Revisa en Admin › Esenciales (filtro ocultos) y publica los que confirmes.
-- =====================================================================================

with nuevos(name, category, address, neighborhood, open_hours, lat, lon) as (
  values
  ('Farmacia Dasca 24 Horas', 'Pharmacy', 'Rambla de la Marina, 441, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'Open 24 hours', 41.359428, 2.101682),
  ('Farmàcia Viayna 24 Hores', 'Pharmacy', 'Avinguda del President Companys, 45, 08911, Badalona', 'Badalona', 'Open 24 hours', 41.454695, 2.247755),
  ('CUAP Pura Fernández', 'Hospital', 'Carrer del Cobalt, 135, 08907, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', 'Open 24 hours', 41.356449, 2.104231),
  ('CUAP Disset de Setembre', 'Hospital', 'Carrer d''Empúries, 1-3, 08820, El Prat de Llobregat', 'El Prat de Llobregat', 'Open 24 hours', 41.323959, 2.097299),
  ('Cajero Euro Automatic Cash', 'ATM', 'Av. del Baix Llobregat, 75, 08940, Cornellà de Llobregat', 'Cornellà de Llobregat', null, 41.349792, 2.073187),
  ('Cajero Euro Automatic Cash', 'ATM', 'Carrer de Mestre Candi, 30, 08901, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', null, 41.361311, 2.109055),
  ('Cajero Euro Automatic Cash', 'ATM', 'Carrer de Laureà Miró, 38, 08950, Esplugues de Llobregat', 'Esplugues de Llobregat', null, 41.376696, 2.098051),
  ('Cajero Euro Automatic Cash', 'ATM', 'Carrer de Pérez Galdós, 20, 08903, L''Hospitalet de Llobregat', 'L''Hospitalet de Llobregat', null, 41.375975, 2.120759)
)
insert into public.essentials (name, category, subcategory, address, neighborhood, description, image, open_hours, maps_link, latitude, longitude, hidden, import_source)
select n.name, n.category, null, n.address, n.neighborhood, null, null, n.open_hours, null, n.lat, n.lon, true, 'overture'
from nuevos n
where not exists (
  select 1 from public.essentials e
  where e.category = n.category
    and nullif(e.latitude::text, '') is not null and nullif(e.longitude::text, '') is not null
    and (
      111320 * sqrt(power(nullif(e.latitude::text, '')::float8 - n.lat::float8, 2)
                  + power((nullif(e.longitude::text, '')::float8 - n.lon::float8) * cos(radians(n.lat::float8)), 2)) < 15
      or (
        111320 * sqrt(power(nullif(e.latitude::text, '')::float8 - n.lat::float8, 2)
                    + power((nullif(e.longitude::text, '')::float8 - n.lon::float8) * cos(radians(n.lat::float8)), 2)) < 150
        and public.noctua_norm_venue_name(e.name) = public.noctua_norm_venue_name(n.name)
      )
    )
);

select category, neighborhood, name, open_hours
from public.essentials
where import_source = 'overture'
order by category, neighborhood;
