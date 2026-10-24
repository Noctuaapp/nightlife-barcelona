-- =====================================================================================
-- Noctua · Logo como foto de perfil de la cuenta oficial · 24/10/2026
-- Ejecutar en Supabase › SQL Editor. Se puede repetir sin problema.
--
-- "En el perfil de Noctua falta como foto de perfil el logo". Se guarda en la propia cuenta, así
-- sale en todos los sitios donde se vea su foto (no solo en tu perfil). Si algún día subes otra
-- foto desde /profile, esa la sustituye.
-- =====================================================================================

update public.profiles p
set avatar_url = 'https://www.noctuaapp.com/noctua_logo.png'
from auth.users u
where u.id = p.id
  and u.email = 'info@noctuaapp.com'
  and (p.avatar_url is null or p.avatar_url = '');

select p.username, p.avatar_url
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'info@noctuaapp.com';
