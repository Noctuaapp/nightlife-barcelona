// Lógica de /api/translate (11/11/2026), sin depender de Next ni de Supabase para poder probarla: todo lo de fuera
// (leer textos, leer/guardar la caché, llamar al modelo) entra por `deps`.

import {
  MAX_REFS,
  buildTranslationRequest,
  hashSource,
  isTargetLang,
  isValidRef,
  isWorthTranslating,
  normalizeSource,
  parseTranslations,
  refKey,
  type TargetLang,
  type TranslateRef,
} from "./translateContent"

export type TranslateDeps = {
  /** Texto original de cada referencia; null si el local/evento no existe o está oculto. */
  loadSources: (refs: TranslateRef[]) => Promise<Map<string, string | null>>
  /** Traducciones ya guardadas: hash → texto. */
  loadCache: (lang: TargetLang, hashes: string[]) => Promise<Map<string, string>>
  saveCache: (lang: TargetLang, rows: { hash: string; text: string }[]) => Promise<void>
  /** Una llamada al modelo con las instrucciones y los textos; devuelve su respuesta en bruto. */
  callModel: (system: string, user: string) => Promise<string>
}

export type TranslateResult =
  | { status: 200; body: { translations: Record<string, string> } }
  | { status: 400 | 502 | 503; body: { error: string } }

export async function handleTranslate(input: unknown, deps: TranslateDeps, configured: boolean): Promise<TranslateResult> {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
  if (!isTargetLang(body.lang)) return { status: 400, body: { error: "lang" } }
  const lang = body.lang
  if (!Array.isArray(body.refs) || body.refs.length === 0 || body.refs.length > MAX_REFS || !body.refs.every(isValidRef)) {
    return { status: 400, body: { error: "refs" } }
  }
  // Sin repetidos.
  const refs = [...new Map((body.refs as TranslateRef[]).map((r) => [refKey(r), r])).values()]

  const sources = await deps.loadSources(refs)
  const wanted: { key: string; text: string; hash: string }[] = []
  for (const r of refs) {
    const text = normalizeSource(sources.get(refKey(r)))
    if (!isWorthTranslating(text)) continue
    wanted.push({ key: refKey(r), text, hash: await hashSource(text) })
  }

  const translations: Record<string, string> = {}
  // Si la caché no se puede leer (la tabla aún no existe, por ejemplo) no se traduce nada: sin caché cada visita
  // volvería a pagar la misma traducción.
  let cached: Map<string, string>
  try {
    cached = await deps.loadCache(lang, wanted.map((w) => w.hash))
  } catch {
    return { status: 503, body: { error: "cache" } }
  }
  const missing = wanted.filter((w) => !cached.has(w.hash))
  for (const w of wanted) {
    const hit = cached.get(w.hash)
    if (hit) translations[w.key] = hit
  }
  if (missing.length === 0) return { status: 200, body: { translations } }
  if (!configured) {
    // Sin clave de API no se puede traducir lo que falta; lo que ya estaba guardado sí se devuelve.
    return Object.keys(translations).length > 0 ? { status: 200, body: { translations } } : { status: 503, body: { error: "not-configured" } }
  }

  // Los textos repetidos (la misma promo en varios locales) se traducen una sola vez.
  const unique = [...new Map(missing.map((m) => [m.hash, m.text])).entries()]
  const { system, user } = buildTranslationRequest(lang, unique.map(([, text]) => text))
  let translated: string[] | null = null
  try {
    translated = parseTranslations(await deps.callModel(system, user), unique.length)
  } catch {
    translated = null
  }
  if (!translated) return Object.keys(translations).length > 0 ? { status: 200, body: { translations } } : { status: 502, body: { error: "model" } }

  const byHash = new Map(unique.map(([hash], i) => [hash, translated![i]]))
  try {
    await deps.saveCache(lang, [...byHash.entries()].map(([hash, text]) => ({ hash, text })))
  } catch {
    /* la traducción se enseña igual; la próxima vez se volverá a pedir */
  }
  for (const m of missing) translations[m.key] = byHash.get(m.hash)!
  return { status: 200, body: { translations } }
}
