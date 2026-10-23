-- =====================================================================================
-- Noctua · Encuestas "¿Qué prefieres?" (popup al entrar) · 24/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- Pedido: "encuestas rollo como el juego que preferirías... tipo beberte una cubata de golpe o
-- una botella a sorbitos, cosas así de ambiente fiesta y cachondeo". Decisiones de Jordi:
-- popup al entrar, y SIN XP (solo por diversión).
--
-- Las preguntas NO viven en la base de datos: están en src/lib/partyPolls.ts (cada una con un id
-- de texto fijo, p. ej. "cubata-golpe"). Así añadir o cambiar preguntas es solo tocar ese archivo,
-- sin SQL. Aquí solo se guardan los votos.
--
--   1) party_poll_votes — un voto por persona y pregunta (choice 0 = primera opción, 1 = segunda).
--      Solo usuarios con sesión (el popup solo sale a gente registrada, que ya confirmó su edad
--      al darse de alta — el contenido habla de bebida).
--   2) Cada persona solo puede leer SUS votos (para no repetirle preguntas); el admin los ve todos.
--   3) party_poll_results(id) — devuelve solo los totales de una pregunta (cuántos votaron cada
--      opción), sin exponer quién votó qué. Es lo que pinta los porcentajes tras votar.
-- =====================================================================================

create table if not exists public.party_poll_votes (
  id bigserial primary key,
  poll_id text not null check (char_length(poll_id) between 1 and 60),
  choice smallint not null check (choice in (0, 1)),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index if not exists party_poll_votes_poll_idx on public.party_poll_votes (poll_id);
create index if not exists party_poll_votes_user_idx on public.party_poll_votes (user_id, created_at desc);

alter table public.party_poll_votes enable row level security;

drop policy if exists "Cada uno vota por sí mismo" on public.party_poll_votes;
create policy "Cada uno vota por sí mismo" on public.party_poll_votes
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "Cada uno ve sus votos y el admin todos" on public.party_poll_votes;
create policy "Cada uno ve sus votos y el admin todos" on public.party_poll_votes
  for select using (user_id = auth.uid() or public.is_noctua_admin());

drop policy if exists "Solo admin borra votos" on public.party_poll_votes;
create policy "Solo admin borra votos" on public.party_poll_votes
  for delete using (public.is_noctua_admin());

create or replace function public.party_poll_results(p_poll_id text)
returns table (votes_a bigint, votes_b bigint)
language sql
security definer
set search_path to 'public'
stable
as $$
  select
    count(*) filter (where choice = 0) as votes_a,
    count(*) filter (where choice = 1) as votes_b
  from public.party_poll_votes
  where poll_id = p_poll_id;
$$;

revoke all on function public.party_poll_results(text) from public;
grant execute on function public.party_poll_results(text) to anon, authenticated;

-- Comprobación: debería devolver 0 filas la primera vez.
select count(*) as votos_totales from public.party_poll_votes;
