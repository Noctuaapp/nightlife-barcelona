-- =====================================================================================
-- Noctua · Plan en grupo con votación («Elegid entre estos sitios»)
-- 15/11/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema. Todo o nada.
--
-- Qué añade (todo nuevo; NO cambia get_night_plan, rsvp_night_plan ni create_night_plan):
--  1) night_plans.mode: 'itinerary' (los planes de siempre, todos los que ya hay) o 'vote'
--     (una votación entre 2 y 5 sitios). Los planes que ya existen quedan como 'itinerary'.
--  2) Tabla night_plan_votes: un voto por persona y plan (una persona puede cambiar su voto).
--     Se identifica con un código aleatorio que guarda su propio móvil: no hace falta cuenta.
--     La tabla queda cerrada (sin acceso directo): solo se toca con las tres funciones de abajo.
--  3) create_night_plan_poll(...): crea la votación. Exige cuenta, igual que crear un plan, y
--     cuenta en el mismo tope de 20 planes al día por cuenta.
--  4) night_plan_poll_state(código, código_de_voto): devuelve el recuento (también sin cuenta).
--  5) vote_night_plan(código, código_de_voto, nombre, opción): vota o cambia el voto (sin cuenta).
--     Tope de 100 personas por votación.
--
-- Necesita los cambios de la web de esta misma tanda (SharedPlanClient, PlanPollButton...).
-- Sin ellos no pasa nada: las funciones nuevas simplemente no se llaman.
--
-- Para deshacerlo, hay un archivo aparte (119_DESHACER_...). No lo ejecutes si no hace falta:
-- borra los votos.
-- =====================================================================================

-- 1) Modo del plan ---------------------------------------------------------------------------

alter table public.night_plans add column if not exists mode text not null default 'itinerary';

do $$
begin
  alter table public.night_plans
    add constraint night_plans_mode_check check (mode in ('itinerary', 'vote'));
exception when duplicate_object then
  null;
end $$;

-- 2) Votos ------------------------------------------------------------------------------------

create table if not exists public.night_plan_votes (
  plan_code   text        not null,
  voter_token uuid        not null,
  voter_name  text        not null check (char_length(voter_name) between 1 and 30),
  option_idx  smallint    not null check (option_idx between 0 and 7),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (plan_code, voter_token)
);

create index if not exists night_plan_votes_plan_idx on public.night_plan_votes (plan_code, option_idx);

-- Si el código del plan es único (lo normal), los votos se borran con su plan. Si no, se queda sin esto.
do $$
begin
  alter table public.night_plan_votes
    add constraint night_plan_votes_plan_fk foreign key (plan_code)
    references public.night_plans (code) on delete cascade;
exception when others then
  null;
end $$;

alter table public.night_plan_votes enable row level security;
revoke all on public.night_plan_votes from anon, authenticated;

-- 3) Crear una votación -----------------------------------------------------------------------

create or replace function public.create_night_plan_poll(p_title text, p_plan_date date, p_stops jsonb)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  new_code text;
  tries int := 0;
  bad int;
begin
  if auth.uid() is null then
    raise exception 'Necesitas una cuenta para crear una votación';
  end if;
  if p_title is null or length(trim(p_title)) = 0 or length(p_title) > 80 then
    raise exception 'Titulo no valido';
  end if;
  if p_stops is null or jsonb_typeof(p_stops) <> 'array'
     or jsonb_array_length(p_stops) < 2 or jsonb_array_length(p_stops) > 5 then
    raise exception 'Una votación necesita entre 2 y 5 sitios';
  end if;
  if length(p_stops::text) > 8000 then
    raise exception 'Plan demasiado grande';
  end if;
  select count(*) into bad
  from jsonb_array_elements(p_stops) e
  where jsonb_typeof(e) <> 'object'
     or length(trim(coalesce(e->>'title', ''))) not between 1 and 80;
  if bad > 0 then
    raise exception 'Cada sitio necesita un nombre';
  end if;
  if (select count(*) from public.night_plans
      where creator = auth.uid() and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Has creado demasiados planes hoy. Prueba mañana.';
  end if;

  loop
    new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    begin
      insert into public.night_plans (code, title, plan_date, stops, creator, mode)
      values (new_code, trim(p_title), p_plan_date, p_stops, auth.uid(), 'vote');
      return new_code;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 5 then raise; end if;
    end;
  end loop;
end;
$function$;

-- 4) Recuento ---------------------------------------------------------------------------------

