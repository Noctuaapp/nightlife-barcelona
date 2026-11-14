import type { ReactNode } from "react"

// Fondo de la ruleta del «Sorpréndeme» (14/11/2026): el tapete verde de una mesa de casino, pero estampado con cosas de
// salir de noche en vez de palos de la baraja. En el tapete de verdad hay líneas doradas (el marco, los arcos de la mesa)
// y dibujos repetidos; aquí los dibujos son una bola de espejos, una copa de cóctel, una luna, notas y destellos, y las
// líneas son del dorado de la marca. Todo plano (sin degradados, como la propia rueda) y fijo: no se anima nada, así que
// no cuesta nada mientras gira la bola y «reducir movimiento» no tiene qué quitar.

const FELT = "#0c3a2b" // verde de tapete, oscuro para que siga siendo de noche
const GOLD = "#fbbf24"
const CREAM = "#f5e6b3"

// Una baldosa de 160×120 que se repite. Los dibujos de los bordes (las notas, a x=0 y x=160) están pintados enteros a cada
// lado para que al juntarse las baldosas se vea uno solo. Las coordenadas están pensadas para que dos dibujos iguales no
// queden nunca pegados.
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
<g fill="none" stroke="${GOLD}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".3">
  <g transform="translate(40 34)"><circle r="11"/><ellipse rx="4.6" ry="11"/><path d="M-11 0H11M-9.4 -5.6H9.4M-9.4 5.6H9.4M0 -11V-19"/></g>
  <g transform="translate(120 34)"><path d="M-11 -10H11L0 3ZM0 3V12M-6 12H6M-8 -5.5H8"/><circle cx="3.2" cy="-3.6" r="2"/><path d="M-3 -14L4 -5"/></g>
  <g transform="translate(80 94)"><path d="M5 -11A12 12 0 1 0 5 11A9.5 9.5 0 1 1 5 -11Z"/></g>
  <g transform="translate(0 94)"><path d="M-8 9V-7L8 -10V6M-8 -3L8 -6"/><ellipse cx="-11.4" cy="9" rx="3.8" ry="2.8" transform="rotate(-20 -11.4 9)"/><ellipse cx="4.6" cy="6" rx="3.8" ry="2.8" transform="rotate(-20 4.6 6)"/></g>
  <g transform="translate(160 94)"><path d="M-8 9V-7L8 -10V6M-8 -3L8 -6"/><ellipse cx="-11.4" cy="9" rx="3.8" ry="2.8" transform="rotate(-20 -11.4 9)"/><ellipse cx="4.6" cy="6" rx="3.8" ry="2.8" transform="rotate(-20 4.6 6)"/></g>
</g>
<g fill="${GOLD}" opacity=".34">
  <path transform="translate(80 30)" d="M0 -6Q1 -1 6 0Q1 1 0 6Q-1 1 -6 0Q-1 -1 0 -6Z"/>
  <path transform="translate(40 92)" d="M0 -5Q.8 -.8 5 0Q.8 .8 0 5Q-.8 .8 -5 0Q-.8 -.8 0 -5Z"/>
  <path transform="translate(120 92)" d="M0 -5Q.8 -.8 5 0Q.8 .8 0 5Q-.8 .8 -5 0Q-.8 -.8 0 -5Z"/>
</g>
<g fill="${CREAM}" opacity=".16">
  <circle cx="18" cy="64" r=".9"/><circle cx="62" cy="58" r=".9"/><circle cx="100" cy="66" r=".9"/><circle cx="142" cy="60" r=".9"/>
  <circle cx="12" cy="8" r=".9"/><circle cx="76" cy="6" r=".9"/><circle cx="148" cy="10" r=".9"/><circle cx="58" cy="116" r=".9"/><circle cx="102" cy="114" r=".9"/>
</g>
</svg>`

const TILE_URL = `url("data:image/svg+xml,${encodeURIComponent(TILE.replace(/\s*\n\s*/g, ""))}")`

export default function CasinoFelt({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative isolate flex min-h-full flex-col justify-center overflow-hidden rounded-2xl px-3 py-6"
      style={{ backgroundColor: FELT, backgroundImage: TILE_URL, backgroundSize: "160px 120px" }}
    >
      {/* Los arcos de la mesa, centrados donde cae la rueda */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[40%] -z-10 aspect-square w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: `${GOLD}38` }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[40%] -z-10 aspect-square w-[29rem] -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: `${GOLD}1f` }}
      />
      {/* El marco de la mesa: una línea gruesa y otra fina por dentro, las dos doradas */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-[6px] -z-10 rounded-[14px] border-[1.5px]" style={{ borderColor: `${GOLD}8c` }} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-[10px] -z-10 rounded-[10px] border" style={{ borderColor: `${GOLD}38` }} />
      {children}
    </div>
  )
}
