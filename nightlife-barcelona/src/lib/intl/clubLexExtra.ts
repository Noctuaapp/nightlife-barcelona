import { CLUB_LEX, type ClubLex } from "./clubLex"
import type { IntlLang } from "./lang"

// Neerlandés, portugués y catalán (11/11/2026). Son idiomas de la web (el selector del menú) que NO tienen
// páginas propias para Google (/nl, /pt, /ca no existen), así que aquí solo está lo que hace falta para que la
// ficha en la app enseñe en el idioma de la persona el horario, el precio y el estilo de música: los días, las
// etiquetas de música y las palabras de un precio. No hay frases de título ni de descripción (ver clubLex.ts).
// Mismo criterio que en los otros idiomas: si algún trozo no se reconoce, no se traduce nada del precio y se
// enseña tal cual está escrito (nunca una traducción adivinada).

/** Idiomas en los que se pueden traducir horario, precio y música: los 4 con páginas propias y estos 3. */
export type ClubLang = IntlLang | "nl" | "pt" | "ca"

export type LexCore = Pick<ClubLex, "musicLabel" | "days" | "everyNight" | "and" | "priceWords" | "priceKeep" | "pricePhrases">

const NL: LexCore = {
  musicLabel: {
    commercial: "commercieel", latin: "latin", electronic: "elektronische muziek", reggaeton: "reggaeton", hiphop: "hiphop", rap: "rap", trap: "trap",
    rnb: "R&B", urban: "urban", techno: "techno", house: "house", deephouse: "deep house", techhouse: "tech house", minimal: "minimal", edm: "EDM",
    pop: "pop", rock: "rock", indie: "indie", punk: "punk", metal: "metal", jazz: "jazz", soul: "soul", funk: "funk", blues: "blues",
    disco: "disco", salsa: "salsa", bachata: "bachata", merengue: "merengue", cumbia: "cumbia", kizomba: "kizomba", flamenco: "flamenco",
    rumba: "rumba", dj: "dj-sets", mixed: "gemengd", live: "live muziek", "80s": "jaren 80", "90s": "jaren 90", "2000s": "jaren 2000",
  },
  days: ["ma", "di", "wo", "do", "vr", "za", "zo"],
  everyNight: "Elke nacht",
  and: "en",
  priceWords: {
    gratis: "gratis", gratuita: "gratis", gratuito: "gratis", libre: "gratis", entrada: "entree", copa: "drankje", copas: "drankjes", consumicion: "drankje",
    incluida: "inbegrepen", incluido: "inbegrepen", con: "met", sin: "zonder", antes: "voor", despues: "na", hasta: "tot", desde: "vanaf",
    y: "en", o: "of", de: "", la: "", el: "", las: "", los: "", una: "een", un: "een", anticipada: "in voorverkoop", puerta: "aan de deur",
    hombres: "mannen", mujeres: "vrouwen", chicos: "mannen", chicas: "vrouwen", por: "per", persona: "persoon", lista: "gastenlijst", mesa: "tafel",
    reservado: "vip-tafel", noche: "nacht", noches: "nachten",
  },
  priceKeep: ["vip", "online", "h", "am", "pm", "eur", "euro", "euros", "dj"],
  pricePhrases: [
    [/\bcon\s+(?:una\s+|1\s+)?(?:copa|consumici[oó]n)\b/gi, "met een drankje"],
    [/\b(?:copa|consumici[oó]n)\s+incluida\b/gi, "drankje inbegrepen"],
    [/\b(\d+)\s+copas\b/gi, "$1 drankjes"],
  ],
}