create or replace function public.night_plan_poll_state(p_code text, p_token uuid default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  v_mode text;
  v_n int;
begin
  if p_code is null or p_code !~ '^[a-f0-9]{8,12}$' then
    return null;
  end if;
  select mode, jsonb_array_length(stops) into v_mode, v_n
  from public.night_plans where code = p_code;
  if not found then
    return null;
  end if;
  if v_mode is distinct from 'vote' then
    return jsonb_build_object('mode', coalesce(v_mode, 'itinerary'));
  end if;

  return jsonb_build_object(
    'mode', 'vote',
    'total', (select count(*) from public.night_plan_votes where plan_code = p_code),
    'mine', (select option_idx from public.night_plan_votes
             where plan_code = p_code and voter_token = p_token),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
               'idx', g.i,
               'votes', coalesce(c.n, 0),
               'voters', coalesce(c.names, '[]'::jsonb)) order by g.i)
      from generate_series(0, v_n - 1) as g(i)
      left join (
        select option_idx,
               count(*) as n,
               jsonb_agg(voter_name order by updated_at) filter (where rn <= 12) as names
        from (
          select option_idx, voter_name, updated_at,
                 row_number() over (partition by option_idx order by updated_at) as rn
          from public.night_plan_votes where plan_code = p_code
        ) v
        group by option_idx
      ) c on c.option_idx = g.i
    ), '[]'::jsonb)
  );
end;
$function$;

-- 5) Votar (o cambiar el voto) ---------------------------------------------------------------

create or replace function public.vote_night_plan(p_code text, p_token uuid, p_name text, p_option int)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_mode text;
  v_n int;
  v_name text;
begin
  if p_code is null or p_code !~ '^[a-f0-9]{8,12}$' or p_token is null then
    raise exception 'Datos no validos';
  end if;
  v_name := left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 30);
  if length(v_name) = 0 then
    raise exception 'Pon tu nombre para votar';
  end if;
  select mode, jsonb_array_length(stops) into v_mode, v_n
  from public.night_plans where code = p_code;
  if not found or v_mode is distinct from 'vote' then
    raise exception 'Votación no encontrada';
  end if;
  if p_option is null or p_option < 0 or p_option >= v_n then
    raise exception 'Opción no valida';
  end if;
  if not exists (select 1 from public.night_plan_votes where plan_code = p_code and voter_token = p_token)
     and (select count(*) from public.night_plan_votes where plan_code = p_code) >= 100 then
    raise exception 'Esta votación ya está completa';
  end if;

  insert into public.night_plan_votes (plan_code, voter_token, voter_name, option_idx)
  values (p_code, p_token, v_name, p_option)
  on conflict (plan_code, voter_token)
  do update set voter_name = excluded.voter_name,
                option_idx = excluded.option_idx,
                updated_at = now();

  return public.night_plan_poll_state(p_code, p_token);
end;
$function$;

-- Permisos: las dos de lectura/voto, para todo el mundo (sin cuenta); crear, solo con cuenta.
revoke all on function public.create_night_plan_poll(text, date, jsonb) from public, anon;
grant execute on function public.create_night_plan_poll(text, date, jsonb) to authenticated;
revoke all on function public.night_plan_poll_state(text, uuid) from public;
grant execute on function public.night_plan_poll_state(text, uuid) to anon, authenticated;
revoke all on function public.vote_night_plan(text, uuid, text, int) from public;
grant execute on function public.vote_night_plan(text, uuid, text, int) to anon, authenticated;

-- Comprobación: una fila con un JSON. Pégamela entera.
select jsonb_build_object(
  'columna_mode', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'night_plans' and column_name = 'mode'),
  'planes_de_siempre', (select count(*) from public.night_plans where mode = 'itinerary'),
  'votaciones', (select count(*) from public.night_plans where mode = 'vote'),
  'tabla_votos', to_regclass('public.night_plan_votes') is not null,
  'votos_con_candado', (select relrowsecurity from pg_class where oid = 'public.night_plan_votes'::regclass),
  'votos_se_borran_con_su_plan', exists (
    select 1 from pg_constraint where conname = 'night_plan_votes_plan_fk'),
  'permisos', jsonb_build_object(
    'crear_anon', has_function_privilege('anon', 'public.create_night_plan_poll(text,date,jsonb)', 'execute'),
    'crear_con_sesion', has_function_privilege('authenticated', 'public.create_night_plan_poll(text,date,jsonb)', 'execute'),
    'ver_anon', has_function_privilege('anon', 'public.night_plan_poll_state(text,uuid)', 'execute'),
    'votar_anon', has_function_privilege('anon', 'public.vote_night_plan(text,uuid,text,int)', 'execute'),
    'tabla_votos_anon', has_table_privilege('anon', 'public.night_plan_votes', 'select')),
  'funciones_de_siempre_intactas', jsonb_build_object(
    'get_night_plan', to_regprocedure('public.get_night_plan(text)') is not null,
    'rsvp_night_plan', exists (select 1 from pg_proc where proname = 'rsvp_night_plan'),
    'create_night_plan', to_regprocedure('public.create_night_plan(text,date,jsonb)') is not null)
) as resultado;
