"use client"

import { useId } from "react"
import { currentSeasonalTheme, useNocSeasonalOverride } from "../../lib/nocSeasonal"
import { nocSvg, type NocPose, type OwlMood } from "../../lib/nocArt"

// Noc, el búho de Noctua. Rediseñado el 09/11/2026 (personaje de noche, estilo pegatina) y con cara nueva el
// 10/11/2026: mirada dura de búho de verdad, cadena de oro con luna y más actitud.
// El dibujo vive en lib/nocArt.ts (un solo sitio para el personaje, sus poses y sus disfraces); este
// componente solo decide qué toca pintar:
//   · mood: la expresión. "happy" es la de duro por defecto; además guiño, medio dormido, de fiesta, sorprendido,
//     "resaca" (gafas de sol) y "borracho" (bizco, colorado, "hic!"). "open" se dibuja igual que "happy".
//   · pose: lo que lleva en la mano para contar una parte de Noctua (cóctel, señal del NitBus, cruz de
//     farmacia, la ruta de Planifica…). Con pose no se pinta disfraz: mandaría demasiado en un dibujo pequeño.
//   · levelColor: el color del nivel va en el borde, la línea de la ceja y la barriga. Sin nivel, el violeta de marca.
//   · Disfraz de temporada: por fecha (lib/nocSeasonal.ts) o forzado/apagado desde /admin/herramientas.
export type { OwlMood, NocPose }

export default function NocOwl({
  size = 64,
  mood = "happy",
  pose,
  className = "",
  levelColor,
  seasonal = true,
}: {
  size?: number
  mood?: OwlMood
  pose?: NocPose
  className?: string
  levelColor?: string
  // Por si hace falta un Noc "neutro" en una pantalla concreta (una captura, un cartel) sin tocar el resto.
  seasonal?: boolean
}) {
  // "auto" (normal) | "none" (apagadas todas, puesto desde admin) | una temporada forzada a mano.
  const override = useNocSeasonalOverride()
  const dateTheme = currentSeasonalTheme()
  const resolvedTheme = override === "none" ? null : override === "auto" ? dateTheme : override
  const theme = seasonal && !pose ? resolvedTheme : null
  // Id único por instancia: con varios Noc a la vez en pantalla, un id fijo compartido haría que todos
  // usaran el recorte del último pintado.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "")
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      // Lo que Noc sujeta y varios disfraces (gorros, fuegos, la bandera) se salen del recuadro a propósito;
      // sin esto el navegador los recortaría.
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Noc, el búho de Noctua"
      xmlns="http://www.w3.org/2000/svg"
      // El contenido lo genera nocArt.ts con constantes y un color ya validado; no entra texto de usuarios.
      dangerouslySetInnerHTML={{ __html: nocSvg({ color: levelColor, mood, pose, theme, id: `noc${uid}` }) }}
    />
  )
}
