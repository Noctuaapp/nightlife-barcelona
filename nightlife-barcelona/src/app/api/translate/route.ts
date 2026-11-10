import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { handleTranslate, type TranslateDeps } from "@/lib/translateService"
import { refKey, type TargetLang, type TranslateRef } from "@/lib/translateContent"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// Traduce textos libres de locales y eventos (descripción, promos, consejos...) al idioma de la web y los guarda en
// content_translations (supabase/86_traducciones.sql). Solo acepta «tabla + id + campo» de una lista cerrada y lee
// el texto de la base de datos, así que no sirve para traducir texto cualquiera. Cada texto se traduce una vez:
// después se lee de la tabla. Necesita la variable ANTHROPIC_API_KEY en Vercel; sin ella responde 503 y la web
// sigue enseñando el texto original en español. TRANSLATE_MODEL cambia el modelo (por defecto, el pequeño y barato).
const MODEL = process.env.TRANSLATE_MODEL || "claude-haiku-5-5"

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function deps(): TranslateDeps {
  const db = admin()
  return {
    async loadSources(refs: TranslateRef[]) {
      const out = new Map<string, string | null>()
      for (const table of ["clubs", "events"] as const) {
        const mine = refs.filter((r) => r.table === table)
        if (mine.length === 0) continue
        const fields = [...new Set(mine.map((r) => r.field))]
        const { data } = await db.from(table).select(["id", "hidden", ...fields].join(",")).in("id", [...new Set(mine.map((r) => r.id))])
        const rows = new Map<number, Record<string, unknown>>(((data || []) as unknown as Record<string, unknown>[]).map((row) => [row.id as number, row]))
        for (const r of mine) {
          const row = rows.get(r.id)
          // Un local oculto no se enseña a nadie: tampoco se traduce.
          const text = row && row.hidden !== true ? row[r.field] : null
          out.set(refKey(r), typeof text === "string" ? text : null)
        }
      }
      return out
    },
    async loadCache(lang: TargetLang, hashes: string[]) {
      const out = new Map<string, string>()
      if (hashes.length === 0) return out
      const { data, error } = await db.from("content_translations").select("source_hash, translated").eq("lang", lang).in("source_hash", hashes)
      if (error) throw new Error(error.message)
      for (const row of data || []) out.set(row.source_hash as string, row.translated as string)
      return out
    },
    async saveCache(lang: TargetLang, rows: { hash: string; text: string }[]) {
      const { error } = await db
        .from("content_translations")
        .upsert(rows.map((r) => ({ source_hash: r.hash, lang, translated: r.text, model: MODEL })), { onConflict: "source_hash,lang" })
      if (error) throw new Error(error.message)
    },
    async callModel(system: string, user: string) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: [{ role: "user", content: user }] }),
      })
      if (!res.ok) throw new Error(`model ${res.status}`)
      const json = (await res.json()) as { content?: { type: string; text?: string }[] }
      return (json.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join("")
    },
  }
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "json" }, { status: 400 })
  }
  const configured = !!process.env.ANTHROPIC_API_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const result = await handleTranslate(body, deps(), configured)
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } })
}
