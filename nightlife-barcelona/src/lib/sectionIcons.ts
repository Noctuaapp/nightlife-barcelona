import { Martini, Ticket, Backpack, type LucideIcon } from "lucide-react"

// Iconos de las tres secciones de Explorar (03/11/2026). Antes la barra inferior usaba una copa, una
// entrada y una mochila, mientras que el mapa y sus selectores usaban un disco, un calendario y un
// pin, y el resto de la web mezclaba ambos. Ahora todo sale de aquí: si algún día se cambia un
// icono, se cambia en un solo sitio.
export type SectionKey = "clubs" | "events" | "essentials"

export const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  clubs: Martini,
  events: Ticket,
  essentials: Backpack,
}
