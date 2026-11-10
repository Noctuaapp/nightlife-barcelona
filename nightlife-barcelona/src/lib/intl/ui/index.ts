import type { IntlLang } from "../lang"
import { EN, type Ui } from "./en"
import { DE } from "./de"
import { FR } from "./fr"
import { IT } from "./it"

// Textos de las páginas de cada idioma internacional. Tienen todos las mismas claves: si a uno le falta una,
// TypeScript lo dice al compilar.

export type { Ui }

export const UI: Record<IntlLang, Ui> = { en: EN, de: DE, fr: FR, it: IT }

export const uiOf = (lang: IntlLang): Ui => UI[lang]
