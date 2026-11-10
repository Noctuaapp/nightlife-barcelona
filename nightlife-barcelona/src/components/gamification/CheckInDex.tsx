"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { createSlug } from "../../lib/slug"
import { toDateLocale } from "../../lib/dateLocale"
import { useLanguage } from "../../context/LanguageContext"

// «Noctadex» (10/11/2026): el registro de la gente tipo Pokédex. Cada local donde has hecho check-in sale como
// una ficha numerada por el orden en que lo descubriste, con las veces que has ido y un rango (Nuevo → Habitual →
// De la casa → Leyenda). Se puede ocultar y volver a mostrar: la elección se guarda en la cuenta
// (profiles.hide_checkin_dex, supabase/85) para que sea la misma en todos los dispositivos. Una copia en este
// dispositivo (localStorage) hace que no parpadee al abrir el perfil y sirve de respaldo mientras la columna no exista
// o si falla el guardado; si el navegador no deja guardar, vuelve a salir visible.
// Es solo para quien lo mira: Noctua no tiene perfiles públicos, así que ocultarlo es para que no se vea en pantalla.

const INITIAL_SHOWN = 12

type Entry = { clubId: number; name: string; hood: string | null; visits: number; first: string; last: string }

const hiddenKey = (userId: string) => `noctua_dex_hidden_${userId}`

function readHidden(userId: string): boolean {
  try {
    return window.localStorage.getItem(hiddenKey(userId)) === "1"
  } catch {
    return false
  }
}
function writeHidden(userId: string, hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(hiddenKey(userId), "1")
    else window.localStorage.removeItem(hiddenKey(userId))
  } catch {
    /* modo privado: no pasa nada, la próxima vez sale visible */
  }
}

// Rango según las veces que se ha ido.
export function dexTier(visits: number): "new" | "regular" | "home" | "legend" {
  if (visits >= 10) return "legend"
  if (visits >= 5) return "home"
  if (visits >= 2) return "regular"
  return "new"
}

const TIER_STYLE: Record<ReturnType<typeof dexTier>, string> = {
  new: "border-white/10 bg-white/[0.04] text-zinc-300",
  regular: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  home: "border-brand/40 bg-brand/15 text-brand-soft",
  legend: "border-amber-300/50 bg-amber-300/15 text-amber-200",
}

