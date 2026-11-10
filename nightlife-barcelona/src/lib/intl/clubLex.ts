import type { IntlLang } from "./lang"

// Léxico de los textos de cada local en cada idioma (10/11/2026). Los datos del local salen de la base en
// español (tipo de local, música, días, precio en texto libre); aquí está lo que hace falta para pasarlos a
// inglés, alemán, francés e italiano SIN inventar: si algo no se puede traducir con garantías (un precio escrito
// a mano, por ejemplo), clubText.ts lo deja tal cual y lo marca como español.
//
// Los textos que se montan con frases (título, descripción, párrafo de la ficha) viven en «tpl» de cada idioma.

export type KindKey = "karaoke" | "pool" | "cocktail" | "pub" | "bar" | "live" | "club"
export type Kind = { noun: string; plural: string; /** con artículo indefinido: «a nightclub», «eine Bar» */ indef: string }

export type ClubTpl = {
  intro: (name: string, indef: string, place: string, street: string) => string
  music: (list: string) => string
  hours: (list: string) => string
  entry: (text: string) => string
  age: (n: number) => string
  dress: (d: string) => string
  features: (list: string) => string
  lgbt: string
  ratingFull: (value: string, reviews: string) => string
  ratingShort: (value: string) => string
  titleBase: (name: string, kind: string, place: string) => string
  titleTail: string
  metaIntro: (name: string, indef: string, place: string) => string
  metaHours: (h: string) => string
  metaEntry: (e: string) => string
  metaMusic: (m: string) => string
  metaTransit: string
}

export type ClubLex = {
  kinds: Record<KindKey, Kind>
  /** Etiqueta de cada estilo de música (clave canónica → texto). */
  musicLabel: Record<string, string>
  /** Lunes a domingo, abreviados. */
  days: [string, string, string, string, string, string, string]
  everyNight: string
  and: string
  /** Palabras de un precio en español (sin tildes, en minúsculas) → su traducción. */
  priceWords: Record<string, string>
  /** Palabras que ya valen tal cual (neutras o ya en este idioma). */
  priceKeep: string[]
  /** Frases hechas que se sustituyen antes de mirar palabra a palabra. */
  pricePhrases: [RegExp, string][]
  baseFeatures: { terrace: string; smoking: string; vip: string; foosball: string; booking: string }
  features: Record<string, string>
  elegant: string
  tpl: ClubTpl
}

// Estilos de música que se reconocen en lo que escribe el admin (español o inglés) → clave canónica.
export const MUSIC_KEYS: Record<string, string> = {
  comercial: "commercial",
  commercial: "commercial",
  latina: "latin",
  latino: "latin",
  latin: "latin",
  electronica: "electronic",
  electronic: "electronic",
  reggaeton: "reggaeton",
  "hip hop": "hiphop",
  "hip-hop": "hiphop",
  hiphop: "hiphop",
  rap: "rap",
  trap: "trap",
  "r&b": "rnb",
  rnb: "rnb",
  urbana: "urban",
  urbano: "urban",
  urban: "urban",
  techno: "techno",
  house: "house",
  "deep house": "deephouse",
  "tech house": "techhouse",
  minimal: "minimal",
  edm: "edm",
  pop: "pop",
  rock: "rock",
  indie: "indie",
  punk: "punk",
  metal: "metal",
  jazz: "jazz",
  soul: "soul",
  funk: "funk",
  blues: "blues",
  disco: "disco",
  salsa: "salsa",
  bachata: "bachata",
  merengue: "merengue",
  cumbia: "cumbia",
  kizomba: "kizomba",
  flamenco: "flamenco",
  rumba: "rumba",
  dj: "dj",
  variada: "mixed",
  variado: "mixed",
  mixta: "mixed",
  mixto: "mixed",
  "de todo": "mixed",
  "musica en directo": "live",
  directo: "live",
  "años 80": "80s",
  "anos 80": "80s",
  "años 90": "90s",
  "anos 90": "90s",
  "80s": "80s",
  "90s": "90s",
  "2000s": "2000s",
}

