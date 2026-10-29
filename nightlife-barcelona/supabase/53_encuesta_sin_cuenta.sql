-- =====================================================================================
-- Noctua · «¿Qué prefieres?» también para quien no tiene cuenta · 30/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
-- EJECÚTALO ANTES de publicar la web con este cambio (si no, el voto sin cuenta no se guarda).
--
-- Hasta ahora solo votaba gente con sesión (party_poll_votes, un voto por persona y pregunta).
-- Ahora la encuesta del día sale a todo el mundo. Quien no tiene cuenta vota de forma ANÓNIMA:
--   1) party_poll_anon_votes — un voto = una fila (pregunta + opción + fecha). NO se guarda quién
--      ha votado: ni usuario, ni dispositivo, ni IP.
--   2) Cualquiera puede votar (insertar); solo el admin puede leerlos o borrarlos.
--   3) La web recuerda en el dispositivo qué se votó para no repetir la pregunta, pero SOLO si la
--      persona ha aceptado el banner de cookies (src/lib/consent.ts). No hay nada en el servidor que
--      impida votar dos veces borrando esa marca: es un juego, no una votación oficial. Si alguna
--      vez se llena de votos falsos, el admin puede borrarlos desde aquí.
--   4) party_poll_results(id) ahora suma los votos con cuenta y sin cuenta, para que los porcentajes
--      que se enseñan tras votar sean los de todos.
-- =====================================================================================

create table if not exists public.party_poll_anon_votes (
  id bigint generated always as identity primary key,
  poll_id text not null check (char_length(poll_id) between 1 and 60),
  choice smallint not null check (choice in (0, 1)),
  created_at timestamptz not null default now()
);

create index if not exists party_poll_anon_votes_poll_idx on public.party_poll_anon_votes (poll_id);

alter table public.party_poll_anon_votes enable row level security;

drop policy if exists "Votar sin cuenta" on public.party_poll_anon_votes;
create policy "Votar sin cuenta" on public.party_poll_anon_votes
  as permissive for insert to anon, authenticated
  with check (char_length(poll_id) between 1 and 60 and choice in (0, 1));

drop policy if exists "Solo admin lee votos sin cuenta" on public.party_poll_anon_votes;
create policy "Solo admin lee votos sin cuenta" on public.party_poll_anon_votes
  for select to authenticated using (public.is_noctua_admin());

drop policy if exists "Solo admin borra votos sin cuenta" on public.party_poll_anon_votes;
create policy "Solo admin borra votos sin cuenta" on public.party_poll_anon_votes
  for delete to authenticated using (public.is_noctua_admin());

create or replace function public.party_poll_results(p_poll_id text)
returns table (votes_a bigint, votes_b bigint)
language sql
security definer
set search_path to 'public'
stable
as $$
  select
    coalesce(sum(a), 0)::bigint as votes_a,
    coalesce(sum(b), 0)::bigint as votes_b
  from (
    select count(*) filter (where choice = 0) as a, count(*) filter (where choice = 1) as b
    from public.party_poll_votes where poll_id = p_poll_id
    union all
    select count(*) filter (where choice = 0), count(*) filter (where choice = 1)
    from public.party_poll_anon_votes where poll_id = p_poll_id
  ) t;
$$;

revoke all on function public.party_poll_results(text) from public;
grant execute on function public.party_poll_results(text) to anon, authenticated;

-- Comprobación: debería devolver 0 filas la primera vez, y los totales de una pregunta sin votos
-- deberían ser 0 y 0.
select count(*) as votos_sin_cuenta from public.party_poll_anon_votes;
select * from public.party_poll_results('cubata-golpe');
