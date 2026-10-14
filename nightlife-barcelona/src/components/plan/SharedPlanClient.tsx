"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import NocOwl from "../mascot/NocOwl"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { Clock, Ticket, Disc3, Check, Link2 } from "lucide-react"

type Stop = { kind?: string; title?: string; subtitle?: string; time?: string; image?: string | null; href?: string }
type Plan = { title: string; plan_date: string | null; stops: Stop[]; rsvps: string[] }

const NAME_KEY = "noctua_rsvp_name"

export default function SharedPlanClient({ code }: { code: string }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading")
  const [name, setName] = useState("")
  const [joined, setJoined] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const [copied, setCopied] = useState(false)
  const { t, locale } = useLanguage()

  const load = async () => {
    const { data, error } = await supabase.rpc("get_night_plan", { p_code: code })
    if (error || !data) { setState("missing"); return }
    setPlan(data as Plan)
    setState("ok")
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY)
      if (saved) setName(saved)
      if (localStorage.getItem(`noctua_rsvp_${code}`)) setJoined(true)
    } catch {}
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const join = async () => {
    const clean = name.trim()
    if (!clean || busy) return
    setBusy(true)
    setMsg("")
    const { data, error } = await supabase.rpc("rsvp_night_plan", { p_code: code, p_name: clean })
    setBusy(false)
    if (error || !data) { setMsg(t("sharedPlan.joinError")); return }
    try {
      localStorage.setItem(NAME_KEY, clean)
      localStorage.setItem(`noctua_rsvp_${code}`, "1")
    } catch {}
    setJoined(true)
    load()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  if (state === "loading") return <p className="py-24 text-center text-zinc-400">{t("common.loading")}</p>

  if (state === "missing" || !plan) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto w-fit"><NocOwl size={80} mood="sleepy" /></div>
        <h1 className="font-display mt-4 text-2xl">{t("sharedPlan.missingTitle")}</h1>
        <p className="mt-2 text-sm text-zinc-400">{t("sharedPlan.missingBody")}</p>
        <Link href="/plan" className="mt-6 inline-block rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white">{t("planPage.generatePlanCta")}</Link>
      </div>
    )
  }

  const rawDate = plan.plan_date ? new Date(plan.plan_date + "T12:00:00").toLocaleDateString(toDateLocale(locale), { weekday: "long", day: "numeric", month: "long" }) : ""
  const dateText = rawDate ? rawDate.charAt(0).toUpperCase() + rawDate.slice(1) : ""
  const goers = plan.rsvps || []

  return (
    <div>
      <div className="flex items-center gap-3">
        <NocOwl size={60} mood="party" />
        <div>
          <p className="text-sm font-semibold text-brand-soft">{t("sharedPlan.invited")}</p>
          <h1 className="font-display text-2xl leading-tight">{plan.title}</h1>
          {dateText && <p className="text-sm text-zinc-400">{dateText}</p>}
        </div>
      </div>

      <ol className="relative mt-8 space-y-4 border-l border-white/15 pl-6">
        {(plan.stops || []).map((s, i) => {
          const href = s.href && s.href.startsWith("/") && !s.href.startsWith("//") ? s.href : null
          const img = s.image && s.image.startsWith("https://") ? s.image : null
          const inner = (
            <div className="flex flex-1 gap-3 rounded-card border border-white/10 bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img && <img src={img} alt="" className="h-16 w-16 shrink-0 rounded-ctl object-cover" />}
              <div className="min-w-0">
                {s.time && <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-soft"><Clock size={12} /> {s.time}</p>}
                <p className="truncate font-semibold text-ink">{s.title}</p>
                {s.subtitle && <p className="truncate text-xs text-zinc-400">{s.subtitle}</p>}
              </div>
            </div>
          )
          return (
            <li key={i} className="relative">
              <span className="absolute -left-[37px] top-4 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-night text-brand-soft">
                {s.kind === "event" ? <Ticket size={13} /> : <Disc3 size={13} />}
              </span>
              {href ? <Link href={href} className="flex transition hover:opacity-90">{inner}</Link> : inner}
            </li>
          )
        })}
      </ol>

      <div className="mt-10 rounded-card border border-brand/30 bg-brand/10 p-5">
        {joined ? (
          <p className="flex items-center justify-center gap-2 text-sm font-semibold text-open"><Check size={16} /> {t("sharedPlan.joined")}</p>
        ) : (
          <>
            <p className="text-base font-semibold text-ink">{t("sharedPlan.joinTitle")}</p>
            <p className="mt-1 text-sm text-zinc-300">{t("sharedPlan.joinBody")}</p>
            <div className="mt-3 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                aria-label={t("sharedPlan.namePlaceholder")}
                placeholder={t("sharedPlan.namePlaceholder")}
                className="min-w-0 flex-1 rounded-ctl border border-white/15 bg-night px-4 py-3 text-base text-ink outline-none focus:border-brand"
              />
              <button onClick={join} disabled={busy || !name.trim()} className="shrink-0 rounded-ctl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-95 disabled:opacity-50">
                {busy ? "…" : t("sharedPlan.joinCta")}
              </button>
            </div>
            {msg && <p className="mt-2 text-sm text-red-300">{msg}</p>}
          </>
        )}
        <p className="mt-4 text-center text-sm text-zinc-400">
          {goers.length === 0
            ? t("sharedPlan.nobody")
            : `${t("sharedPlan.going")}: ${goers.slice(0, 8).join(", ")}${goers.length > 8 ? ` ${t("sharedPlan.andMore").replace("{n}", String(goers.length - 8))}` : ""}`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={copy} className="flex items-center justify-center gap-2 rounded-ctl border border-white/15 py-3 text-sm font-semibold text-ink">
          {copied ? <><Check size={16} /> {t("clubPage.linkCopied")}</> : <><Link2 size={16} /> {t("sharedPlan.copyLink")}</>}
        </button>
        <Link href="/plan" className="rounded-ctl bg-brand py-3 text-center text-sm font-semibold text-white">
          {t("planPage.generatePlanCta")}
        </Link>
      </div>
    </div>
  )
}
