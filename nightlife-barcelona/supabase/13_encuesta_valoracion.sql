-- =====================================================================================
-- Noctua · Tanda L (encuesta de valoración de la web, enlazada desde el footer) · 17/10/2026
-- Ejecutar entero en Supabase › SQL Editor. Se puede repetir sin problema.
-- =====================================================================================

create table if not exists public.site_feedback (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  page text,
  created_at timestamptz not null default now()
);
create index if not exists site_feedback_created_idx on public.site_feedback(created_at desc);

alter table public.site_feedback enable row level security;

-- Cualquiera puede opinar, con sesión o sin ella — es a propósito, para que valore el máximo
-- de gente posible, no solo quien tenga cuenta.
drop policy if exists "Opinar" on public.site_feedback;
create policy "Opinar" on public.site_feedback
  as permissive for insert to anon, authenticated
  with check (true);

-- Solo el admin puede leer las respuestas (no son públicas).
drop policy if exists "Admin ve las opiniones" on public.site_feedback;
create policy "Admin ve las opiniones" on public.site_feedback
  as permissive for select to authenticated
  using (public.is_noctua_admin());

select table_name from information_schema.tables where table_schema = 'public' and table_name = 'site_feedback';
