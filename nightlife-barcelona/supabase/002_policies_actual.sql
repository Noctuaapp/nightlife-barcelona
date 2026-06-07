-- NOCTUA SUPABASE POLICIES
-- Estado actual documentado

-- =====================
-- CLUBS
-- =====================

create policy "Allow public read access"
on clubs
for select
using (true);

create policy "Allow admin insert clubs"
on clubs
for insert
to authenticated
with check (
  auth.email() = 'info@noctuaapp.com'
);

create policy "Allow admin update clubs"
on clubs
for update
to authenticated
using (
  auth.email() = 'info@noctuaapp.com'
)
with check (
  auth.email() = 'info@noctuaapp.com'
);

create policy "Allow admin delete clubs"
on clubs
for delete
to authenticated
using (
  auth.email() = 'info@noctuaapp.com'
);

-- =====================
-- EVENTS
-- =====================

create policy "Allow public read events"
on events
for select
using (true);

create policy "Allow admin insert events"
on events
for insert
to authenticated
with check (
  auth.email() = 'info@noctuaapp.com'
);

create policy "Allow admin update events"
on events
for update
to authenticated
using (
  auth.email() = 'info@noctuaapp.com'
)
with check (
  auth.email() = 'info@noctuaapp.com'
);

create policy "Allow admin delete events"
on events
for delete
to authenticated
using (
  auth.email() = 'info@noctuaapp.com'
);

-- =====================
-- TICKETS
-- =====================

create policy "Allow public read tickets"
on tickets
for select
using (true);

-- IMPORTANTE:
-- Estas son las policies actuales detectadas.
-- Las cambiaremos después para que
-- tickets también sea solo admin.

create policy "Allow authenticated insert tickets"
on tickets
for insert
to authenticated
with check (true);

create policy "Allow authenticated update tickets"
on tickets
for update
to authenticated
using (true);

create policy "Allow authenticated delete tickets"
on tickets
for delete
to authenticated
using (true);