export default function CheckInDex({ userId }: { userId: string }) {
  const { t, locale } = useLanguage()
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [hidden, setHidden] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    // Primero la copia del dispositivo (instantánea); luego manda lo que diga la cuenta. Si la columna aún no existe
    // (error de la consulta), se queda con la copia del dispositivo.
    setHidden(readHidden(userId))
    let alive = true
    supabase
      .from("profiles")
      .select("hide_checkin_dex")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive || error || !data) return
        const fromAccount = (data as { hide_checkin_dex?: boolean | null }).hide_checkin_dex === true
        setHidden(fromAccount)
        writeHidden(userId, fromAccount)
      })
    return () => {
      alive = false
    }
  }, [userId])

  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data: rows } = await supabase.from("club_checkins").select("club_id, checkin_date").eq("user_id", userId)
      const byClub = new Map<number, { visits: number; first: string; last: string }>()
      for (const r of (rows || []) as { club_id: number; checkin_date: string }[]) {
        const cur = byClub.get(r.club_id)
        if (!cur) byClub.set(r.club_id, { visits: 1, first: r.checkin_date, last: r.checkin_date })
        else {
          cur.visits += 1
          if (r.checkin_date < cur.first) cur.first = r.checkin_date
          if (r.checkin_date > cur.last) cur.last = r.checkin_date
        }
      }
      const ids = [...byClub.keys()]
      const names = new Map<number, { name: string; hood: string | null }>()
      if (ids.length > 0) {
        const { data: clubs } = await supabase.from("clubs").select("id, name, neighborhood").in("id", ids)
        for (const c of (clubs || []) as { id: number; name: string; neighborhood: string | null }[]) names.set(c.id, { name: c.name, hood: c.neighborhood })
      }
      if (!alive) return
      setEntries(
        ids
          // Un local que ya no existe (borrado) no se puede abrir ni nombrar: no sale.
          .filter((id) => names.has(id))
          .map((id) => ({ clubId: id, ...names.get(id)!, ...byClub.get(id)! }))
      )
    }
    load()
    return () => {
      alive = false
    }
  }, [userId])

  // Número de ficha = orden en que descubriste el local (el primero que visitaste es el Nº 1).
  const numbered = useMemo(() => {
    const byDiscovery = [...(entries || [])].sort((a, b) => a.first.localeCompare(b.first) || a.clubId - b.clubId)
    const num = new Map(byDiscovery.map((e, i) => [e.clubId, i + 1]))
    return [...(entries || [])]
      .sort((a, b) => b.visits - a.visits || b.last.localeCompare(a.last))
      .map((e) => ({ ...e, num: num.get(e.clubId)! }))
  }, [entries])

  if (entries === null) return null // mientras carga no se enseña nada (no hay recuadro que salte)

  const totalVisits = numbered.reduce((n, e) => n + e.visits, 0)
  const shown = showAll ? numbered : numbered.slice(0, INITIAL_SHOWN)
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(toDateLocale(locale), { day: "numeric", month: "short" })

  const toggle = () => {
    const next = !hidden
    setHidden(next)
    writeHidden(userId, next)
    // Se guarda en la cuenta sin esperar; si falla (por ejemplo, SQL 85 sin ejecutar) queda la copia del dispositivo.
    supabase.from("profiles").update({ hide_checkin_dex: next }).eq("id", userId).then(({ error }) => {
      if (error) console.warn("[noctadex] no se pudo guardar en la cuenta:", error.message)
    })
  }

  return (
    <div className="rounded-card border border-white/10 bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">{t("profilePage.dexTitle")}</h2>
          <p className="mt-0.5 text-xs leading-snug text-zinc-400">
            {numbered.length > 0
              ? t("profilePage.dexSummary").replace("{places}", String(numbered.length)).replace("{checkins}", String(totalVisits))
              : t("profilePage.dexSub")}
          </p>
        </div>
        {numbered.length > 0 && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={hidden}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
          >
            {hidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
            {hidden ? t("profilePage.dexShow") : t("profilePage.dexHide")}
          </button>
        )}
      </div>

      {numbered.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">{t("profilePage.dexEmpty")}</p>
      ) : hidden ? (
        <p className="mt-4 text-sm text-zinc-400">{t("profilePage.dexHiddenNote")}</p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {shown.map((e) => {
              const tier = dexTier(e.visits)
              return (
                <li key={e.clubId}>
                  <Link
                    href={`/clubs/${createSlug(e.name)}`}
                    className="flex h-full flex-col gap-1.5 rounded-xl border border-white/10 bg-night/60 p-3 transition hover:border-white/25"
                  >
                    <span className="text-[11px] font-semibold tabular-nums text-zinc-500">Nº {String(e.num).padStart(3, "0")}</span>
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{e.name}</span>
                    {e.hood && <span className="truncate text-xs text-zinc-400">{e.hood}</span>}
                    <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${TIER_STYLE[tier]}`}>{t(`profilePage.dexTier_${tier}`)}</span>
                      <span className="text-xs font-semibold tabular-nums text-zinc-200">
                        {e.visits === 1 ? t("profilePage.dexTimesOne") : t("profilePage.dexTimesMany").replace("{n}", String(e.visits))}
                      </span>
                    </span>
                    <span className="text-[11px] text-zinc-500">{t("profilePage.dexLast").replace("{date}", fmt(e.last))}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {numbered.length > INITIAL_SHOWN && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 w-full rounded-full border border-white/10 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
            >
              {showAll ? t("profilePage.dexLess") : t("profilePage.dexMore").replace("{n}", String(numbered.length))}
            </button>
          )}
        </>
      )}
    </div>
  )
}
