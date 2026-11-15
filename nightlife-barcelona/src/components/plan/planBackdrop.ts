import type { CSSProperties } from "react"

// El fondo de «Planifica tu noche» (15/11/2026). Era negro liso con un resplandor violeta que apenas se veía; ahora es un cielo
// de atardecer de noche (índigo, no negro) con el dibujo de lo que hace esta pantalla: una RUTA. Por el fondo corren caminos de
// puntitos dorados, como el trazado de un mapa, con una parada de cada tipo en el camino (cena, copa, música) y alguna luna y
// destellos entre medias. Es el mismo lenguaje que el tapete de la ruleta (líneas doradas finas sobre un color de ambiente),
// pero aquí el color es el violeta de la marca y el dibujo es el recorrido de la noche en vez de las cosas del casino.
// Todo plano y fijo en la página (sin animación): no cuesta nada y «reducir movimiento» no tiene qué quitar. Las tarjetas siguen
// siendo oscuras (bg-surface) y quedan encima como entradas de una agenda.

const DUSK_TOP = "#31258a"
const DUSK_MID = "#281e76"
const DUSK_BOTTOM = "#201761"
const GOLD = "#fbbf24"
const CREAM = "#ffe9a8"
const LILAC = "#c9bcff"

// Un icono = dibujo de línea de ~22 px centrado en (0,0).
const FORK_KNIFE = `<path d="M-7 -10V-3M-3.5 -10V-3M0 -10V-3M-7 -3Q-3.5 1 0 -3M-3.5 1V11M7 11V-10Q12 -6 9 1H7"/>`
const COCKTAIL = `<path d="M-10 -9H10L0 3ZM0 3V11M-5 11H5M-7 -4.5H7"/><circle cx="3.4" cy="-3.2" r="2"/><path d="M-3 -13L4 -5"/>`
const NOTE = `<path d="M-8 9V-7L8 -10V6M-8 -3L8 -6"/><ellipse cx="-11.4" cy="9" rx="3.8" ry="2.8" transform="rotate(-20 -11.4 9)"/><ellipse cx="4.6" cy="6" rx="3.8" ry="2.8" transform="rotate(-20 4.6 6)"/>`
const MOON = `<path d="M5 -11A12 12 0 1 0 5 11A9.5 9.5 0 1 1 5 -11Z"/>`
const PIN = `<circle r="6.5"/><circle r="2" fill="${LILAC}" stroke="none"/>`
const SPARK = (s: number) => `<path d="M0 ${-s}Q${s / 6} ${-s / 6} ${s} 0Q${s / 6} ${s / 6} 0 ${s}Q${-s / 6} ${s / 6} ${-s} 0Q${-s / 6} ${-s / 6} 0 ${-s}Z"/>`

// Un tramo de ruta de 260 px de ancho: empieza y acaba a la misma altura y con la misma inclinación, así que al repetirse
// hacia los lados el camino sigue sin cortes. Tres paradas en el camino, con su icono encima.
function routeRow(): string {
  return `
  <path d="M0 120C40 60 90 50 130 105C170 160 220 180 260 120" fill="none" stroke="${CREAM}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 8.5" opacity=".55"/>
  <g fill="none" stroke="${LILAC}" stroke-width="1.5" opacity=".55">
    <g transform="translate(38 80)">${PIN}</g>
    <g transform="translate(130 105)">${PIN}</g>
    <g transform="translate(215 156)">${PIN}</g>
  </g>
  <g fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".52">
    <g transform="translate(34 50) scale(.78)">${FORK_KNIFE}</g>
    <g transform="translate(136 76) scale(.78)">${COCKTAIL}</g>
    <g transform="translate(218 126) scale(.78)">${NOTE}</g>
  </g>`
}

// Baldosa de 260×360: dos filas de ruta (la de abajo desplazada medio ancho para que no se vea una cuadrícula) y, en los
// huecos, lunas y destellos.
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="360" viewBox="0 0 260 360">
<g>${routeRow()}</g>
<g transform="translate(130 180)">${routeRow()}</g>
<g transform="translate(-130 180)">${routeRow()}</g>
<g fill="none" stroke="${GOLD}" stroke-width="1.4" stroke-linecap="round" opacity=".45">
  <g transform="translate(208 26) scale(.85)">${MOON}</g>
  <g transform="translate(78 206) scale(.7)">${MOON}</g>
</g>
<g fill="${GOLD}" opacity=".5">
  <g transform="translate(120 40)">${SPARK(6)}</g>
  <g transform="translate(24 150)">${SPARK(5)}</g>
  <g transform="translate(236 222)">${SPARK(6)}</g>
  <g transform="translate(150 328)">${SPARK(5)}</g>
  <g transform="translate(40 300)">${SPARK(4)}</g>
</g>
<g fill="${CREAM}" opacity=".24">
  <circle cx="14" cy="14" r="1"/><circle cx="170" cy="14" r="1"/><circle cx="96" cy="150" r="1"/><circle cx="250" cy="120" r="1"/>
  <circle cx="60" cy="236" r="1"/><circle cx="184" cy="250" r="1"/><circle cx="10" cy="344" r="1"/><circle cx="110" cy="318" r="1"/><circle cx="244" cy="338" r="1"/>
</g>
</svg>`

const TILE_URL = `url("data:image/svg+xml,${encodeURIComponent(TILE.replace(/\s*\n\s*/g, ""))}")`

// Para el <main> de la página: capas de arriba abajo = ruta (se repite), brillos (violeta de marca arriba a la izquierda, rosa a
// la derecha, dorado muy suave al final) y el degradado índigo de base.
export const PLAN_BACKDROP_STYLE: CSSProperties = {
  backgroundColor: DUSK_MID,
  backgroundImage: [
    "radial-gradient(46rem 24rem at 8% -2%, rgba(124,92,255,.5), transparent 70%)",
    "radial-gradient(38rem 26rem at 104% 30%, rgba(255,79,160,.2), transparent 70%)",
    "radial-gradient(48rem 24rem at 50% 104%, rgba(251,191,36,.16), transparent 70%)",
    // La cabecera (logo, título y subtítulo) queda limpia: los dibujos empiezan a asomar por debajo.
    `linear-gradient(180deg, ${DUSK_TOP} 0, ${DUSK_TOP} 10rem, transparent 24rem)`,
    TILE_URL,
    `linear-gradient(180deg, ${DUSK_TOP} 0%, ${DUSK_MID} 50%, ${DUSK_BOTTOM} 100%)`,
  ].join(", "),
  backgroundSize: "100% 100%, 100% 100%, 100% 100%, 100% 100%, 300px 415px, 100% 100%",
  backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat, repeat, no-repeat",
}
