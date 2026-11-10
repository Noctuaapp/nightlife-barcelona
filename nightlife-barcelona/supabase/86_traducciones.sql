-- 11/11/2026: traducciones de los textos libres de los locales (descripción, promos, consejos...) al idioma de la web.
-- Cada texto original (en español) se traduce una vez; la traducción se guarda aquí con el hash (SHA-256) del texto
-- original y el idioma. Si el texto cambia, su hash cambia y se traduce de nuevo. La ruta /api/translate (con el
-- service role) es la única que escribe; cualquiera puede leer, porque son textos que ya son públicos en la ficha.
-- Ejecutar en el SQL Editor de Supabase. Se puede ejecutar más de una vez sin problema.

create table if not exists public.content_translations (
  source_hash text not null,
  lang        text not null check (lang in ('en','ca','fr','de','it','nl','pt')),
  translated  text not null,
  model       text,
  created_at  timestamptz not null default now(),
  primary key (source_hash, lang)
);

alter table public.content_translations enable row level security;

drop policy if exists "content_translations_read" on public.content_translations;
create policy "content_translations_read" on public.content_translations
  for select using (true);

-- Sin políticas de insert/update/delete: solo el service role (que se salta RLS) puede escribir.
