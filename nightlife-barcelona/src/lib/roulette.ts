// Matemática de la ruleta del «Sorpréndeme» (10/11/2026). Está aparte del dibujo para poder probarla: dado
// el momento de la tirada (0 a 1) y el plan de esa tirada, dice en qué ángulo va la rueda, en cuál la bola y a
// qué distancia del centro. Todos los ángulos van en grados, medidos desde arriba y hacia la derecha.
//
// La rueda gira hacia la derecha y frena; la bola da vueltas hacia el otro lado, algo más rápida, y hacia el
// final baja de la pista a las casillas rebotando un poco hasta quedarse quieta en la casilla elegida. Lo que
// sale en la pantalla (el local) ya está decidido antes de girar: la ruleta solo lo pone en escena.

export const POCKETS = 24
export const PITCH = 360 / POCKETS
/** Distancia del centro a la que corre la bola por la pista (unidades del dibujo, que mide 240). */
export const R_TRACK = 101
/** Distancia a la que queda la bola dentro de una casilla. */
export const R_POCKET = 77

export type SpinPlan = {
  /** Ángulo de la rueda al empezar. */
  wheelStart: number
  /** Cuánto gira la rueda en total (grados, hacia la derecha). */
  wheelTravel: number
  /** Vueltas que da la bola respecto a la rueda, hacia la izquierda. */
  ballLaps: number
  /** Casilla (0 a POCKETS-1) donde se queda la bola. */
  pocket: number
}

export function planSpin(rand: () => number = Math.random): SpinPlan {
  return {
    wheelStart: rand() * 360,
    wheelTravel: 540 + rand() * 180,
    ballLaps: 3 + Math.floor(rand() * 2),
    pocket: Math.min(POCKETS - 1, Math.floor(rand() * POCKETS)),
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Arranca rápido y frena suave. */
const easeOut = (u: number) => 1 - Math.pow(1 - u, 3)

/** Centro (en grados) de una casilla, respecto a la rueda. */
export const pocketCenter = (pocket: number) => (pocket + 0.5) * PITCH

export type SpinFrame = { wheel: number; ball: number; radius: number }

/** Estado de la rueda y la bola en el momento `u` (0 = sale la bola, 1 = quieta en su casilla). */
export function frameAt(u: number, plan: SpinPlan): SpinFrame {
  const k = clamp01(u)
  const e = easeOut(k)
  const wheel = plan.wheelStart + plan.wheelTravel * e
  // La bola respecto a la rueda: empieza `ballLaps` vueltas por detrás y acaba justo en el centro de su casilla.
  const relative = pocketCenter(plan.pocket) + plan.ballLaps * 360 * (1 - e)
  const ball = wheel + relative

  // La bola corre por la pista hasta el 58 % de la tirada y luego baja a las casillas con un par de rebotes.
  const drop = clamp01((k - 0.58) / 0.42)
  const sink = 1 - Math.pow(drop, 1.5)
  const bounce = Math.sin(drop * Math.PI * 3.5) * 4.5 * Math.pow(1 - drop, 2)
  const radius = Math.max(R_POCKET - 2, Math.min(R_TRACK, R_POCKET + (R_TRACK - R_POCKET) * sink + bounce))
  return { wheel, ball, radius }
}

/** Ángulo (0 a 360) normalizado. */
export const norm = (deg: number) => ((deg % 360) + 360) % 360
