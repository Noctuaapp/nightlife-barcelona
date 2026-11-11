-- =====================================================================================
-- Noctua · País de los visitantes (solo el código de 2 letras) · 11/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Qué hace:
--   1. analytics.country: código de país de dos letras (ES, FR, GB...). NADA MÁS: ni IP, ni ciudad, ni región.
--   2. Un trigger lo rellena en el servidor a partir de la cabecera `cf-ipcountry` de la petición
--      (la pone Cloudflare, que va delante de Supabase). El navegador NO puede inventárselo: lo que mande
--      se descarta, igual que pasa con el código anónimo diario (visitor_id).
--      Valores sin país real (XX = desconocido, T1 = red Tor) se guardan vacíos.
--   3. admin_visitor_countries(): países de los visitantes (personas, % que ve una ficha, % que hace clic)
--      para Admin › Datos › Audiencia.
--
-- Importante:
--   · Solo cuenta desde que ejecutes este SQL; las visitas anteriores se quedan «sin país».
--   · La IP sigue sin guardarse (solo se usa, como hasta ahora, para el código anónimo del día).
--   · Si la cabecera no llega a la base de datos, el país queda vacío y el panel lo dirá (no inventa nada).
--     Comprobación rápida pasadas unas horas (debería salir casi todo con país):
--       select country, count(*) from analytics where created_at > now() - interval '6 hours' group by 1 order by 2 desc;
--   · La política de privacidad se ha actualizado en el mismo cambio (ver public/messages/*.json).
-- =====================================================================================

alter table public.analytics add column if not exists country text;

-- Solo códigos de dos letras mayúsculas (o vacío). Se añade una vez; repetir el SQL no falla.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'analytics_country_format' and conrelid = 'public.analytics'::regclass
  ) then
    alter table public.analytics
      add constraint analytics_country_format check (country is null or country ~ '^[A-Z]{2}$');
  end if;
end $$;

create or replace function public.analytics_set_country()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h json;
  c text;
begin
  -- Nunca se fía de lo que mande el navegador.
  new.country := null;

  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;
  if h is null then
    return new;
  end if;

  c := upper(trim(coalesce(h->>'cf-ipcountry', '')));
  -- XX = país desconocido, T1 = red Tor: no son países.
  if c ~ '^[A-Z]{2}$' and c not in ('XX', 'T1') then
    new.country := c;
  end if;
  return new;
end $$;

revoke all on function public.analytics_set_country() from public, anon, authenticated;

drop trigger if exists analytics_set_country_trg on public.analytics;
create trigger analytics_set_country_trg
  before insert on public.analytics
  for each row execute function public.analytics_set_country();

-- -------------------------------------------------------------------------------------
-- Admin › Datos › Audiencia: países de los visitantes (no hace falta cuenta)
-- Una fila por país: personas (código anónimo del día, o sesión si no lo tiene), cuántas ven una ficha y cuántas hacen clic.
-- Las visitas sin país se agrupan como 'unknown'.
-- -------------------------------------------------------------------------------------
create or replace function public.admin_visitor_countries(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
stable
as $$
declare
  t_from timestamptz := p_from::timestamp at time zone 'Europe/Madrid';
  t_to   timestamptz := (p_to + 1)::timestamp at time zone 'Europe/Madrid';
  result jsonb;
begin
  if not public.is_noctua_admin() then
    raise exception 'No autorizado';
  end if;

  with ev as (
    select coalesce(a.visitor_id, a.session_id::text) as pid, a.event_type::text as event_type, a.item_type::text as item_type,
           nullif(upper(trim(coalesce(a.country::text, ''))), '') as country, a.created_at
    from public.analytics a
    where a.created_at >= t_from and a.created_at < t_to
      and coalesce(a.visitor_id, a.session_id::text) is not null
  ),
  per_person as (
    select pid,
           coalesce((array_agg(country order by created_at) filter (where country is not null))[1], 'unknown') as country,
           bool_or(event_type = 'page_view' and item_type in ('club', 'event', 'club_event')) as ficha,
           bool_or(event_type in ('tickets_click', 'website_click', 'directions_click', 'instagram_click', 'tiktok_click',
                                  'phone_click', 'ride_click', 'share_click', 'favorite_click')) as clicked
    from ev group by pid
  ),
  by_country as (
    select country, count(*) as people, count(*) filter (where ficha) as ficha, count(*) filter (where clicked) as clicked
    from per_person group by country
    order by count(*) desc
    limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object('country', country, 'people', people, 'ficha', ficha, 'clicked', clicked) order by people desc), '[]'::jsonb)
  into result from by_country;

  return result;
end $$;

revoke all on function public.admin_visitor_countries(date, date) from public, anon;
grant execute on function public.admin_visitor_countries(date, date) to authenticated;
