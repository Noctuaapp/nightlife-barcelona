// Cálculos de Admin › Datos que convierten cifras sueltas en información (11/11/2026): comparar con el periodo
// anterior, embudo de la visita al registro, qué origen convierte, horas en hora de Madrid, acciones por club,
// búsquedas que terminan en algo e idioma de los visitantes. Los datos salen de supabase/88_datos_comparativas.sql
// y del Resumen; aquí solo se ordenan, se les pone nombre y se calculan los porcentajes.

// ---------- Periodo anterior ----------

export type DayRange = { from: string; to: string }

const MS_DAY = 86400000
// Mediodía UTC: el cambio de hora (marzo y octubre) nunca mueve el día.
const noon = (iso: string) => Date.parse(`${iso}T12:00:00Z`)

/** El periodo inmediatamente anterior, con los mismos días: 1-14 de noviembre → 18-31 de octubre. */
export function previousRange(from: string, to: string): DayRange {
  const len = Math.round((noon(to) - noon(from)) / MS_DAY) + 1
  return {
    from: new Date(noon(from) - len * MS_DAY).toISOString().slice(0, 10),
    to: new Date(noon(from) - MS_DAY).toISOString().slice(0, 10),
  }
}

export function rangeLength(from: string, to: string): number {
  return Math.round((noon(to) - noon(from)) / MS_DAY) + 1
}

// ---------- Comparar con el periodo anterior ----------

export type Trend = { dir: "up" | "down" | "flat"; text: string; prev: number; pct: number | null }

/** Con cifras pequeñas un «+300 %» (de 1 a 4) engaña: por debajo de este tope solo se enseña el valor de antes. */
export const SMALL_NUMBER = 10

/**
 * Variación de una cifra frente al periodo anterior. null si no hay con qué comparar.
 *   · iguales → «= igual»
 *   · las dos menores de 10 → solo «antes N» (el porcentaje no dice nada)
 *   · antes 0 → «nuevo (antes 0)»
 *   · si no → «▲ 18 %» / «▼ 12 %»
 */
export function compareValues(cur: number, prev: number | null | undefined): Trend | null {
  if (prev == null || !Number.isFinite(prev) || !Number.isFinite(cur)) return null
  if (cur === prev) return { dir: "flat", text: "= igual que antes", prev, pct: 0 }
  const dir = cur > prev ? "up" : "down"
  const arrow = dir === "up" ? "▲" : "▼"
  if (Math.max(cur, prev) < SMALL_NUMBER) return { dir, text: `${arrow} antes ${prev}`, prev, pct: null }
  if (prev === 0) return { dir, text: "▲ nuevo (antes 0)", prev, pct: null }
  const pct = Math.round((Math.abs(cur - prev) / prev) * 100)
  if (pct === 0) return { dir: "flat", text: "= igual que antes", prev, pct: 0 }
  return { dir, text: `${arrow} ${pct} %`, prev, pct }
}

// ---------- Porcentajes ----------

/** a de b en % con un decimal; null si no hay base (así no sale «0 %» donde en realidad no hay nada que medir). */
export function pctOf(a: number, b: number): number | null {
  return b > 0 ? Math.round((a / b) * 1000) / 10 : null
}

// ---------- Embudo ----------

export type FunnelRow = { step: string; n: number }
export type FunnelStep = { key: string; label: string; n: number; ofPrev: number | null; ofFirst: number | null }

export const BROWSE_STEPS: { key: string; label: string }[] = [
  { key: "visitors", label: "Visitantes" },
  { key: "ficha", label: "Ven la ficha de un club o evento" },
  { key: "interest", label: "Hacen algún clic en la ficha" },
  { key: "intent", label: "Pulsan entradas, cómo llegar o taxi" },
]

export const SIGNUP_STEPS: { key: string; label: string }[] = [
  { key: "join_view", label: "Les sale el aviso de registro" },
  { key: "signup_view", label: "Abren el registro" },
  { key: "choose", label: "Eligen email o Google" },
  { key: "signup_submit", label: "Envían el formulario" },
  { key: "signup_ok", label: "Completan el registro" },
  { key: "signup_error", label: "Se encuentran un error" },
]

function nOf(rows: FunnelRow[] | null | undefined, key: string): number {
  return Number((rows || []).find((r) => r.step === key)?.n) || 0
}

