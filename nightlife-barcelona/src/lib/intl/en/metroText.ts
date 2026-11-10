// Textos de metro para las páginas en inglés (los de los cuatro idiomas están en lib/intl/metroText.ts).

import { FGC_LINES, metroStationName, operatorOf, sectionNameOf } from "../metroText"

export { FGC_LINES, metroStationName, operatorOf }

export const sectionName = (name: string): string => sectionNameOf("en", name)
