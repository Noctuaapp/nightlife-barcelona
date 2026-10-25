"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import { createSlug } from "../../lib/slug"
import { listDeniedVenues, restoreDeniedVenue, type DeniedVenue } from "../../lib/deniedVenues"
import { toast } from "../ui/Toast"

// Perfil › "Locales que no te recomendamos" (25/10/2026). Los sitios donde contaste que no te
// dejaron entrar ya no te salen en Sorpréndeme ni en los locales cercanos. Aquí los ves y puedes
// volver a mostrarlos cuando quieras. Si no hay ninguno, la tarjeta no aparece.
export default function DeniedVenuesCard({ cardClass, titleClass }: { cardClass: string; titleClass: string }) {
  const { t, locale } = useLanguage()
  const [items, setItems] = useState<DeniedVenue[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    listDeniedVenues().then(setItems)
  }, [])

  if (!items || items.length === 0) return null

  const restore = async (v: DeniedVenue) => {
    const key = `${v.venueType}-${v.venueId}`
    setBusy(key)
    const ok = await restoreDeniedVenue(v.venueType, v.venueId)
    setBusy(null)
    if (!ok) {
      toast(t("profilePage.deniedError"), 4000)
      return
    }
    setItems((prev) => (prev || []).filter((x) => `${x.venueType}-${x.venueId}` !== key))
    toast(t("profilePage.deniedRestored").replace("{name}", v.name))
  }

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale === "ca" ? "ca-ES" : "es-ES", { day: "numeric", month: "short", year: "numeric" })

  return (
    <div className={cardClass}>
      <h2 className={`${titleClass} mb-1`}>{t("profilePage.deniedTitle")}</h2>
      <p className="mb-4 text-sm text-zinc-400">{t("profilePage.deniedIntro")}</p>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((v) => {
          const key = `${v.venueType}-${v.venueId}`
          const href = v.venueType === "club" ? `/clubs/${createSlug(v.name)}` : `/event/${createSlug(v.name)}`
          return (
            <li key={key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link href={href} className="font-semibold text-ink underline-offset-2 hover:underline">
                  {v.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {dateFmt(v.lastAt)}
                  {v.times > 1 ? ` · ${t("profilePage.deniedTimes").replace("{n}", String(v.times))}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => restore(v)}
                disabled={busy === key}
                className="shrink-0 rounded-ctl border border-white/15 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/5 disabled:opacity-50"
              >
                {busy === key ? "…" : t("profilePage.deniedRestore")}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
