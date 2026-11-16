import type { CSSProperties } from "react"

// El fondo de «Planifica tu noche». Versión del 16/11/2026: azul noche oscuro con el búho de Noctua de marca de agua.
//
// Historial. El 15/11/2026 se probó un cielo índigo con rutas de puntitos y paradas repetido por toda la página: los dibujos
// asomaban entre las tarjetas y no casaban con ellas, y se quitó. Pero el problema de fondo seguía: el color. El índigo
// (#31258a…) es del mismo violeta que los botones y la tarjeta elegida (brand #7c5cff, bg-brand/15), así que se confundían
// con el fondo y no se veían bien. Ahora el fondo es un azul noche muy oscuro y poco saturado (el de la cabecera de la web,
// #0c1234 → #070814): la tarjeta elegida y los botones violeta se despegan de él, y las tarjetas oscuras (bg-surface) quedan
// sobre un fondo del mismo tono. Detrás del título va el búho del logo, tenue (PLAN_OWL_STYLE), sin animación.

const NAVY_TOP = "#0d1538" // casi el azul de la cabecera: no hay salto al pasar de ella a la página
const NAVY_MID = "#090d28"
const NAVY_LOW = "#070918"
const NIGHT = "#06070f" // un punto más azulado que --color-night (#0a0910), para que el degradado acabe sin corte

// Para el <main> de la página: un resplandor azul eléctrico detrás de donde va el búho y el degradado de base.
export const PLAN_BACKDROP_STYLE: CSSProperties = {
  backgroundColor: NIGHT,
  backgroundImage: [
    "radial-gradient(34rem 24rem at 50% 14%, rgba(37,99,235,.34), transparent 70%)",
    `linear-gradient(180deg, ${NAVY_TOP} 0%, ${NAVY_MID} 34%, ${NAVY_LOW} 70%, ${NIGHT} 100%)`,
  ].join(", "),
  backgroundSize: "100% 100%, 100% 100%",
  backgroundRepeat: "no-repeat, no-repeat",
}

// El búho del logo (public/noctua_owl.webp, sacado de icon-512.png, sin la palabra Noctua), grande, centrado detrás de la
// cabecera de la página y desvanecido hacia abajo. Es una capa propia (el <main> lleva `isolate` y la capa `-z-10`): queda
// siempre POR DEBAJO del texto y de las tarjetas, y por no tener fondo no tapa nada ni coge clics.
export const PLAN_OWL_STYLE: CSSProperties = {
  backgroundImage: "url(/noctua_owl.webp)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center top 22px",
  backgroundSize: "min(92vw, 560px) auto",
  opacity: 0.22,
  WebkitMaskImage: "linear-gradient(180deg, #000 60%, transparent 100%)",
  maskImage: "linear-gradient(180deg, #000 60%, transparent 100%)",
}