const EN: ClubLex = {
  kinds: {
    karaoke: { noun: "karaoke bar", plural: "karaoke bars", indef: "a karaoke bar" },
    pool: { noun: "pool bar", plural: "pool bars", indef: "a pool bar" },
    cocktail: { noun: "cocktail bar", plural: "cocktail bars", indef: "a cocktail bar" },
    pub: { noun: "pub", plural: "pubs", indef: "a pub" },
    bar: { noun: "bar", plural: "bars", indef: "a bar" },
    live: { noun: "live music venue", plural: "live music venues", indef: "a live music venue" },
    club: { noun: "nightclub", plural: "nightclubs", indef: "a nightclub" },
  },
  musicLabel: {
    commercial: "commercial", latin: "Latin", electronic: "electronic", reggaeton: "reggaeton", hiphop: "hip hop", rap: "rap", trap: "trap",
    rnb: "R&B", urban: "urban", techno: "techno", house: "house", deephouse: "deep house", techhouse: "tech house", minimal: "minimal", edm: "EDM",
    pop: "pop", rock: "rock", indie: "indie", punk: "punk", metal: "metal", jazz: "jazz", soul: "soul", funk: "funk", blues: "blues",
    disco: "disco", salsa: "salsa", bachata: "bachata", merengue: "merengue", cumbia: "cumbia", kizomba: "kizomba", flamenco: "flamenco",
    rumba: "rumba", dj: "DJ sets", mixed: "mixed", live: "live music", "80s": "80s", "90s": "90s", "2000s": "2000s",
  },
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  everyNight: "Every night",
  and: "and",
  priceWords: {
    gratis: "free", gratuita: "free", gratuito: "free", libre: "free", entrada: "entry", copa: "drink", copas: "drinks", consumicion: "drink",
    incluida: "included", incluido: "included", con: "with", sin: "without", antes: "before", despues: "after", hasta: "until", desde: "from",
    y: "and", o: "or", de: "", la: "", el: "", las: "", los: "", una: "a", un: "a", anticipada: "in advance", puerta: "at the door",
    hombres: "men", mujeres: "women", chicos: "men", chicas: "women", por: "per", persona: "person", lista: "guest list", mesa: "table",
    reservado: "VIP table", noche: "night", noches: "nights",
  },
  priceKeep: ["free", "entry", "drink", "drinks", "with", "without", "before", "after", "until", "from", "and", "or", "a", "in", "advance", "at", "the", "door", "men", "women", "per", "person", "guest", "list", "table", "vip", "included", "online", "night", "nights", "h", "am", "pm", "eur", "euros", "euro", "cover"],
  pricePhrases: [
    [/\bcon\s+(?:una\s+|1\s+)?(?:copa|consumici[oó]n)\b/gi, "with a drink"],
    [/\b(?:copa|consumici[oó]n)\s+incluida\b/gi, "drink included"],
    [/\b(\d+)\s+copas\b/gi, "$1 drinks"],
  ],
  baseFeatures: { terrace: "a terrace", smoking: "a smoking area", vip: "VIP tables", foosball: "pool or foosball tables", booking: "table booking" },
  features: {
    cigarette_machine: "a cigarette machine", darts: "darts", karaoke: "karaoke", sports_tv: "TVs for live sport", hot_shows: "adult shows (18+)",
    cocktails: "a cocktail menu", games: "board and drinking games", live_music: "live music", dance_floor: "a dance floor", cloakroom: "a cloakroom",
    food: "a kitchen", shisha: "shisha", wheelchair_accessible: "wheelchair access", birthdays: "birthday celebrations",
    private_events: "private events", venue_rental: "venue hire",
  },
  elegant: "Elegant",
  tpl: {
    intro: (name, indef, place, street) => `${name} is ${indef} in ${place}${street ? `, at ${street}` : ""}.`,
    music: (l) => `Music: ${l}.`,
    hours: (l) => `Opening hours: ${l}.`,
    entry: (t) => `Entry: ${t}.`,
    age: (n) => `Minimum age: ${n}+.`,
    dress: (d) => `Dress code: ${d}.`,
    features: (l) => `It has ${l}.`,
    lgbt: "It is an LGBTQ+ friendly venue.",
    ratingFull: (v, n) => `Google rating: ${v} out of 5 from ${n} reviews.`,
    ratingShort: (v) => `Google rating: ${v} out of 5.`,
    titleBase: (name, kind, place) => `${name} – ${kind} in ${place}`,
    titleTail: ": hours & how to get home | Noctua",
    metaIntro: (name, indef, place) => `${name}, ${indef} in ${place}.`,
    metaHours: (h) => `Hours: ${h}.`,
    metaEntry: (e) => `Entry: ${e}.`,
    metaMusic: (m) => `Music: ${m}.`,
    metaTransit: "Night bus, metro and taxi to get home.",
  },
}