/** Pasos que se van anidando: cada uno se mide contra el anterior y contra el primero. */
export function browseSteps(rows: FunnelRow[] | null | undefined): FunnelStep[] {
  const first = nOf(rows, BROWSE_STEPS[0].key)
  return BROWSE_STEPS.map((s, i) => {
    const n = nOf(rows, s.key)
    const prev = i === 0 ? null : nOf(rows, BROWSE_STEPS[i - 1].key)
    return { key: s.key, label: s.label, n, ofPrev: prev === null ? null : pctOf(n, prev), ofFirst: i === 0 ? null : pctOf(n, first) }
  })
}

/**
 * Pasos del registro. No se anidan (con Google la persona sale de la web y vuelve, y eso rompe la cadena), así
 * que todos se miden contra los que abren el registro. Los dos primeros (aviso y apertura) no llevan porcentaje
 * del anterior: son cosas distintas.
 */
export function signupSteps(rows: FunnelRow[] | null | undefined): FunnelStep[] {
  const opened = nOf(rows, "signup_view")
  return SIGNUP_STEPS.map((s) => {
    const n = nOf(rows, s.key)
    return { key: s.key, label: s.label, n, ofPrev: null, ofFirst: s.key === "join_view" || s.key === "signup_view" ? null : pctOf(n, opened) }
  })
}

const SIGNUP_REASONS: Record<string, string> = {
  fill_all: "faltan campos", disposable_email: "correo temporal", weak_password: "contraseña débil",
  birth_date: "sin fecha de nacimiento", under_18: "menor de 18", terms: "no acepta los términos", age_check: "no confirma +18",
  password_policy: "contraseña sin mayúscula, minúscula, número o símbolo", password_min: "contraseña demasiado corta",
  password_pwned: "contraseña muy conocida o filtrada", password_same: "contraseña igual a la anterior",
  email_taken: "el correo ya tiene cuenta",
}

export type SignupErrorRow = { step: string; reason: string; n: number }

export function signupErrorRows(rows: SignupErrorRow[] | null | undefined): { label: string; n: number }[] {
  return (rows || [])
    .map((r) => {
      const known = SIGNUP_REASONS[r.reason]
      const label = known ?? (r.step === "auth" && r.reason !== "sin dato" ? `el servidor dice «${r.reason}»` : r.reason === "sin dato" ? "sin motivo guardado" : r.reason)
      return { label, n: Number(r.n) || 0 }
    })
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "es"))
}

// ---------- Qué origen convierte ----------

export type SourceQualityRow = { source: string; people: number; ficha: number; clicked: number; intent: number; signed: number; bounced: number }

const SOURCE_NAMES: Record<string, string> = {
  search: "Buscadores (Google...)",
  instagram: "Instagram",
  tiktok: "TikTok",
  social: "Otras redes",
  messaging: "WhatsApp / Telegram",
  invite: "Enlace de invitación",
  direct: "Directo",
  pwa: "App instalada",
}

export function sourceName(source: string | null | undefined): string {
  if (!source) return "Directo"
  if (SOURCE_NAMES[source]) return SOURCE_NAMES[source]
  if (source.startsWith("other:")) return `Web: ${source.slice(6)}`
  return source
}

/** Por debajo de esto, los porcentajes de un origen son ruido (con 5 personas, 1 persona = 20 %). */
export const MIN_PEOPLE = 20

export type SourceRow = {
  label: string
  people: number
  ficha: number | null
  clicked: number | null
  intent: number | null
  signed: number | null
  bounced: number | null
  small: boolean
}

export function sourceRows(rows: SourceQualityRow[] | null | undefined): SourceRow[] {
  return (rows || [])
    .map((r) => {
      const people = Number(r.people) || 0
      return {
        label: sourceName(r.source),
        people,
        ficha: pctOf(Number(r.ficha) || 0, people),
        clicked: pctOf(Number(r.clicked) || 0, people),
        intent: pctOf(Number(r.intent) || 0, people),
        signed: pctOf(Number(r.signed) || 0, people),
        bounced: pctOf(Number(r.bounced) || 0, people),
        small: people < MIN_PEOPLE,
      }
    })
    .filter((r) => r.people > 0)
    .sort((a, b) => b.people - a.people || a.label.localeCompare(b.label, "es"))
}

// ---------- Horas y días de la semana (hora de Madrid) ----------

export type HourRow = { h: number; n: number }
export type WeekdayRow = { d: number; n: number }
export type ClickHourRow = { kind: string; h: number; n: number }

/** Las 24 horas, con 0 donde no hay nada. */
export function hoursSeries(rows: HourRow[] | null | undefined): number[] {
  const out = Array.from({ length: 24 }, () => 0)
  for (const r of rows || []) {
    const h = Number(r.h)
    if (Number.isInteger(h) && h >= 0 && h < 24) out[h] += Number(r.n) || 0
  }
  return out
}

