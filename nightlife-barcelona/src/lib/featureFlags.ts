// Interruptores de la web (30/10/2026).
//
// EVENTS_HIDDEN: mientras la agenda de eventos y festivales se prepara, la web se centra en los clubs y
// «Eventos» enseña una pantalla de «Próximamente». Todo lo hecho sigue existiendo; solo no se ve.
//   - El botón «Eventos» sigue en la barra inferior, el selector Clubs · Eventos · Esenciales, el pie y los
//     accesos rápidos de la portada, con la etiqueta «Próximamente». Al pulsarlo sale el aviso
//     (components/nightlife/EventsComingSoon.tsx); la agenda ni se pide ni se pinta para los visitantes.
//   - Las fichas /event/... redirigen a /events (src/proxy.ts, redirección temporal 307), así que llevan
//     al mismo aviso. /events sale de Google (noindex) y del sitemap mientras tanto.
//   - Los eventos no salen en la portada, el mapa, Planifica tu noche, favoritos ni el sitemap.
//     Sorpréndeme solo propone clubs.
//   - El admin sí ve la agenda real en /events (aviso de «Vista de admin») y entra a las fichas: al abrir la
//     web con su sesión se le guarda una marca (cookie) en este navegador
//     (components/system/EventsPreviewCookie.tsx).
//   - Siguen igual las noches de club (/club-event/...) y su bloque «Qué está pasando» en la portada.
// Cuando la agenda esté lista, pon esto en false y todo vuelve a la normalidad.
// (Tipado como boolean para que TypeScript no trate el valor como una constante fija.)
export const EVENTS_HIDDEN: boolean = true

// MANANEO_HIDDEN (05/11/2026): el apartado «Mañaneo» (sitios de afterhour para seguir cuando sale el sol) vive
// dentro de Eventos y está en construcción. Mientras valga true:
//   - Solo lo ve el admin, al final de /events (aviso «solo lo ves tú»); se rellena en Admin › Mañaneo.
//   - Los visitantes no lo ven, y aunque pidieran la tabla, la base de datos solo les devuelve los sitios
//     con hidden = false (supabase/80_mananeo.sql); todos nacen ocultos.
// Para abrirlo: pon false aquí y deja visibles (no ocultos) los sitios que quieras en Admin › Mañaneo.
// Ojo: mientras EVENTS_HIDDEN siga en true, los visitantes siguen viendo solo «Próximamente» en /events.
export const MANANEO_HIDDEN: boolean = true

// Marca que se guarda solo en el navegador del admin para dejarle ver las fichas /event/... mientras Eventos
// está cerrado. No es seguridad (los datos de eventos son públicos): solo evita que los visitantes entren.
export const EVENTS_PREVIEW_COOKIE = "noctua_events_preview"

// A dónde se manda a quien pide la ficha de un evento mientras Eventos está cerrado (null = dejar pasar).
// /events no se redirige: esa dirección es la que enseña el aviso «Próximamente».
export function eventsRedirectTarget(pathname: string, previewCookie: string | undefined): string | null {
  if (!EVENTS_HIDDEN) return null
  if (previewCookie === "1") return null
  return pathname.startsWith("/event/") ? "/events" : null
}
