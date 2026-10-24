"use client"

import { useState } from "react"
import Icon from "../../ui/Icon"
import { supabase } from "../../../lib/supabase"
import { touchCache } from "../../../lib/touchCache"
import { useLanguage } from "../../../context/LanguageContext"
import { toast } from "../../ui/Toast"
import { EXTRA_FEATURES } from "../../../lib/extraFeatures"

// Características del club (terraza, billar, VIP...). Dos arreglos (24/10/2026):
//   1. El futbolín/billar se podía marcar en /admin pero la ficha nunca lo enseñaba.
//   2. Ahora el admin las activa/desactiva aquí mismo, en la ficha, con un toque — sin ir al
//      formulario de /admin. Para el resto de gente solo se ven las que están activas.
// Tras cada cambio se avisa a Next (touchCache) para que la ficha y los listados públicos dejen
// de servir la versión en caché.
type Toggle = { field: string; labelKey: string; icon: string }

const TOGGLES: Toggle[] = [
  { field: "terrace", labelKey: "clubPage.fTerrace", icon: "leaf" },
  { field: "has_foosball", labelKey: "clubPage.fFoosball", icon: "billiards" },
  { field: "vip_tables", labelKey: "clubPage.fVip", icon: "sofa" },
  { field: "smoking_area", labelKey: "clubPage.fSmoking", icon: "cigarette" },
  { field: "table_booking", labelKey: "clubPage.fBooking", icon: "clipboard" },
  { field: "lgtbi_friendly", labelKey: "clubPage.fLgtbi", icon: "pride" },
  { field: "swinger_friendly", labelKey: "clubPage.fSwinger", icon: "shield" },
  // Máquina de tabaco, dardos, karaoke, música en directo... (lib/extraFeatures.ts)
  ...EXTRA_FEATURES.map((f) => ({ field: f.field, labelKey: f.labelKey, icon: f.icon })),
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Club = Record<string, any>

export function activeFeatureCount(club: Club, capacity: number | null): number {
  return TOGGLES.filter((f) => !!club[f.field]).length + (club.dresscode ? 1 : 0) + (capacity ? 1 : 0)
}

export default function ClubFeatures({ club, capacity, isAdmin }: { club: Club; capacity: number | null; isAdmin: boolean }) {
  const { t } = useLanguage()
  // Estado local: la ficha es ISR y puede tardar en traer el dato nuevo, así que lo que se acaba
  // de cambiar se enseña ya, sin esperar.
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOGGLES.map((f) => [f.field, !!club[f.field]]))
  )
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = async (field: string) => {
    const next = !values[field]
    setBusy(field)
    setValues((v) => ({ ...v, [field]: next }))
    const { error } = await supabase.from("clubs").update({ [field]: next }).eq("id", club.id)
    setBusy(null)
    if (error) {
      setValues((v) => ({ ...v, [field]: !next }))
      toast("No se pudo guardar: " + error.message, 4000)
      return
    }
    touchCache(["/", "/clubs", "/map", window.location.pathname])
  }

  const active = TOGGLES.filter((f) => values[f.field])
  const extra = [
    club.dresscode && { key: "dresscode", label: `${t("clubPage.fDresscode")}: ${club.dresscode}`, icon: "shirt" },
    capacity && { key: "capacity", label: t("clubPage.fCapacity").replace("{n}", String(capacity)), icon: "users" },
  ].filter(Boolean) as { key: string; label: string; icon: string }[]

  return (
    <>
      {active.length + extra.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {active.map((f) => (
            <li key={f.field} className="flex items-center gap-3 rounded-ctl border border-white/10 px-4 py-3">
              <Icon name={f.icon} className="h-4 w-4 shrink-0 text-brand-soft" />
              <span className="text-sm font-semibold text-ink">{t(f.labelKey)}</span>
            </li>
          ))}
          {extra.map((f) => (
            <li key={f.key} className="flex items-center gap-3 rounded-ctl border border-white/10 px-4 py-3">
              <Icon name={f.icon} className="h-4 w-4 shrink-0 text-brand-soft" />
              <span className="text-sm font-semibold text-ink">{f.label}</span>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div className={`rounded-ctl border border-dashed border-purple-400/40 bg-purple-500/[0.05] p-4 ${active.length + extra.length > 0 ? "mt-4" : ""}`}>
          <p className="mb-3 text-xs font-semibold text-purple-200">{t("clubPage.editFeatures")}</p>
          <div className="flex flex-wrap gap-2">
            {TOGGLES.map((f) => {
              const on = values[f.field]
              return (
                <button
                  key={f.field}
                  type="button"
                  onClick={() => toggle(f.field)}
                  disabled={busy === f.field}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold transition disabled:opacity-50 ${
                    on ? "bg-brand text-white" : "border border-white/15 bg-white/[0.04] text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  <Icon name={f.icon} className="h-3.5 w-3.5" />
                  {t(f.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
