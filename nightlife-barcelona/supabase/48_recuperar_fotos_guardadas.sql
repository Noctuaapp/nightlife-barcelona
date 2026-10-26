-- =====================================================================================
-- Noctua · Aprovechar las fotos ya descargadas antes de borrar las sobrantes · 26/10/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 47) ANTES de pulsar «Liberar espacio».
-- Se puede repetir sin problema.
--
-- Muchas de las fotos «sin usar» son de clubs, eventos y esenciales que ahora mismo NO tienen
-- galería (por ejemplo, las que se vaciaron el 23/10 por las fotos rotas, y que la tarea de cada
-- noche iba a volver a descargar pagando a Google, a 2 clubs por noche). Esto se las devuelve
-- gratis, sin llamar a Google:
--   · Solo a fichas sin galería, que no hayas editado a mano (manual_photos) y que sigan
--     emparejadas con Google (tienen google_place_id).
--   · Solo fotos de verdad (más de 15 KB: las «rotas» eran errores de Google de pocos bytes),
--     sin repetidas, las más recientes primero: hasta 5 por club o evento y 4 por esencial.
--   · Si la ficha no tiene portada, la primera foto pasa a ser la portada.
-- Lo que sobre después sí se puede borrar con «Liberar espacio».
-- =====================================================================================

create or replace function public.noctua_restore_gallery(p_table text, p_bucket text, p_prefix text, p_max int)
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  base text;
  gal_type text;
  n int := 0;
  r record;
  urls text[];
begin
  -- Dirección pública de las fotos de tu proyecto (sacada de cualquier foto que ya se use).
  select substring(u from '^(https?://[^/]+/storage/v1/object/public/)') into base
  from (
    select image as u from public.clubs where image like '%/storage/v1/object/public/%'
    union all select image from public.events where image like '%/storage/v1/object/public/%'
  ) x limit 1;
  if base is null then raise exception 'No encuentro la dirección pública de las fotos'; end if;

  select udt_name into gal_type from information_schema.columns
  where table_schema = 'public' and table_name = p_table and column_name = 'gallery';

  for r in execute format(
    'select t.id from public.%I t
      where coalesce((to_jsonb(t)->>''manual_photos'')::boolean, false) = false
        and (to_jsonb(t)->>''google_place_id'') is not null
        and (t.gallery is null
             or jsonb_typeof(to_jsonb(t.gallery)) <> ''array''
             or jsonb_array_length(to_jsonb(t.gallery)) = 0)', p_table)
  loop
    select array_agg(base || p_bucket || '/' || name || '?v=restored' order by created_at desc) into urls
    from (
      select name, created_at from (
        select o.name, o.created_at,
               row_number() over (partition by coalesce(o.metadata->>'eTag', o.metadata->>'size') order by o.created_at desc) as dup
        from storage.objects o
        where o.bucket_id = p_bucket
          and o.name like p_prefix || r.id || '/%'
          and coalesce((o.metadata->>'size')::bigint, 0) > 15000
          and coalesce(o.metadata->>'mimetype', 'image/jpeg') like 'image/%'
      ) d where dup = 1
      order by created_at desc
      limit p_max
    ) pick;

    if urls is not null and array_length(urls, 1) > 0 then
      if gal_type = 'jsonb' then
        execute format('update public.%I set gallery = $1 where id = $2', p_table) using to_jsonb(urls), r.id;
      else
        execute format('update public.%I set gallery = $1 where id = $2', p_table) using urls, r.id;
      end if;
      -- Portada: solo si no tiene.
      execute format('update public.%I set image = $1 where id = $2 and (image is null or btrim(image) = '''')', p_table)
        using urls[1], r.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

revoke all on function public.noctua_restore_gallery(text, text, text, int) from public, anon, authenticated;

select
  public.noctua_restore_gallery('clubs', 'club-photos', '', 5) as clubs_con_fotos_recuperadas,
  public.noctua_restore_gallery('events', 'event-photos', '', 5) as eventos_con_fotos_recuperadas,
  public.noctua_restore_gallery('essentials', 'essential-photos', 'essentials/', 4) as esenciales_con_fotos_recuperadas;

-- Lo que queda sin usar después de recuperar (esto sí se puede borrar con «Liberar espacio»).
select r->>'bucket' as carpeta, (r->>'count')::int as fotos_sin_usar, (r->>'mb')::numeric as mb
from (
  select public.admin_storage_orphans(b, 1) as r
  from unnest(array['club-photos', 'event-photos', 'essential-photos']) b
) x;
