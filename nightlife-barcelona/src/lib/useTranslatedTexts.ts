"use client"

import { useEffect, useMemo, useState } from "react"
import { useLanguage } from "../context/LanguageContext"
import { supabase } from "./supabase"
import { hashSource, isTargetLang, isWorthTranslating, normalizeSource, refKey, type TranslateRef, type TranslateTable } from "./translateContent"

// Textos libres de un local o evento en el idioma de la web (11/11/2026; ver lib/translateContent.ts). Devuelve las
// traducciones que ya hay, por clave; mientras no llegan (o si no hay traducción posible) quien lo usa enseña el
// original en español. Primero mira la tabla content_translations (lectura pública, sin pasar por ninguna ruta) y solo
// pide a /api/translate lo que falta. En español no hace nada.

export type TranslateItem = { key: string; ref: TranslateRef; text: string }

/** Un elemento por cada campo con texto del local/evento (la clave es el nombre del campo). */
export function textItems(table: TranslateTable, row: Record<string, unknown> | null | undefined, fields: readonly string[]): TranslateItem[] {
  const id = row?.id
  if (!row || typeof id !== "number") return []
  return fields.flatMap((field) => {
    const text = row[field]
    return typeof text === "string" && isWorthTranslating(text) ? [{ key: field, ref: { table, id, field }, text }] : []
  })
}

const memory = new Map<string, string>() // «idioma:hash» → traducción, mientras la pestaña esté abierta
let apiPausedUntil = 0 // si la ruta falla (sin clave, tabla sin crear...), no se insiste durante un rato

export function useTranslatedTexts(items: TranslateItem[]): Record<string, string> {
  const { locale } = useLanguage()
  const lang = isTargetLang(locale) ? locale : null
  const signature = useMemo(
    () => (lang ? items.map((i) => `${refKey(i.ref)}|${i.key}|${normalizeSource(i.text)}`).join("§") : ""),
    [items, lang]
  )
  const [result, setResult] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!lang || !signature) {
      setResult((r) => (Object.keys(r).length ? {} : r))
      return
    }
    let alive = true
    ;(async () => {
      const list = items.filter((i) => isWorthTranslating(i.text))
      const hashes = await Promise.all(list.map((i) => hashSource(i.text)))
      const out: Record<string, string> = {}
      const collect = () => {
        const left: number[] = []
        list.forEach((it, n) => {
          const hit = memory.get(`${lang}:${hashes[n]}`)
          if (hit) out[it.key] = hit
          else left.push(n)
        })
        return left
      }
      let missing = collect()
      if (missing.length > 0) {
        try {
          const { data } = await supabase.from("content_translations").select("source_hash, translated").eq("lang", lang).in("source_hash", missing.map((n) => hashes[n]))
          for (const row of data || []) memory.set(`${lang}:${row.source_hash}`, row.translated as string)
        } catch {
          /* sin tabla o sin red: se pide a la ruta o se deja el original */
        }
        missing = collect()
      }
      if (missing.length > 0 && Date.now() > apiPausedUntil) {
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ lang, refs: missing.map((n) => list[n].ref) }),
          })
          if (res.ok) {
            const json = (await res.json()) as { translations?: Record<string, string> }
            for (const n of missing) {
              const text = json.translations?.[refKey(list[n].ref)]
              if (typeof text === "string" && text) memory.set(`${lang}:${hashes[n]}`, text)
            }
            collect()
          } else {
            apiPausedUntil = Date.now() + 10 * 60 * 1000
          }
        } catch {
          apiPausedUntil = Date.now() + 2 * 60 * 1000
        }
      }
      if (alive) setResult(out)
    })()
    return () => {
      alive = false
    }
    // `signature` resume el contenido de `items`; así un array nuevo con lo mismo no repite la petición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, signature])

  return lang ? result : {}
}