const DE: ClubLex = {
  kinds: {
    karaoke: { noun: "Karaoke-Bar", plural: "Karaoke-Bars", indef: "eine Karaoke-Bar" },
    pool: { noun: "Billardbar", plural: "Billardbars", indef: "eine Billardbar" },
    cocktail: { noun: "Cocktailbar", plural: "Cocktailbars", indef: "eine Cocktailbar" },
    pub: { noun: "Pub", plural: "Pubs", indef: "ein Pub" },
    bar: { noun: "Bar", plural: "Bars", indef: "eine Bar" },
    live: { noun: "Live-Musik-Lokal", plural: "Live-Musik-Lokale", indef: "ein Live-Musik-Lokal" },
    club: { noun: "Nachtclub", plural: "Nachtclubs", indef: "ein Nachtclub" },
  },
  musicLabel: {
    commercial: "Mainstream", latin: "Latin", electronic: "elektronische Musik", reggaeton: "Reggaeton", hiphop: "Hip-Hop", rap: "Rap", trap: "Trap",
    rnb: "R&B", urban: "Urban", techno: "Techno", house: "House", deephouse: "Deep House", techhouse: "Tech House", minimal: "Minimal", edm: "EDM",
    pop: "Pop", rock: "Rock", indie: "Indie", punk: "Punk", metal: "Metal", jazz: "Jazz", soul: "Soul", funk: "Funk", blues: "Blues",
    disco: "Disco", salsa: "Salsa", bachata: "Bachata", merengue: "Merengue", cumbia: "Cumbia", kizomba: "Kizomba", flamenco: "Flamenco",
    rumba: "Rumba", dj: "DJ-Sets", mixed: "gemischt", live: "Livemusik", "80s": "80er", "90s": "90er", "2000s": "2000er",
  },
  days: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  everyNight: "Jede Nacht",
  and: "und",
  priceWords: {
    gratis: "kostenlos", gratuita: "kostenlos", gratuito: "kostenlos", libre: "kostenlos", entrada: "Eintritt", copa: "Getränk", copas: "Getränke",
    consumicion: "Getränk", incluida: "inklusive", incluido: "inklusive", con: "mit", sin: "ohne", antes: "vor", despues: "nach", hasta: "bis",
    desde: "ab", y: "und", o: "oder", de: "", la: "", el: "", las: "", los: "", una: "ein", un: "ein", anticipada: "im Vorverkauf",
    puerta: "an der Tür", hombres: "Männer", mujeres: "Frauen", chicos: "Männer", chicas: "Frauen", por: "pro", persona: "Person",
    lista: "Gästeliste", mesa: "Tisch", reservado: "VIP-Tisch", noche: "Nacht", noches: "Nächte",
  },
  priceKeep: ["vip", "online", "h", "am", "pm", "eur", "euro", "euros", "dj"],
  pricePhrases: [
    [/\bcon\s+(?:una\s+|1\s+)?(?:copa|consumici[oó]n)\b/gi, "mit Getränk"],
    [/\b(?:copa|consumici[oó]n)\s+incluida\b/gi, "Getränk inklusive"],
    [/\b(\d+)\s+copas\b/gi, "$1 Getränke"],
  ],
  baseFeatures: { terrace: "Terrasse", smoking: "Raucherbereich", vip: "VIP-Tische", foosball: "Billard- oder Kickertische", booking: "Tischreservierung" },
  features: {
    cigarette_machine: "Zigarettenautomat", darts: "Darts", karaoke: "Karaoke", sports_tv: "Sport-TV (Live-Übertragungen)", hot_shows: "Shows für Erwachsene (ab 18)",
    cocktails: "Cocktailkarte", games: "Brett- und Trinkspiele", live_music: "Livemusik", dance_floor: "Tanzfläche", cloakroom: "Garderobe",
    food: "Küche", shisha: "Shisha", wheelchair_accessible: "rollstuhlgerechter Zugang", birthdays: "Geburtstagsfeiern",
    private_events: "private Veranstaltungen", venue_rental: "Anmietung des Lokals",
  },
  elegant: "Elegant",
  tpl: {
    intro: (name, indef, place, street) => `${name} ist ${indef} in ${place}${street ? ` unter der Adresse ${street}` : ""}.`,
    music: (l) => `Musik: ${l}.`,
    hours: (l) => `Öffnungszeiten: ${l}.`,
    entry: (t) => `Eintritt: ${t}.`,
    age: (n) => `Mindestalter: ${n}+.`,
    dress: (d) => `Dresscode: ${d}.`,
    features: (l) => `Ausstattung: ${l}.`,
    lgbt: "Das Lokal ist LGBTQ+-freundlich.",
    ratingFull: (v, n) => `Google-Bewertung: ${v} von 5 bei ${n} Rezensionen.`,
    ratingShort: (v) => `Google-Bewertung: ${v} von 5.`,
    titleBase: (name, kind, place) => `${name} – ${kind} in ${place}`,
    titleTail: ": Öffnungszeiten & Heimweg | Noctua",
    metaIntro: (name, indef, place) => `${name}, ${indef} in ${place}.`,
    metaHours: (h) => `Öffnungszeiten: ${h}.`,
    metaEntry: (e) => `Eintritt: ${e}.`,
    metaMusic: (m) => `Musik: ${m}.`,
    metaTransit: "Nachtbus, Metro und Taxi für den Heimweg.",
  },
}

