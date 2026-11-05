"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { createSlug } from "../../../lib/slug"
import { activeFeatureCount } from "../../../components/nightlife/club/ClubFeatures"

// Calidad de las fichas de clubs. La auditoría de octubre 2026 detectó que lo que más resta
// credibilidad (y lo que más frena la indexación en Google) son fichas con datos por defecto o
// incompletos. Esta pantalla lista los problemas de cada ficha, de la peor a la mejor, para ir
// arreglándolas una a una desde el editor.
//
// 05/11/2026: ahora cada ficha tiene un % de «completa» (barra + lo que le falta) y arriba hay un
// resumen de todo el catálogo. Se miran también las fotos de la galería, la dirección, Instagram/web
// y las características del local. El % reparte 22 puntos entre los apartados (PESOS, abajo): la
// descripción, la foto de portada y la ubicación pesan más; un dato que está pero parece de relleno
// (precio u horario repetido en muchas fichas, descripción corta o en inglés) cuenta la mitad.

type Club = {
  id: number
  name: string
  slug?: string | null
  description?: string | null
  music?: string | null
  price?: string | null
  hours?: string | null
  open_days?: string[] | null
  image?: string | null
  latitude?: number | null
  longitude?: number | null
  neighborhood?: string | null
  hidden?: boolean | null
  address?: string | null
  website?: string | null
  instagram?: string | null
  instagram_url?: string | null
  capacity?: number | null
  aforo?: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

type Issue = { key: string; label: string; weight: number }

// Puntos de cada apartado en el % de ficha completa (suman 22).
const PESOS = { desc: 3, image: 3, gallery: 2, coords: 3, address: 1, hood: 1, hours: 2, days: 2, price: 2, music: 1, social: 1, feat: 1 } as const
const PESO_TOTAL = Object.values(PESOS).reduce((a, b) => a + b, 0)
const GALLERY_MIN = 3 // fotos extra (sin contar la portada) para dar la galería por buena

// Fotos de la galería sin la portada (mismas columnas que lee la ficha pública).
function galleryOf(c: Club): string[] {
  const raw = Array.isArray(c.gallery) ? c.gallery : Array.isArray(c.images) ? c.images : [c.image_2, c.image_3, c.image_4]
  return Array.from(new Set((raw as unknown[]).filter((u): u is string => typeof u === "string" && !!u.trim()))).filter((u) => u !== c.image)
}

const EN_WORDS = /\b(the|and|with|of|is|in|for|hosting|located|offers|best|night|nights|music|bar|club)\b/gi
const ES_WORDS = /\b(el|la|los|las|de|del|y|con|en|para|un|una|es|su|sus|noche|música)\b/gi

function looksEnglish(text: string): boolean {
  const en = (text.match(EN_WORDS) || []).length
  const es = (text.match(ES_WORDS) || []).length
  return en >= 3 && en > es
}

export default function AdminQualityPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyVisible, setOnlyVisible] = useState(true)
  const [filter, setFilter] = useState<string>("")
  const [showComplete, setShowComplete] = useState(false)
  const [order, setOrder] = useState<"worst" | "closest">("worst")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  useEffect(() => {
    if (checkingAdmin) return
    // Se piden todas las columnas: para el % de completa hacen falta la galería, las redes y las
    // características, y así tampoco se rompe si alguna columna cambia de nombre.
    supabase
      .from("clubs")
      .select("*")
      .then(({ data }) => {
        setClubs((data || []) as Club[])
        setLoading(false)
      })
  }, [checkingAdmin])

  // Valores que comparten muchas fichas: casi seguro que son de relleno, no datos reales.
  const repeated = useMemo(() => {
    const count = (field: "price" | "hours") => {
      const m = new Map<string, number>()
      for (const c of clubs) {
        const v = (c[field] || "").trim()
        if (v) m.set(v, (m.get(v) || 0) + 1)
      }
      const threshold = Math.max(8, Math.round(clubs.length * 0.12))
      return new Set(Array.from(m.entries()).filter(([, n]) => n >= threshold).map(([v]) => v))
    }
    return { price: count("price"), hours: count("hours") }
  }, [clubs])

  // Antes "rows" ya salía filtrado por el botón de categoría seleccionado, y "counts" se
  // calculaba a partir de "rows" — es decir, al pulsar "Música" los números de las DEMÁS
  // categorías (Descripción, Foto, Precio...) se recalculaban solo sobre las fichas que ya
  // tenían problema de música, no sobre todas. Por eso parecía que "los números cambiaban
  // solos" al cambiar de botón. Ahora "allRows" (sin filtrar por categoría) es la base tanto
  // para los contadores como para la lista filtrada, así los números de cada botón siempre
  // reflejan el total real, se seleccione lo que se seleccione.
  const allRows = useMemo(() => {
    return clubs
      .filter((c) => !onlyVisible || !c.hidden)
      .map((c) => {
        const issues: Issue[] = []
        const desc = (c.description || "").trim()
        if (!desc) issues.push({ key: "desc", label: "Sin descripción", weight: 3 })
        else if (desc.length < 80) issues.push({ key: "desc_short", label: "Descripción muy corta", weight: 1 })
        else if (looksEnglish(desc)) issues.push({ key: "desc_en", label: "Descripción en inglés", weight: 2 })
        if (!c.image) issues.push({ key: "image", label: "Sin foto", weight: 3 })
        const extra = galleryOf(c).length
        if (extra < GALLERY_MIN) {
          issues.push({
            key: "gallery",
            label: extra === 0 ? "Sin fotos de galería" : `Pocas fotos de galería (${extra} de ${GALLERY_MIN})`,
            weight: extra === 0 ? 2 : 1,
          })
        }
        if (!c.music) issues.push({ key: "music", label: "Sin estilo de música", weight: 1 })
        if (!c.price) issues.push({ key: "price", label: "Sin precio", weight: 1 })
        else if (repeated.price.has(c.price.trim())) issues.push({ key: "price_rep", label: `Precio genérico (“${c.price}”)`, weight: 2 })
        if (!c.hours) issues.push({ key: "hours", label: "Sin horario", weight: 2 })
        else if (repeated.hours.has(c.hours.trim())) issues.push({ key: "hours_rep", label: `Horario genérico (“${c.hours}”)`, weight: 1 })
        if (c.hours && !/[LMXJVSD]/.test(c.hours) && !(c.open_days && c.open_days.length)) {
          issues.push({ key: "days", label: "Sin días de apertura (sale abierto todas las noches)", weight: 2 })
        }
        if (!c.latitude || !c.longitude) issues.push({ key: "coords", label: "Sin ubicación en el mapa", weight: 3 })
        if (!c.neighborhood) issues.push({ key: "hood", label: "Sin barrio", weight: 1 })
        if (!(c.address || "").trim()) issues.push({ key: "address", label: "Sin dirección", weight: 1 })
        if (!(c.instagram || c.instagram_url || c.website)) issues.push({ key: "social", label: "Sin Instagram ni web", weight: 1 })
        if (activeFeatureCount(c, c.capacity || c.aforo || null) === 0) issues.push({ key: "feat", label: "Sin características marcadas (terraza, pista…)", weight: 1 })

        // % completa: cada apartado aporta su peso entero si está bien, la mitad si parece de relleno
        // y nada si falta. «Días de apertura» solo se da por bueno si hay horario.
        const has = (key: string) => issues.some((i) => i.key === key || i.key.startsWith(`${key}_`))
        const half = (key: string, field: keyof typeof PESOS) => (has(key) ? PESOS[field] / 2 : PESOS[field])
        const missing = (key: string, field: keyof typeof PESOS) => (issues.some((i) => i.key === key) ? 0 : PESOS[field])
        const points =
          (issues.some((i) => i.key === "desc") ? 0 : has("desc") ? PESOS.desc / 2 : PESOS.desc) +
          missing("image", "image") +
          PESOS.gallery * (Math.min(extra, GALLERY_MIN) / GALLERY_MIN) +
          missing("coords", "coords") +
          missing("address", "address") +
          missing("hood", "hood") +
          (!c.hours ? 0 : has("hours") ? PESOS.hours / 2 : PESOS.hours) +
          (!c.hours ? 0 : missing("days", "days")) +
          (!c.price ? 0 : half("price", "price")) +
          missing("music", "music") +
          missing("social", "social") +
          missing("feat", "feat")
        const pct = Math.round((points / PESO_TOTAL) * 100)
        return { club: c, issues, score: issues.reduce((a, i) => a + i.weight, 0), pct }
      })
  }, [clubs, onlyVisible, repeated])

  // Resumen de todo el catálogo (visible o no, según el interruptor), sin filtros de categoría.
  const summary = useMemo(() => {
    const n = allRows.length
    const avg = n ? Math.round(allRows.reduce((a, r) => a + r.pct, 0) / n) : 0
    return { n, avg, complete: allRows.filter((r) => r.issues.length === 0).length, low: allRows.filter((r) => r.pct < 60).length }
  }, [allRows])

  const rows = useMemo(() => {
    return allRows
      .filter((r) => (showComplete ? true : r.issues.length > 0))
      .filter((r) => !filter || r.issues.some((i) => i.key.startsWith(filter)))
      .sort((a, b) => {
        const done = Number(a.issues.length === 0) - Number(b.issues.length === 0) // las completas, al final
        if (done) return done
        return order === "worst" ? a.pct - b.pct || b.score - a.score : b.pct - a.pct || a.score - b.score
      })
  }, [allRows, filter, showComplete, order])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of allRows) for (const i of r.issues) m.set(i.key.split("_")[0], (m.get(i.key.split("_")[0]) || 0) + 1)
    return m
  }, [allRows])

  const FILTERS = [
    { key: "", label: "Todos" },
    { key: "desc", label: "Descripción" },
    { key: "image", label: "Foto" },
    { key: "gallery", label: "Galería" },
    { key: "price", label: "Precio" },
    { key: "hours", label: "Horario" },
    { key: "days", label: "Días" },
    { key: "coords", label: "Ubicación" },
    { key: "music", label: "Música" },
    { key: "hood", label: "Barrio" },
    { key: "address", label: "Dirección" },
    { key: "social", label: "Redes" },
    { key: "feat", label: "Extras" },
  ]

  return (
    <AdminShell
      title="Calidad de fichas"
      subtitle="Cuánto le falta a cada ficha para estar completa, de la que más a la que menos. Arreglar las 50 primeras es lo que más mejora la confianza y la indexación en Google."
    >
      {checkingAdmin || loading ? (
        <p className="text-sm text-zinc-400">Cargando…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { value: `${summary.avg}%`, label: "Ficha media completa" },
              { value: String(summary.complete), label: "Fichas al 100 %" },
              { value: String(summary.low), label: "Por debajo del 60 %" },
            ].map((s) => (
              <div key={s.label} className="rounded-card border border-white/10 bg-surface p-4">
                <p className="font-display text-2xl leading-none text-ink tabular-nums">{s.value}</p>
                <p className="mt-2 text-xs font-semibold text-zinc-400">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key || "all"}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === f.key ? "bg-white text-black" : "border border-white/10 text-zinc-300 hover:bg-white/5"
                }`}
              >
                {f.label}
                {f.key && counts.get(f.key) ? <span className="ml-1.5 text-zinc-400">{counts.get(f.key)}</span> : null}
              </button>
            ))}
            <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showComplete} onChange={(e) => setShowComplete(e.target.checked)} />
                Incluir completas
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={onlyVisible} onChange={(e) => setOnlyVisible(e.target.checked)} />
                Solo visibles
              </label>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-400">
              {rows.length} de {summary.n} fichas {showComplete ? "en la lista" : "con algo que mejorar"}.
            </p>
            <div className="flex gap-2">
              {([["worst", "Más incompletas primero"], ["closest", "Casi completas primero"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOrder(k)}
                  aria-pressed={order === k}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${order === k ? "bg-white text-black" : "border border-white/10 text-zinc-300 hover:bg-white/5"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-white/10">
            {rows.slice(0, 300).map(({ club, issues, score, pct }) => (
              <div key={club.id} className="flex flex-col gap-3 border-b border-white/5 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {club.name} {club.hidden && <span className="ml-2 text-xs text-zinc-400">(oculto)</span>}
                  </p>
                  <div className="mt-2 flex items-center gap-3" role="img" aria-label={`${pct} % completa`}>
                    <div className="h-1.5 w-40 max-w-[50%] overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${pct >= 80 ? "bg-open" : pct >= 60 ? "bg-warn" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-zinc-300">{pct}% completa</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {issues.length === 0 && <span className="rounded-full bg-open/15 px-2.5 py-1 text-xs font-semibold text-open">Ficha completa</span>}
                    {issues.map((i) => (
                      <span
                        key={i.key}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          i.weight >= 3 ? "bg-red-400/15 text-red-200" : i.weight === 2 ? "bg-warn/15 text-warn" : "bg-white/10 text-zinc-300"
                        }`}
                      >
                        {i.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-zinc-400">Prioridad {score}</span>
                  <Link
                    href={`/clubs/${club.slug || createSlug(club.name)}`}
                    target="_blank"
                    className="rounded-ctl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                  >
                    Ver ficha
                  </Link>
                  <Link href={`/admin?edit=${club.id}`} className="rounded-ctl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-200">
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {rows.length > 300 && (
            <p className="mt-3 text-xs text-zinc-400">Se enseñan las 300 con más prioridad. Al arreglar algunas, entrarán las siguientes.</p>
          )}
        </>
      )}
    </AdminShell>
  )
}
