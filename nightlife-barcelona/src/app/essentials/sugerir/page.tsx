"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Check, Clock, X as XIcon } from "lucide-react"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AuthGateModal from "../../../components/ui/AuthGateModal"
import { supabase } from "../../../lib/supabase"
import { logError } from "../../../lib/log"
import { ESSENTIAL_SUGGESTION_XP } from "../../../lib/xp"
import { categoryInfo, categoryNameKey } from "../../../lib/essentialCategories"
import { useLanguage } from "../../../context/LanguageContext"

// «¿Nos faltan esenciales? ¡Ayúdanos!» (31/10/2026). Formulario: tipo, nombre, calle y número. Lo
// revisa el admin (Admin › Sugerencias de esenciales) y, si es correcto, da XP. Datos: supabase/62.

type Suggestion = {
  id: number
  category: string
  name: string
  street: string
  street_number: string | null
  status: "pending" | "approved" | "rejected"
  xp_awarded: number
  created_at: string
}

// Tipos que se pueden proponer. Metro y Nitbus no: vienen de los datos oficiales.
const TYPES = ["Pharmacy", "ATM", "Food", "Supermarket", "Hospital", "Gas Station", "Other"] as const

const field =
  "w-full rounded-ctl border border-white/10 bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-zinc-500 focus:border-brand/50"

