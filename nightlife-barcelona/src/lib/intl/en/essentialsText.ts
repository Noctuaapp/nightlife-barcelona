// Categorías de «Esenciales» que tienen página en inglés (/en/essentials/[slug]). Desde el 10/11/2026 los textos
// de los cuatro idiomas están en lib/intl/essentialsText.ts; este archivo deja los de inglés con los nombres de
// siempre.

import { essentialIn, essentialsOf, type EssentialText } from "../essentialsText"

export type EssentialEn = EssentialText

export const ESSENTIALS_EN: EssentialEn[] = essentialsOf("en")

export const essentialEn = (slug: string): EssentialEn | undefined => essentialIn("en", slug)
