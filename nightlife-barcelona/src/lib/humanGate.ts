// «Puerta de persona real» de la analítica (13/11/2026).
//
// PROBLEMA: el 13/11/2026 entraron ~450 «visitas» de golpe desde países sin público (Bangladés, Pakistán,
// India, Vietnam…), cada una con una sola página y ningún clic. Eran bots que cargan la web con un navegador
// de verdad y disfrazado, así que filtrar por el nombre del navegador (`navigator.webdriver`, «bot» en el
// user-agent) no los detectaba.
//
// SOLUCIÓN: una visita solo se registra cuando el navegador ha notado una señal HUMANA: tocar la pantalla,
// pulsar una tecla, mover el ratón o girar la rueda. Mientras tanto, los eventos (la entrada, los cambios
// de página, el tiempo…) esperan en memoria; cuando llega la primera señal se envían todos, en orden. Si
// nunca llega, no se envía nada. Un bot que solo carga la página y se va ya no deja rastro.
//
// Lo que NO es: no es una prueba definitiva. Un bot que simule el ratón pasa esta puerta; para eso están
// el bloqueo por país y el barrido automático de la base de datos (supabase/97 y 98).
//
// Coste honesto: una persona que abre una página y la cierra sin tocar, mover ni pulsar nada (muy raro,
// sobre todo en móvil) ya no cuenta como visita.
//
// Solo cuentan las señales «de confianza» (`isTrusted`): las que dispara el propio navegador, no las que
// fabrica un script con dispatchEvent. No se usa «scroll» a propósito: el navegador también lo dispara solo
// (al restaurar la posición de la página), y un giro de la rueda, un toque o una tecla ya lo anticipan.

export const HUMAN_SIGNALS = ["pointerdown", "touchstart", "keydown", "wheel", "mousemove"] as const

// Cuántos eventos esperan como máximo antes de la primera señal (un bot no debe poder llenar la memoria).
const MAX_WAITING = 40

export type HumanGate<T> = {
  // ¿Ya hubo señal humana?
  isHuman: () => boolean
  // Guarda un evento hasta que haya señal humana (se descarta si ya hay demasiados esperando).
  hold: (item: T) => void
  // Primera señal humana: envía en orden lo que esperaba. Las siguientes llamadas no hacen nada.
  markHuman: () => void
}

export function createHumanGate<T>(release: (items: T[]) => void, max = MAX_WAITING): HumanGate<T> {
  let human = false
  let waiting: T[] = []
  return {
    isHuman: () => human,
    hold: (item) => {
      if (!human && waiting.length < max) waiting.push(item)
    },
    markHuman: () => {
      if (human) return
      human = true
      const items = waiting
      waiting = []
      if (items.length) release(items)
    },
  }
}

// Escucha las señales humanas en `target` (la ventana) y avisa UNA vez; después se desconecta sola.
// Devuelve una función para desconectarla antes si hiciera falta.
export function listenForHuman(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  onHuman: () => void,
  isTrusted: (e: Event) => boolean = (e) => e.isTrusted,
): () => void {
  const handler = (e: Event) => {
    if (!isTrusted(e)) return
    stop()
    onHuman()
  }
  const stop = () => {
    for (const type of HUMAN_SIGNALS) target.removeEventListener(type, handler, { capture: true })
  }
  for (const type of HUMAN_SIGNALS) target.addEventListener(type, handler, { capture: true, passive: true })
  return stop
}
