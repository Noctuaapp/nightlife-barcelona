# Noctua

Guía de la noche de Barcelona: discotecas, eventos, noches de club y los "esenciales" para volver
a casa (metro, NitBus, taxi, farmacias, cajeros, comida de madrugada). Web: https://www.noctuaapp.com

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — tokens de diseño en `src/app/globals.css` (`@theme`)
- **Supabase** — base de datos Postgres con RLS, Auth, Storage
- **Mapbox GL** — mapas
- **Vercel** — hosting y tareas programadas (`vercel.json`)

> Ojo: Next 16 cambia APIs respecto a versiones anteriores. Antes de tocar rutas, caché o
> metadatos, mira la documentación incluida en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Arrancar en local

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # pruebas unitarias (vitest)
npm run build   # compilación de producción
```

Variables de entorno (`.env.local`):

| Variable | Para qué |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo en rutas de servidor (`/api/*`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapas |
| `CRON_SECRET` | Autoriza las tareas programadas de Vercel |
| `ADMIN_SECRET` | Llamar a `/api/admin/*` desde fuera (cabecera `x-admin-secret`) |
| `GOOGLE_MAPS_API_KEY` / `GOOGLE_PLACES_API_KEY` | Refresco de datos de Google (crons) |
| `GOOGLE_PLACES_DAILY_LIMIT`, `GOOGLE_PLACES_FETCH_RICH_DATA` | Límite de gasto y nivel de detalle de esos crons |

## Estructura

```
src/app/                 páginas (App Router)
  clubs/[slug]           ficha de club (ISR, 5 min)
  event/[slug]           ficha de evento (ISR)
  club-event/[id]        noche de un club (ISR)
  barrio/[slug]          discotecas por barrio (SEO)
  musica/[slug]          discotecas por estilo (SEO)
  essentials/[category]  esenciales por categoría
  para-locales           página para dueños y organizadores
  mi-club, mi-festival   portales de dueños
  admin/*                panel de administración (solo info@noctuaapp.com)
  api/cron/*, api/admin/*  rutas de servidor (autorización en src/lib/adminAuth.ts)
src/components/          componentes (ui/, layout/, nightlife/, home/, …)
src/lib/                 lógica compartida (horarios, slugs, analítica, …) + __tests__/
public/messages/         textos en es / en / ca (fr, de, it, nl ocultos)
supabase/                SQL de referencia del esquema
```

## Idiomas

Todos los textos de la interfaz salen de `public/messages/{es,en,ca}.json` vía `t("seccion.clave")`
(`src/context/LanguageContext.tsx`). El español es el idioma de respaldo: si falta una clave en
otro idioma se muestra en español. Al añadir un texto nuevo, añádelo a los tres JSON.

## Lógica que conviene conocer

- **Horarios de clubs** — `src/lib/clubHours.ts`: una sola función para "¿abierto ahora?" con la
  hora de Madrid; la madrugada pertenece a la noche anterior.
- **Metro esta noche** — `src/lib/transitHours.ts`: festivos de Barcelona (2027 provisional,
  revisar cuando el Ajuntament publique el calendario).
- **Slugs** — columna `slug` en `clubs` y `events`, estable aunque cambie el nombre;
  `src/lib/slugLookup.ts` redirige (301) URLs antiguas a la canónica.
- **Analítica propia** — tabla `analytics`, sin cookies ni almacenamiento en el navegador
  (`src/lib/track.ts`). Las filas de más de 13 meses se borran cada semana
  (`/api/cron/purge-analytics`).
- **Seguridad en la base de datos** — RLS en todas las tablas; XP, check-ins y columnas sensibles
  (`verified`, `trending`, `rating`, `owner_user_id`…) protegidas con funciones y triggers.

## Datos de fichas

`/admin/calidad` lista las fichas de clubs incompletas o con datos de relleno, de la peor a la
mejor, con enlace directo al editor.