const FR: ClubLex = {
  kinds: {
    karaoke: { noun: "bar karaoké", plural: "bars karaoké", indef: "un bar karaoké" },
    pool: { noun: "bar de billard", plural: "bars de billard", indef: "un bar de billard" },
    cocktail: { noun: "bar à cocktails", plural: "bars à cocktails", indef: "un bar à cocktails" },
    pub: { noun: "pub", plural: "pubs", indef: "un pub" },
    bar: { noun: "bar", plural: "bars", indef: "un bar" },
    live: { noun: "salle de concerts", plural: "salles de concerts", indef: "une salle de concerts" },
    club: { noun: "boîte de nuit", plural: "boîtes de nuit", indef: "une boîte de nuit" },
  },
  musicLabel: {
    commercial: "commerciale", latin: "latine", electronic: "électronique", reggaeton: "reggaeton", hiphop: "hip-hop", rap: "rap", trap: "trap",
    rnb: "R&B", urban: "urbaine", techno: "techno", house: "house", deephouse: "deep house", techhouse: "tech house", minimal: "minimale", edm: "EDM",
    pop: "pop", rock: "rock", indie: "indie", punk: "punk", metal: "métal", jazz: "jazz", soul: "soul", funk: "funk", blues: "blues",
    disco: "disco", salsa: "salsa", bachata: "bachata", merengue: "merengue", cumbia: "cumbia", kizomba: "kizomba", flamenco: "flamenco",
    rumba: "rumba", dj: "sets de DJ", mixed: "variée", live: "musique live", "80s": "années 80", "90s": "années 90", "2000s": "années 2000",
  },
  days: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."],
  everyNight: "Tous les soirs",
  and: "et",
  priceWords: {
    gratis: "gratuit", gratuita: "gratuit", gratuito: "gratuit", libre: "gratuit", entrada: "entrée", copa: "verre", copas: "verres",
    consumicion: "consommation", incluida: "inclus", incluido: "inclus", con: "avec", sin: "sans", antes: "avant", despues: "après",
    hasta: "jusqu'à", desde: "à partir de", y: "et", o: "ou", de: "", la: "", el: "", las: "", los: "", una: "un", un: "un",
    anticipada: "en prévente", puerta: "sur place", hombres: "hommes", mujeres: "femmes", chicos: "hommes", chicas: "femmes", por: "par",
    persona: "personne", lista: "liste d'invités", mesa: "table", reservado: "table VIP", noche: "nuit", noches: "nuits",
  },
  priceKeep: ["vip", "online", "h", "am", "pm", "eur", "euro", "euros", "dj"],
  pricePhrases: [
    [/\bcon\s+(?:una\s+|1\s+)?(?:copa|consumici[oó]n)\b/gi, "avec un verre"],
    [/\b(?:copa|consumici[oó]n)\s+incluida\b/gi, "verre inclus"],
    [/\b(\d+)\s+copas\b/gi, "$1 verres"],
  ],
  baseFeatures: { terrace: "terrasse", smoking: "espace fumeurs", vip: "tables VIP", foosball: "billard ou baby-foot", booking: "réservation de tables" },
  features: {
    cigarette_machine: "distributeur de cigarettes", darts: "fléchettes", karaoke: "karaoké", sports_tv: "télés pour le sport en direct", hot_shows: "spectacles pour adultes (18+)",
    cocktails: "carte de cocktails", games: "jeux de société et jeux à boire", live_music: "musique live", dance_floor: "piste de danse", cloakroom: "vestiaire",
    food: "cuisine", shisha: "chicha", wheelchair_accessible: "accès en fauteuil roulant", birthdays: "fêtes d'anniversaire",
    private_events: "événements privés", venue_rental: "location du lieu",
  },
  elegant: "Élégant",
  tpl: {
    intro: (name, indef, place, street) => `${name} est ${indef} à ${place}${street ? `, à l'adresse ${street}` : ""}.`,
    music: (l) => `Musique : ${l}.`,
    hours: (l) => `Horaires : ${l}.`,
    entry: (t) => `Entrée : ${t}.`,
    age: (n) => `Âge minimum : ${n}+.`,
    dress: (d) => `Dress code : ${d}.`,
    features: (l) => `Services : ${l}.`,
    lgbt: "Établissement LGBTQ+ friendly.",
    ratingFull: (v, n) => `Note Google : ${v} sur 5 (${n} avis).`,
    ratingShort: (v) => `Note Google : ${v} sur 5.`,
    titleBase: (name, kind, place) => `${name} – ${kind} à ${place}`,
    titleTail: " : horaires et retour | Noctua",
    metaIntro: (name, indef, place) => `${name}, ${indef} à ${place}.`,
    metaHours: (h) => `Horaires : ${h}.`,
    metaEntry: (e) => `Entrée : ${e}.`,
    metaMusic: (m) => `Musique : ${m}.`,
    metaTransit: "Bus de nuit, métro et taxi pour rentrer.",
  },
}

