"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { createSlug } from "../../../lib/slug"

// Calidad de las fichas de clubs. La auditoría de octubre 2026 detectó que lo que más resta
// credibilidad (y lo que más frena la indexación en Google) son fichas con datos por defecto o
// incompletos. Esta pantalla lista los problemas de cada ficha, de la peor a la mejor, para ir
// arreglándolas una a una desde el editor.

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
}

type Issue = { key: string; label: string; weight: number }

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email !== "info@noctuaapp.com") {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  useEffect(() => {
    if (checkingAdmin) return
    supabase
      .from("clubs")
      .select("id, name, slug, description, music, price, hours, open_days, image, latitude, longitude, neighborhood, hidden")
      .then(async ({ data, error }) => {
        if (error) {
          // Si falta alguna columna (p. ej. slug u open_days), se pide todo.
          const all = await supabase.from("clubs").select("*")
          setClubs((all.data || []) as Club[])
        } else setClubs((data || []) as Club[])
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

  const rows = useMemo(() => {
    return clubs
      .filter((c) => !onlyVisible || !c.hidden)
      .map((c) => {
        const issues: Issue[] = []
        const desc = (c.description || "").trim()
        if (!desc) issues.push({ key: "desc", label: "Sin descripción", weight: 3 })
        else if (desc.length < 80) issues.push({ key: "desc_short", label: "Descripción muy corta", weight: 1 })
        else if (looksEnglish(desc)) issues.push({ key: "desc_en", label: "Descripción en inglés", weight: 2 })
        if (!c.image) issues.push({ key: "image", label: "Sin foto", weight: 3 })
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
        return { club: c, issues, score: issues.reduce((a, i) => a + i.weight, 0) }
      })
      .filter((r) => r.issues.length > 0 && (!filter || r.issues.some((i) => i.key.startsWith(filter))))
      .sort((a, b) => b.score - a.score)
  }, [clubs, onlyVisible, filter, repeated])

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) for (const i of r.issues) m.set(i.key.split("_")[0], (m.get(i.key.split("_")[0]) || 0) + 1)
    return m
  }, [rows])

  const FILTERS = [
    { key: "", label: "Todos" },
    { key: "desc", label: "Descripción" },
    { key: "image", label: "Foto" },
    { key: "price", label: "Precio" },
    { key: "hours", label: "Horario" },
    { key: "days", label: "Días" },
    { key: "coords", label: "Ubicación" },
    { key: "music", label: "Música" },
  ]

  return (
    <AdminShell
      title="Calidad de fichas"
      subtitle="Fichas con datos que faltan o que parecen de relleno, de la peor a la mejor. Arreglar las 50 primeras es lo que más mejora la confianza y la indexación en Google."
    >
      {checkingAdmin || loading ? (
        <p className="text-sm text-zinc-400">Cargando…</p>
      ) : (
        <>
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
            <label className="ml-auto flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={onlyVisible} onChange={(e) => setOnlyVisible(e.target.checked)} />
              Solo visibles
            </label>
          </div>

          <p className="mb-4 text-sm text-zinc-400">
            {rows.length} de {clubs.filter((c) => !onlyVisible || !c.hidden).length} fichas con algo que mejorar.
          </p>

          <div className="overflow-hidden rounded-card border border-white/10">
            {rows.slice(0, 300).map(({ club, issues, score }) => (
              <div key={club.id} className="flex flex-col gap-3 border-b border-white/5 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {club.name} {club.hidden && <span className="ml-2 text-xs text-zinc-400">(oculto)</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
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
        </>
      )}
    </AdminShell>
  )
}
