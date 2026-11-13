-- =====================================================================================
-- Noctua · Tope diario de llamadas al modelo de traducción · 13/11/2026
-- Ejecutar entero en Supabase › SQL Editor ANTES de subir el código que lo usa. Se puede repetir sin problema.
--
-- POR QUÉ: /api/translate es público y llama a un modelo de pago. Cada texto se traduce una sola vez y solo
-- acepta una lista cerrada de textos, pero una respuesta fallida del modelo no se guarda, así que repetir la
-- petición podría hacer pagar la misma traducción muchas veces. Este tope cuenta las llamadas reales al modelo
-- por día (UTC) y, al llegar al límite, la ruta deja de llamar: la web enseña el texto original en español y lo
-- ya traducido se sigue leyendo de la caché.
--
-- translate_take_call(límite) suma una llamada y devuelve true solo si todavía no se había llegado al límite;
-- suma y comprueba en un solo paso, así que dos peticiones a la vez no se saltan el tope. Con límite 0 devuelve
-- siempre false. Solo la puede ejecutar el service role (el que usa la ruta).
--
-- El límite por defecto (200 al día) está en el código y se cambia con la variable TRANSLATE_DAILY_LIMIT en
-- Vercel (0 = no traducir nada). Para ver cuánto se ha gastado:
--   select day, calls_used from public.translate_budget order by day desc limit 7;
-- =====================================================================================

create table if not exists public.translate_budget (
  day date primary key,
  calls_used integer not null default 0
);
alter table public.translate_budget enable row level security;
revoke all on public.translate_budget from public, anon, authenticated;

create or replace function public.translate_take_call(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v integer;
begin
  if p_limit is null or p_limit <= 0 then
    return false;
  end if;
  insert into public.translate_budget as t (day, calls_used)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update set calls_used = t.calls_used + 1
    where t.calls_used < p_limit
  returning t.calls_used into v;
  return v is not null;
end $$;

revoke all on function public.translate_take_call(integer) from public, anon, authenticated;
grant execute on function public.translate_take_call(integer) to service_role;

select day, calls_used from public.translate_budget order by day desc limit 7;