const PT: LexCore = {
  musicLabel: {
    commercial: "comercial", latin: "latina", electronic: "eletrónica", reggaeton: "reggaeton", hiphop: "hip hop", rap: "rap", trap: "trap",
    rnb: "R&B", urban: "urbana", techno: "techno", house: "house", deephouse: "deep house", techhouse: "tech house", minimal: "minimal", edm: "EDM",
    pop: "pop", rock: "rock", indie: "indie", punk: "punk", metal: "metal", jazz: "jazz", soul: "soul", funk: "funk", blues: "blues",
    disco: "disco", salsa: "salsa", bachata: "bachata", merengue: "merengue", cumbia: "cumbia", kizomba: "kizomba", flamenco: "flamenco",
    rumba: "rumba", dj: "sets de DJ", mixed: "variada", live: "música ao vivo", "80s": "anos 80", "90s": "anos 90", "2000s": "anos 2000",
  },
  days: ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"],
  everyNight: "Todas as noites",
  and: "e",
  priceWords: {
    gratis: "grátis", gratuita: "grátis", gratuito: "grátis", libre: "grátis", entrada: "entrada", copa: "bebida", copas: "bebidas", consumicion: "bebida",
    incluida: "incluída", incluido: "incluída", con: "com", sin: "sem", antes: "antes de", despues: "depois de", hasta: "até", desde: "a partir de",
    y: "e", o: "ou", de: "", la: "", el: "", las: "", los: "", una: "uma", un: "um", anticipada: "antecipada", puerta: "na porta",
    hombres: "homens", mujeres: "mulheres", chicos: "homens", chicas: "mulheres", por: "por", persona: "pessoa", lista: "lista de convidados", mesa: "mesa",
    reservado: "mesa VIP", noche: "noite", noches: "noites",
  },
  priceKeep: ["vip", "online", "h", "am", "pm", "eur", "euro", "euros", "dj"],
  pricePhrases: [
    [/\bcon\s+(?:una\s+|1\s+)?(?:copa|consumici[oó]n)\b/gi, "com bebida"],
    [/\b(?:copa|consumici[oó]n)\s+incluida\b/gi, "bebida incluída"],
    [/\b(\d+)\s+copas\b/gi, "$1 bebidas"],
  ],
}

const CA: LexCore = {
  musicLabel: {
    commercial: "comercial", latin: "llatina", electronic: "electrònica", reggaeton: "reggaeton", hiphop: "hip hop", rap: "rap", trap: "trap",
    rnb: "R&B", urban: "urbana", techno: "techno", house: "house", deephouse: "deep house", techhouse: "tech house", minimal: "minimal", edm: "EDM",
    pop: "pop", rock: "rock", indie: "indie", punk: "punk", metal: "metal", jazz: "jazz", soul: "soul", funk: "funk", blues: "blues",
    disco: "disco", salsa: "salsa", bachata: "bachata", merengue: "merengue", cumbia: "cumbia", kizomba: "kizomba", flamenco: "flamenc",
    rumba: "rumba", dj: "sessions de DJ", mixed: "variada", live: "música en directe", "80s": "anys 80", "90s": "anys 90", "2000s": "anys 2000",
  },
  days: ["dl", "dt", "dc", "dj", "dv", "ds", "dg"],
  everyNight: "Cada nit",
  and: "i",
  priceWords: {
    gratis: "gratis", gratuita: "gratis", gratuito: "gratis", libre: "gratis", entrada: "entrada", copa: "copa", copas: "copes", consumicion: "consumició",
    incluida: "inclosa", incluido: "inclòs", con: "amb", sin: "sense", antes: "abans de", despues: "després de", hasta: "fins a", desde: "des de",
    y: "i", o: "o", de: "", la: "", el: "", las: "", los: "", una: "una", un: "un", anticipada: "anticipada", puerta: "a la porta",
    hombres: "homes", mujeres: "dones", chicos: "nois", chicas: "noies", por: "per", persona: "persona", lista: "llista", mesa: "taula",
    reservado: "taula VIP", noche: "nit", noches: "nits",
  },
  priceKeep: ["vip", "online", "h", "am", "pm", "eur", "euro", "euros", "dj"],
  pricePhrases: [
    [/\bcon\s+(?:una\s+|1\s+)?(?:copa|consumici[oó]n)\b/gi, "amb copa"],
    [/\b(?:copa|consumici[oó]n)\s+incluida\b/gi, "copa inclosa"],
    [/\b(\d+)\s+copas\b/gi, "$1 copes"],
  ],
}

const EXTRA: Record<"nl" | "pt" | "ca", LexCore> = { nl: NL, pt: PT, ca: CA }

/** Lo que hace falta para horario, precio y música en cualquiera de los 7 idiomas (el español no se traduce). */
export function lexCoreOf(lang: ClubLang): LexCore {
  return lang === "nl" || lang === "pt" || lang === "ca" ? EXTRA[lang] : CLUB_LEX[lang]
}

export const CLUB_LANGS: readonly ClubLang[] = ["en", "de", "fr", "it", "nl", "pt", "ca"]
