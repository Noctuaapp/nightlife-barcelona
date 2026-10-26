-- =====================================================================================
-- Noctua · Encontrar las fotos que ocupan espacio sin usarse · 26/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 46). Se puede repetir sin problema.
--
-- El almacenamiento de fotos iba ya por el 73 % del plan gratis. Las tareas de cada noche que
-- traen fotos de Google creaban archivos nuevos cada vez y los anteriores se quedaban guardados
-- aunque ya no los usaba ninguna ficha (ya corregido en el código). Esta función solo LISTA esos
-- archivos de las carpetas automáticas (club-photos, event-photos, essential-photos); el botón
-- «Liberar espacio» de Admin › Ajustes y herramientas es el que los borra.
-- Nunca toca las carpetas de las fotos que subes tú a mano (club-images, event-images...).
-- =====================================================================================

create or replace function public.admin_storage_orphans(p_bucket text, p_limit int default 1000)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
stable
as $$
declare
  result jsonb;
begin
  -- Solo el admin, la web (clave de servidor) o tú desde el SQL Editor.
  if not (public.is_noctua_admin()
          or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
          or session_user in ('postgres', 'supabase_admin')) then
    raise exception 'No autorizado';
  end if;
  if p_bucket not in ('club-photos', 'event-photos', 'essential-photos') then
    raise exception 'Carpeta no permitida';
  end if;

  with urls as (
    -- Todas las fotos que usa alguna ficha (portada y galería), estén en la columna que estén.
    select to_jsonb(c) as r from public.clubs c
    union all select to_jsonb(e) from public.events e
    union all select to_jsonb(s) from public.essentials s
    union all select to_jsonb(ce) from public.club_events ce
    union all select to_jsonb(cs) from public.club_sessions cs
    union all select to_jsonb(es) from public.event_sessions es
  ),
  refs as (
    select distinct split_part(regexp_replace(u, '^.*/storage/v1/object/public/[^/]+/', ''), '?', 1) as name
    from (
      select r->>'image' as u from urls
      union all
      select jsonb_array_elements_text(case when jsonb_typeof(r->'gallery') = 'array' then r->'gallery' else '[]'::jsonb end) from urls
    ) x
    where u is not null and u like '%/storage/v1/object/public/%'
  ),
  orphans as (
    select o.name, coalesce((o.metadata->>'size')::bigint, 0) as bytes
    from storage.objects o
    where o.bucket_id = p_bucket
      and o.created_at < now() - interval '1 day' -- nunca lo recién subido
      and not exists (select 1 from refs where refs.name = o.name)
  )
  select jsonb_build_object(
    'bucket', p_bucket,
    'count', (select count(*) from orphans),
    'mb', round((select coalesce(sum(bytes), 0) from orphans) / 1048576.0, 1),
    'names', coalesce((select jsonb_agg(name) from (select name from orphans order by name limit greatest(1, least(p_limit, 1000))) n), '[]'::jsonb)
  ) into result;
  return result;
end $$;

revoke all on function public.admin_storage_orphans(text, int) from public, anon;
grant execute on function public.admin_storage_orphans(text, int) to authenticated, service_role;

-- Vista previa: cuánto se podría liberar en cada carpeta.
select r->>'bucket' as carpeta, (r->>'count')::int as fotos_sin_usar, (r->>'mb')::numeric as mb
from (
  select public.admin_storage_orphans(b, 1) as r
  from unnest(array['club-photos', 'event-photos', 'essential-photos']) b
) x;
