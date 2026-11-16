import type { CSSProperties } from "react"

// El fondo de «Planifica tu noche». Versión del 16/11/2026: liso y sin dibujos.
//
// El 15/11/2026 se probó un cielo índigo con rutas de puntitos y paradas (cena, copa, música) repetido por toda la página. No
// funcionaba: los dibujos asomaban entre las tarjetas y pasaban POR ENCIMA del texto de las que son translúcidas (la elegida), el
// violeta claro no casaba con las tarjetas casi negras (bg-surface) y la máscara que lo difuminaba hacia arriba dejaba una
// mancha borrosa. Ahora es un único degradado que baja del índigo de la cabecera al negro de la web, con un resplandor violeta
// arriba a la izquierda: las tarjetas oscuras quedan sobre un fondo del mismo tono y no hay nada que se cruce con el texto.
// Todo plano y fijo (sin animación).

const DUSK_TOP = "#31258a" // el índigo con el que empieza la página, igual que antes (sin salto al pasar de la cabecera)
const DUSK_MID = "#1a1250"
const DUSK_LOW = "#120d33"
const NIGHT = "#0a0910" // --color-night

// Para el <main> de la página: capas de arriba abajo = resplandor violeta de marca y el degradado de base.
export const PLAN_BACKDROP_STYLE: CSSProperties = {
  backgroundColor: NIGHT,
  backgroundImage: [
    "radial-gradient(44rem 22rem at 10% -4%, rgba(124,92,255,.38), transparent 70%)",
    `linear-gradient(180deg, ${DUSK_TOP} 0%, ${DUSK_MID} 38%, ${DUSK_LOW} 72%, ${NIGHT} 100%)`,
  ].join(", "),
  backgroundSize: "100% 100%, 100% 100%",
  backgroundRepeat: "no-repeat, no-repeat",
}