/** Lunes (1) a domingo (7). */
export function weekdaySeries(rows: WeekdayRow[] | null | undefined): number[] {
  const out = Array.from({ length: 7 }, () => 0)
  for (const r of rows || []) {
    const d = Number(r.d)
    if (Number.isInteger(d) && d >= 1 && d <= 7) out[d - 1] += Number(r.n) || 0
  }
  return out
}

/** Clics por hora de uno o varios tipos juntos (taxi/VTC = apps + llamadas al taxi). */
export function clickHourSeries(rows: ClickHourRow[] | null | undefined, kinds: string[]): number[] {
  return hoursSeries((rows || []).filter((r) => kinds.includes(r.kind)))
}

/** Franja de la noche con más actividad: la hora más alta, o null si no hay nada. */
export function peakHour(series: number[]): number | null {
  let best = 0
  let at = -1
  for (let h = 0; h < series.length; h++) {
    if (series[h] > best) { best = series[h]; at = h }
  }
  return at >= 0 ? at : null
}

export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`

// ---------- Acciones por club y evento ----------

export type ClubActionRow = { item_type: string; item_id: string; instagram: number; tiktok: number; phone: number; rides: number; taxi_calls: number }

type ItemRow = {
  id: number | string
  views?: number
  tickets?: number
  directions?: number
  shares?: number
  favorites?: number
  website?: number
  attendances?: number
}

/**
 * Suma de lo que hace la gente en la ficha. «website» de admin_data_items ya junta web e Instagram (así se exporta),
 * por eso el Instagram suelto de aquí no se suma otra vez.
 */
export function totalActions(item: ItemRow, extra?: Partial<ClubActionRow> | null): number {
  const n = (v: unknown) => Number(v) || 0
  return n(item.tickets) + n(item.directions) + n(item.shares) + n(item.favorites) + n(item.website) + n(item.attendances) +
    n(extra?.tiktok) + n(extra?.phone) + n(extra?.rides) + n(extra?.taxi_calls)
}

export function actionIndex(rows: ClubActionRow[] | null | undefined, type: "club" | "event"): Map<string, ClubActionRow> {
  const m = new Map<string, ClubActionRow>()
  for (const r of rows || []) if (r.item_type === type) m.set(String(r.item_id), r)
  return m
}

/** Acciones por cada 100 visitas a la ficha; null si no hay visitas. */
export function actionsPer100(actions: number, views: number): number | null {
  return views > 0 ? Math.round((actions / views) * 1000) / 10 : null
}

/** Visitas mínimas para decir que una ficha «no convierte» (con 3 visitas, cero clics es normal). */
export const DEAD_MIN_VIEWS = 10

export const isDeadItem = (views: number, actions: number) => views >= DEAD_MIN_VIEWS && actions === 0

// ---------- Búsquedas ----------

export type SearchBase = { term: string; n: number; avg_results: number | null; zero: number }
export type SearchDetailTerm = { term: string; n: number; opened: number; zero: number }
export type SearchRow = SearchBase & { opened: number | null; openedPct: number | null }

/** Une las búsquedas de siempre con las del SQL 88 (cuántas acaban abriendo algo). Sin detalle: opened = null. */
export function searchRows(base: SearchBase[] | null | undefined, detail: SearchDetailTerm[] | null | undefined): SearchRow[] {
  const byTerm = new Map<string, SearchDetailTerm>()
  for (const d of detail || []) byTerm.set(String(d.term).toLowerCase(), d)
  return (base || []).map((b) => {
    const d = byTerm.get(String(b.term).toLowerCase())
    const opened = d ? Number(d.opened) || 0 : null
    return { ...b, opened, openedPct: d ? pctOf(opened || 0, Number(d.n) || 0) : null }
  })
}

// ---------- Idioma de los visitantes ----------

export type LanguageRow = { lang: string; people: number; ficha: number; clicked: number }

const LANG_NAMES: Record<string, string> = {
  es: "Español", ca: "Català", en: "Inglés", de: "Alemán", fr: "Francés", it: "Italiano", pt: "Portugués", nl: "Neerlandés",
  ru: "Ruso", zh: "Chino", ja: "Japonés", ko: "Coreano", ar: "Árabe", pl: "Polaco", sv: "Sueco", da: "Danés", no: "Noruego",
  nb: "Noruego", fi: "Finés", tr: "Turco", uk: "Ucraniano", ro: "Rumano", el: "Griego", cs: "Checo", hu: "Húngaro", eu: "Euskera", gl: "Gallego",
}

export function langName(code: string | null | undefined): string {
  if (!code || code === "unknown") return "Sin idioma guardado"
  return LANG_NAMES[code] ?? code.toUpperCase()
}

export function languageRows(rows: LanguageRow[] | null | undefined): { label: string; people: number; ficha: number | null; clicked: number | null; small: boolean }[] {
  return (rows || [])
    .map((r) => {
      const people = Number(r.people) || 0
      return {
        label: langName(r.lang),
        people,
        ficha: pctOf(Number(r.ficha) || 0, people),
        clicked: pctOf(Number(r.clicked) || 0, people),
        small: people < MIN_PEOPLE,
      }
    })
    .filter((r) => r.people > 0)
    .sort((a, b) => b.people - a.people || a.label.localeCompare(b.label, "es"))
}

// ---------- País de los visitantes (SQL 89) ----------

export type CountryRow = { country: string; people: number; ficha: number; clicked: number }
export type CountryLine = { label: string; people: number; share: number | null; ficha: number | null; clicked: number | null; small: boolean }
export type CountrySummary = {
  rows: CountryLine[]
  /** Personas con país conocido y personas sin país (anteriores al SQL 89, o la cabecera no llegó). */
  known: number
  unknown: number
  /** % de personas del periodo que no tienen país. null si no hay nadie. */
  unknownPct: number | null
}

/** Nombre del país en español a partir del código de 2 letras. Si el navegador no lo conoce, el propio código. */
export function countryName(code: string | null | undefined): string {
  if (!code || code === "unknown") return "Sin país guardado"
  const c = code.toUpperCase()
  try {
    const dn = new Intl.DisplayNames(["es"], { type: "region" })
    const n = dn.of(c)
    // Para un código que no existe, Intl devuelve «Región desconocida»: ahí vale más enseñar el código.
    if (n && n !== c && n !== dn.of("ZZ")) return n.charAt(0).toUpperCase() + n.slice(1)
  } catch {
    /* código raro: se enseña tal cual */
  }
  return c
}

/**
 * Países ordenados de más a menos gente. Los países fuera del top se agrupan en «Otros países».
 * «Sin país» no entra en la lista ni en los porcentajes: se cuenta aparte, para no falsear el reparto.
 */
export function countrySummary(rows: CountryRow[] | null | undefined, top = 10): CountrySummary {
  const clean = (rows || []).map((r) => ({
    code: String(r.country || "unknown"),
    people: Number(r.people) || 0,
    ficha: Number(r.ficha) || 0,
    clicked: Number(r.clicked) || 0,
  })).filter((r) => r.people > 0)
  const unknown = clean.filter((r) => r.code === "unknown").reduce((s, r) => s + r.people, 0)
  const withCountry = clean.filter((r) => r.code !== "unknown").sort((a, b) => b.people - a.people || a.code.localeCompare(b.code))
  const known = withCountry.reduce((s, r) => s + r.people, 0)

  const line = (label: string, r: { people: number; ficha: number; clicked: number }): CountryLine => ({
    label,
    people: r.people,
    share: pctOf(r.people, known),
    ficha: pctOf(r.ficha, r.people),
    clicked: pctOf(r.clicked, r.people),
    small: r.people < MIN_PEOPLE,
  })
  const shown = withCountry.slice(0, top).map((r) => line(countryName(r.code), r))
  const rest = withCountry.slice(top)
  if (rest.length > 0) {
    const sum = rest.reduce((a, r) => ({ people: a.people + r.people, ficha: a.ficha + r.ficha, clicked: a.clicked + r.clicked }), { people: 0, ficha: 0, clicked: 0 })
    shown.push(line(`Otros países (${rest.length})`, sum))
  }
  return { rows: shown, known, unknown, unknownPct: pctOf(unknown, known + unknown) }
}

// ---------- Días del periodo ----------

/** Todos los días del periodo (AAAA-MM-DD), para que un día sin datos salga como 0 y no desaparezca del gráfico. */
export function daysBetween(from: string, to: string, max = 400): string[] {
  const out: string[] = []
  for (let t = noon(from); t <= noon(to) && out.length < max; t += MS_DAY) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}

/** Valores por día rellenando con 0 los días sin filas. */
export function fillDays<T extends { day: string }>(from: string, to: string, rows: T[] | null | undefined, pick: (r: T) => number): { label: string; value: number }[] {
  const m = new Map<string, number>()
  for (const r of rows || []) m.set(r.day, (m.get(r.day) || 0) + pick(r))
  return daysBetween(from, to).map((d) => ({ label: d.slice(5), value: m.get(d) || 0 }))
}