export default function SuggestEssentialPage() {
  const { t } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [category, setCategory] = useState("")
  const [name, setName] = useState("")
  const [street, setStreet] = useState("")
  const [streetNumber, setStreetNumber] = useState("")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [gate, setGate] = useState(false)
  const [mine, setMine] = useState<Suggestion[]>([])

  const loadMine = useCallback(async (uid: string) => {
    const { data, error: err } = await supabase
      .from("essential_suggestions")
      .select("id, category, name, street, street_number, status, xp_awarded, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20)
    if (err) {
      // Si aún no existe la tabla (SQL 62 sin ejecutar) simplemente no se enseña la lista.
      logError("ESSENTIAL SUGGESTIONS LOAD:", err)
      return
    }
    setMine((data || []) as Suggestion[])
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id || null
      setUserId(uid)
      if (uid) loadMine(uid)
    })
  }, [loadMine])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    setError("")
    if (!category) return setError(t("essentialsSuggest.errType"))
    if (name.trim().length < 2) return setError(t("essentialsSuggest.errName"))
    if (street.trim().length < 2) return setError(t("essentialsSuggest.errStreet"))
    if (!userId) {
      setGate(true)
      return
    }
    setSending(true)
    const { error: err } = await supabase.from("essential_suggestions").insert({
      user_id: userId,
      category,
      name: name.trim(),
      street: street.trim(),
      street_number: streetNumber.trim() || null,
      note: note.trim() || null,
    })
    setSending(false)
    if (err) {
      logError("ESSENTIAL SUGGESTION INSERT:", err)
      const msg = String(err.message || "")
      setError(
        msg.includes("limite_sugerencias")
          ? t("essentialsSuggest.errLimit")
          : msg.includes("sugerencia_repetida")
            ? t("essentialsSuggest.errRepeat")
            : t("essentialsSuggest.errGeneric")
      )
      return
    }
    setDone(true)
    setName("")
    setStreet("")
    setStreetNumber("")
    setNote("")
    setCategory("")
    loadMine(userId)
  }

  const xp = String(ESSENTIAL_SUGGESTION_XP)
  const typeLabel = (key: string) => (key === "Other" ? t("essentialsSuggest.catOther") : t(categoryNameKey(key)))

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 pb-28 sm:py-12">
        <Link href="/essentials" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-300 transition hover:text-ink">
          <ChevronLeft size={16} aria-hidden="true" /> {t("essentialsSuggest.back")}
        </Link>

        <h1 className="mt-5 font-display text-[2rem] leading-tight text-ink sm:text-4xl">{t("essentialsSuggest.pageTitle")}</h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-300">{t("essentialsSuggest.pageSubtitle")}</p>

        <ol className="mt-6 space-y-2 rounded-card border border-white/10 bg-surface p-4 text-sm text-zinc-200">
          {["how1", "how2", "how3"].map((k, i) => (
            <li key={k} className="flex gap-3">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="leading-snug">{t(`essentialsSuggest.${k}`).replace("{xp}", xp)}</span>
            </li>
          ))}
        </ol>

        {done && (
          <div role="status" className="mt-6 rounded-card border border-open/40 bg-open/[0.08] p-5">
            <p className="flex items-center gap-2 text-base font-semibold text-open">
              <Check size={18} aria-hidden="true" /> {t("essentialsSuggest.doneTitle")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-200">{t("essentialsSuggest.doneBody").replace("{xp}", xp)}</p>
            <button
              type="button"
              onClick={() => setDone(false)}
              className="mt-4 rounded-ctl border border-white/20 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/5"
            >
              {t("essentialsSuggest.another")}
            </button>
          </div>
        )}

        {!done && (
          <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">{t("essentialsSuggest.labelType")}</legend>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((key) => {
                  const Icon = key === "Other" ? null : categoryInfo(key).icon
                  const on = category === key
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setCategory(on ? "" : key)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                        on ? "border-brand bg-brand text-white" : "border-white/15 text-zinc-200 hover:bg-white/5"
                      }`}
                    >
                      {Icon && <Icon size={16} aria-hidden="true" />}
                      {typeLabel(key)}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="es-name" className="mb-2 block text-sm font-semibold text-ink">
                {t("essentialsSuggest.labelName")}
              </label>
              <input id="es-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={t("essentialsSuggest.phName")} className={field} />
            </div>

            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="es-street" className="mb-2 block text-sm font-semibold text-ink">
                  {t("essentialsSuggest.labelStreet")}
                </label>
                <input id="es-street" value={street} onChange={(e) => setStreet(e.target.value)} maxLength={160} placeholder={t("essentialsSuggest.phStreet")} autoComplete="off" className={field} />
              </div>
              <div className="w-28 shrink-0">
                <label htmlFor="es-number" className="mb-2 block text-sm font-semibold text-ink">
                  {t("essentialsSuggest.labelNumber")}
                </label>
                <input id="es-number" value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} maxLength={20} placeholder="123" inputMode="text" autoComplete="off" className={field} />
              </div>
            </div>

            <div>
              <label htmlFor="es-note" className="mb-2 block text-sm font-semibold text-ink">
                {t("essentialsSuggest.labelNote")}
              </label>
              <textarea id="es-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder={t("essentialsSuggest.phNote")} className={`${field} resize-none`} />
            </div>

            {error && (
              <p role="alert" className="text-sm font-semibold text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-ctl bg-brand px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
            >
              {sending ? t("essentialsSuggest.sending") : t("essentialsSuggest.submit")}
            </button>
            {!userId && <p className="text-xs leading-relaxed text-zinc-400">{t("essentialsSuggest.gate")}</p>}
          </form>
        )}

        {mine.length > 0 && (
          <section className="mt-10" aria-labelledby="es-mine">
            <h2 id="es-mine" className="text-lg font-semibold text-ink">
              {t("essentialsSuggest.mineTitle")}
            </h2>
            <ul className="mt-3 space-y-2">
              {mine.map((s) => (
                <li key={s.id} className="flex items-start gap-3 rounded-card border border-white/10 bg-surface p-4">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      s.status === "approved" ? "bg-open/20 text-open" : s.status === "rejected" ? "bg-white/10 text-zinc-400" : "bg-warn/20 text-warn"
                    }`}
                  >
                    {s.status === "approved" ? <Check size={14} /> : s.status === "rejected" ? <XIcon size={14} /> : <Clock size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{s.name}</span>
                    <span className="block truncate text-xs text-zinc-400">
                      {typeLabel(s.category)} · {s.street}
                      {s.street_number ? ` ${s.street_number}` : ""}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-zinc-300">
                      {t(s.status === "approved" ? "essentialsSuggest.statusApproved" : s.status === "rejected" ? "essentialsSuggest.statusRejected" : "essentialsSuggest.statusPending")}
                      {s.xp_awarded > 0 && <span className="ml-2 text-open">{t("essentialsSuggest.xpEarned").replace("{n}", String(s.xp_awarded))}</span>}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <BottomNav />
      <AuthGateModal open={gate} onClose={() => setGate(false)} subtitleKey="essentialsSuggest.gate" />
    </>
  )
}
