// Textos de metro para las páginas en inglés. Los nombres de estación no se traducen (son nombres propios);
// solo se limpia el separador « | » de las que llevan dos nombres y se traducen «Nord/Sud» de L9 y L10.

export const metroStationName = (name: string): string => name.replace(/\s*\|\s*/g, " / ")

export const sectionName = (name: string): string => (name === "Nord" ? "North" : name === "Sud" ? "South" : name)

/** L6, L7, L8 y L12 son de FGC; el resto de TMB (metrosLines.ts, comentario de cabecera). */
export const FGC_LINES = new Set(["L6", "L7", "L8", "L12"])

export const operatorOf = (code: string): string => (FGC_LINES.has(code) ? "FGC" : "TMB")
