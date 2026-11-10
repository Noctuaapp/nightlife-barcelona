import type { IntlLang } from "./lang"
import type { Guide, GuideCtx, GuideMeta } from "./guideTypes"
import * as en from "./en/guides"
import * as de from "./de/guides"
import * as fr from "./fr/guides"
import * as it from "./it/guides"

// Las siete guías para visitantes en cada idioma (mismos temas, mismo orden y mismas direcciones: solo cambia el texto).

export type GuideSet = {
  GUIDES: GuideMeta[]
  GUIDES_REVIEWED: string
  guideMeta: (slug: string) => GuideMeta | undefined
  buildGuide: (slug: string, ctx: GuideCtx) => Guide | null
}

const SETS: Record<IntlLang, GuideSet> = { en, de, fr, it }

export const guidesOf = (lang: IntlLang): GuideSet => SETS[lang]