const IT: ClubLex = {
  kinds: {
    karaoke: { noun: "karaoke bar", plural: "karaoke bar", indef: "un karaoke bar" },
    pool: { noun: "bar con biliardo", plural: "bar con biliardo", indef: "un bar con biliardo" },
    cocktail: { noun: "cocktail bar", plural: "cocktail bar", indef: "un cocktail bar" },
    pub: { noun: "pub", plural: "pub", indef: "un pub" },
    bar: { noun: "bar", plural: "bar", indef: "un bar" },
    live: { noun: "locale con musica dal vivo", plural: "locali con musica dal vivo", indef: "un locale con musica dal vivo" },
    club: { noun: "discoteca", plural: "discoteche", indef: "una discoteca" },
  },
  musicLabel: {
    commercial: "commerciale", latin: "latina", electronic: "elettronica", reggaeton: "reggaeton", hiphop: "hip hop", rap: "rap", trap: "trap",
    rnb: "R&B", urban: "urban", techno: "techno", house: "house", deephouse: "deep house", techhouse: "tech house", minimal: "minimal", edm: "EDM",
    pop: "pop", rock: "rock", indie: "indie", punk: "punk", metal: "metal", jazz: "jazz", soul: "soul", funk: "funk", blues: "blues",
    disco: "disco", salsa: "salsa", bachata: "bachata", merengue: "merengue", cumbia: "cumbia", kizomba: "kizomba", flamenco: "flamenco",
    rumba: "rumba", dj: "DJ set", mixed: "mista", live: "musica dal vivo", "80s": "anni '80", "90s": "anni '90", "2000s": "anni 2000",
  },
  days: ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
  everyNight: "Ogni sera",
  and: "e",
  priceWords: {
    gratis: "gratis", gratuita: "gratis", gratuito: "gratis", libre: "gratis", entrada: "ingresso", copa: "drink", copas: "drink",
    consumicion: "consumazione", incluida: "incluso", incluido: "incluso", con: "con", sin: "senza", antes: "prima", despues: "dopo",
    hasta: "fino a", desde: "da", y: "e", o: "o", de: "", la: "", el: "", las: "", los: "", una: "un", un: "un",
    anticipada: "in prevendita", puerta: "alla porta", hombres: "uomini", mujeres: "donne", chicos: "uomini", chicas: "donne", por: "per",
    persona: "persona", lista: "lista ospiti", mesa: "tavolo", reservado: "tavolo VIP", noche: "notte", noches: "notti",
  },
  priceKeep: ["vip", "online", "h", "am", "pm", "eur", "euro", "euros", "dj"],
  pricePhrases: [
    [/\bcon\s+(?:una\s+|1\s+)?(?:copa|consumici[oó]n)\b/gi, "con un drink"],
    [/\b(?:copa|consumici[oó]n)\s+incluida\b/gi, "drink incluso"],
    [/\b(\d+)\s+copas\b/gi, "$1 drink"],
  ],
  baseFeatures: { terrace: "terrazza", smoking: "area fumatori", vip: "tavoli VIP", foosball: "biliardo o calcio balilla", booking: "prenotazione tavoli" },
  features: {
    cigarette_machine: "distributore di sigarette", darts: "freccette", karaoke: "karaoke", sports_tv: "TV per lo sport in diretta", hot_shows: "spettacoli per adulti (18+)",
    cocktails: "carta di cocktail", games: "giochi da tavolo e drinking games", live_music: "musica dal vivo", dance_floor: "pista da ballo", cloakroom: "guardaroba",
    food: "cucina", shisha: "shisha", wheelchair_accessible: "accesso per sedie a rotelle", birthdays: "feste di compleanno",
    private_events: "eventi privati", venue_rental: "affitto del locale",
  },
  elegant: "Elegante",
  tpl: {
    intro: (name, indef, place, street) => `${name} è ${indef} a ${place}${street ? `, all'indirizzo ${street}` : ""}.`,
    music: (l) => `Musica: ${l}.`,
    hours: (l) => `Orari: ${l}.`,
    entry: (t) => `Ingresso: ${t}.`,
    age: (n) => `Età minima: ${n}+.`,
    dress: (d) => `Dress code: ${d}.`,
    features: (l) => `Servizi: ${l}.`,
    lgbt: "Il locale è LGBTQ+ friendly.",
    ratingFull: (v, n) => `Valutazione Google: ${v} su 5 (${n} recensioni).`,
    ratingShort: (v) => `Valutazione Google: ${v} su 5.`,
    titleBase: (name, kind, place) => `${name} – ${kind} a ${place}`,
    titleTail: ": orari e come tornare a casa | Noctua",
    metaIntro: (name, indef, place) => `${name}, ${indef} a ${place}.`,
    metaHours: (h) => `Orari: ${h}.`,
    metaEntry: (e) => `Ingresso: ${e}.`,
    metaMusic: (m) => `Musica: ${m}.`,
    metaTransit: "Bus notturno, metro e taxi per tornare a casa.",
  },
}

export const CLUB_LEX: Record<IntlLang, ClubLex> = { en: EN, de: DE, fr: FR, it: IT }
