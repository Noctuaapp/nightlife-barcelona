import type { IntlLang } from "./lang"

// Textos de metro para las páginas en inglés, alemán, francés e italiano. Los nombres de estación no se traducen
// (son nombres propios); solo se limpia el separador « | » de las que llevan dos nombres y se traducen «Nord/Sud»
// de L9 y L10.

export const metroStationName = (name: string): string => name.replace(/\s*\|\s*/g, " / ")

const SECTIONS: Record<IntlLang, { Nord: string; Sud: string }> = {
  en: { Nord: "North", Sud: "South" },
  de: { Nord: "Nord", Sud: "Süd" },
  fr: { Nord: "Nord", Sud: "Sud" },
  it: { Nord: "Nord", Sud: "Sud" },
}

export const sectionNameOf = (lang: IntlLang, name: string): string => (name === "Nord" ? SECTIONS[lang].Nord : name === "Sud" ? SECTIONS[lang].Sud : name)

/** L6, L7, L8 y L12 son de FGC; el resto de TMB (metrosLines.ts, comentario de cabecera). */
export const FGC_LINES = new Set(["L6", "L7", "L8", "L12"])

export const operatorOf = (code: string): string => (FGC_LINES.has(code) ? "FGC" : "TMB")
