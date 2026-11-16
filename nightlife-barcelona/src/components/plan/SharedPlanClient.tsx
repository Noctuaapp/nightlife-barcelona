"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "../system/CityLink" // 16/11/2026: «/plan» (generar tu plan) debe ser el de la ciudad en pantalla, no el de Barcelona
import CityLink from "../system/CityLink"
import { supabase } from "../../lib/supabase"
import NocOwl from "../mascot/NocOwl"
import { useLanguage } from "../../context/LanguageContext"
import { useCityT } from "../../lib/useCityT"
import { useSelectedCity } from "../../lib/previewCity"
import { getMetroTonight, type MetroTonight } from "../../lib/transitHours"
import { toDateLocale } from "../../lib/dateLocale"
import { track } from "../../lib/track"
import { Clock, Ticket, Check, Link2, BusFront, CarTaxiFront, TrainFront, Crown } from "lucide-react"
import { SECTION_ICONS } from "../../lib/sectionIcons"
import { cleanVoterName, getVoterToken, isPollClosed, leadingIdx, parsePollState, peekVoterToken, votePercent, type PollState } from "../../lib/planPoll"

type Stop = { kind?: string; title?: string; subtitle?: string; time?: string; image?: string | null; href?: string }
type Plan = { title: string; plan_date: string | null; stops: Stop[]; rsvps: string[] }

const NAME_KEY = "noctua_rsvp_name"
const POLL_REFRESH_MS = 15_000
const POLL_REFRESH_MAX = 40 // ~10 min con la pantalla abierta: luego se queda quieto para no gastar

const safeHref = (h?: string) => (h && h.startsWith("/") && !h.startsWith("//") ? h : null)
const safeImg = (i?: string | null) => (i && i.startsWith("https://") ? i : null)

export default function SharedPlanClient({ code }: { code: string }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [poll, setPoll] = useState<PollState | null>(null)
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading")
  const [name, setName] = useState("")
  const [joined, setJoined] = useState(false)
  const [busy, setBusy] = useState(false)
  const [votingIdx, setVotingIdx] = useState<number | null>(null)
  const [msg, setMsg] = useState("")
  const [pollMsg, setPollMsg] = useState("")
  const [copied, setCopied] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const { t, locale } = useLanguage()

  // Recuento de la votación. Si la función del servidor todavía no está instalada (supabase/119) o falla, la página
  // se queda como un plan normal: no se rompe nada.
  const loadPoll = useCallback(async () => {
    const { data, error } = await supabase.rpc("night_plan_poll_state", { p_code: code, p_token: peekVoterToken() })
    if (error) return
    setPoll(parsePollState(data))
  }, [code])

  const load = useCallback(async () => {
    const [{ data, error }] = await Promise.all([supabase.rpc("get_night_plan", { p_code: code }), loadPoll()])
    if (error || !data) { setState("missing"); return }
    setPlan(data as Plan)
    setState("ok")
  }, [code, loadPoll])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY)
      if (saved) setName(saved)
      if (localStorage.getItem(`noctua_rsvp_${code}`)) setJoined(true)
    } catch {}
    load()
  }, [code, load])

  // Los amigos van votando: se vuelve a pedir el recuento cada pocos segundos mientras la pantalla está a la vista.
  const isPoll = poll !== null
  const closed = isPoll && isPollClosed(plan?.plan_date)
  useEffect(() => {
    if (!isPoll || closed) return
    let n = 0
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && n < POLL_REFRESH_MAX) {
        n++
        loadPoll()
      }
    }, POLL_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [isPoll, closed, loadPoll])

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
    track("plan_rsvp", { itemType: "plan", meta: { kind: isPoll ? "poll" : "plan" } })
    setJoined(true)
    load()
  }

  const vote = async (idx: number) => {
    if (votingIdx !== null || closed) return
    const clean = cleanVoterName(name)
    if (!clean) {
      setPollMsg(t("sharedPlan.pollAskName"))
      nameRef.current?.focus()
      return
    }
    setVotingIdx(idx)
    setPollMsg("")
    const changed = poll?.mine !== null && poll?.mine !== undefined
    const { data, error } = await supabase.rpc("vote_night_plan", { p_code: code, p_token: getVoterToken(), p_name: clean, p_option: idx })
    setVotingIdx(null)
    const next = error ? null : parsePollState(data)
    if (!next) { setPollMsg(t("sharedPlan.pollError")); return }
    try { localStorage.setItem(NAME_KEY, clean) } catch {}
    setName(clean)
    setPoll(next)
    track("plan_poll_vote", { itemType: "plan", meta: { changed } })
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
        <Link href="/plan" className="btn-pill btn-primary mt-6 inline-block px-6 py-3 text-sm">{t("planPage.generatePlanCta")}</Link>
      </div>
    )
  }

  const rawDate = plan.plan_date ? new Date(plan.plan_date + "T12:00:00").toLocaleDateString(toDateLocale(locale), { weekday: "long", day: "numeric", month: "long" }) : ""
  const dateText = rawDate ? rawDate.charAt(0).toUpperCase() + rawDate.slice(1) : ""
  const goers = plan.rsvps || []
  const stops = plan.stops || []
  const leaders = poll ? leadingIdx(poll) : []

  return (
    <div>
      <div className="flex items-center gap-3">
        <NocOwl size={60} mood="party" />
        <div>
          <p className="text-sm font-semibold text-brand-soft">{closed ? t("sharedPlan.pollClosedTag") : isPoll ? t("sharedPlan.pollInvited") : t("sharedPlan.invited")}</p>
          <h1 className="font-display text-2xl leading-tight">{plan.title}</h1>
          {dateText && <p className="text-sm text-zinc-400">{dateText}</p>}
        </div>
      </div>

      {poll ? (
        <section className="mt-6" aria-label={t("sharedPlan.pollInvited")}>
          {closed ? (
            <>
              <p className="text-sm text-zinc-300">{t("sharedPlan.pollClosedIntro")}</p>
              {leaders.length > 0 && (
                <p className="mt-2 flex items-start gap-2 text-base font-bold text-amber-300">
                  <Crown size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    {leaders.length === 1
                      ? t("sharedPlan.pollClosedWinner").replace("{name}", stops[leaders[0]]?.title ?? "")
                      : t("sharedPlan.pollClosedTie").replace("{names}", leaders.map((i) => stops[i]?.title).filter(Boolean).join(", "))}
                  </span>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-300">{t("sharedPlan.pollIntro")}</p>

              <div className="mt-3">
                <label htmlFor="poll-name" className="text-xs font-semibold text-zinc-400">{t("sharedPlan.pollNameLabel")}</label>
                <input
                  id="poll-name"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setPollMsg("") }}
                  maxLength={30}
                  placeholder={t("sharedPlan.namePlaceholder")}
                  className="mt-1 w-full rounded-ctl border border-white/15 bg-night px-4 py-3 text-base text-ink outline-none focus:border-brand"
                />
              </div>
              {pollMsg && <p className="mt-2 text-sm text-red-300" role="alert">{pollMsg}</p>}
            </>
          )}

          <ul className="mt-4 space-y-3">
            {poll.options.map((o) => {
              const s = stops[o.idx]
              if (!s) return null
              const href = safeHref(s.href)
              const img = safeImg(s.image)
              const mine = poll.mine === o.idx
              const pct = votePercent(o.votes, poll.total)
              const leading = leaders.includes(o.idx)
              return (
                <li key={o.idx}>
                  <div className={`rounded-card border p-3 transition-colors ${mine ? "border-brand/60 bg-brand/10" : "border-white/10 bg-surface"}`}>
                    <div className="flex gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img && <img src={img} alt="" className="h-16 w-16 shrink-0 rounded-ctl object-cover" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{s.title}</p>
                        {s.subtitle && <p className="truncate text-xs text-zinc-400">{s.subtitle}</p>}
                        {href && (
                          <Link href={href} className="mt-1 inline-block text-xs font-semibold text-brand-soft underline underline-offset-2">
                            {t("sharedPlan.pollSeeVenue")}
                          </Link>
                        )}
                      </div>
                      {leading && (
                        <span className="flex h-fit shrink-0 items-center gap-1 rounded-full bg-amber-400/15 px-2 py-1 text-[11px] font-bold text-amber-300">
                          <Crown size={12} aria-hidden="true" /> {leaders.length > 1 ? t("sharedPlan.pollTie") : closed ? t("sharedPlan.pollWon") : t("sharedPlan.pollLeading")}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${pct}%`}>
                      <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-300">
                      {o.votes === 1 ? t("sharedPlan.pollOneVote") : t("sharedPlan.pollVotes").replace("{n}", String(o.votes))}
                      {poll.total > 0 && ` · ${pct}%`}
                    </p>
                    {o.voters.length > 0 && (
                      <p className="mt-1 text-xs leading-snug text-zinc-400">
                        {o.voters.join(", ")}
                        {o.votes > o.voters.length ? ` ${t("sharedPlan.andMore").replace("{n}", String(o.votes - o.voters.length))}` : ""}
                      </p>
                    )}

                    {closed ? (
                      mine && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-soft">
                          <Check size={14} aria-hidden="true" /> {t("sharedPlan.pollYourVote")}
                        </p>
                      )
                    ) : (
                    <button
                      type="button"
                      onClick={() => vote(o.idx)}
                      disabled={votingIdx !== null}
                      aria-pressed={mine}
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-ctl py-3 text-sm font-bold transition active:scale-[0.98] disabled:opacity-60 ${
                        mine ? "border border-brand/60 bg-brand/20 text-ink" : "btn-pill btn-primary"
                      }`}
                    >
                      {mine && <Check size={16} aria-hidden="true" />}
                      {votingIdx === o.idx ? "…" : mine ? t("sharedPlan.pollYourVote") : t("sharedPlan.pollVote")}
                    </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <p className="mt-3 text-center text-sm text-zinc-400" aria-live="polite">
            {closed
              ? poll.total === 0 ? t("sharedPlan.pollClosedNobody") : t("sharedPlan.pollClosedTotal").replace("{n}", String(poll.total))
              : poll.total === 0 ? t("sharedPlan.pollNobody") : t("sharedPlan.pollTotal").replace("{n}", String(poll.total))}
          </p>
          {!closed && poll.mine !== null && <p className="mt-1 text-center text-xs text-zinc-500">{t("sharedPlan.pollShareHint")}</p>}
        </section>
      ) : (
        <ol className="relative mt-8 space-y-4 border-l border-white/15 pl-6">
          {stops.map((s, i) => {
            const href = safeHref(s.href)
            const img = safeImg(s.image)
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
                  {s.kind === "event" ? <Ticket size={13} /> : <SECTION_ICONS.clubs size={13} />}
                </span>
                {href ? <Link href={href} className="flex transition hover:opacity-90">{inner}</Link> : inner}
              </li>
            )
          })}
        </ol>
      )}

      {closed ? (
        <Link href="/plan" className="btn-pill btn-primary mt-8 block py-3 text-center text-sm">
          {t("planPage.generatePlanCta")}
        </Link>
      ) : (
      <>
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
              <button onClick={join} disabled={busy || !name.trim()} className="btn-pill btn-primary shrink-0 px-5 py-3 text-sm active:scale-95 disabled:opacity-50">
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

      <GetHomeBlock />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={copy} className="flex items-center justify-center gap-2 rounded-ctl border border-white/15 py-3 text-sm font-semibold text-ink">
          {copied ? <><Check size={16} /> {t("clubPage.linkCopied")}</> : <><Link2 size={16} /> {t("sharedPlan.copyLink")}</>}
        </button>
        <Link href="/plan" className="btn-pill btn-primary py-3 text-center text-sm">
          {t("planPage.generatePlanCta")}
        </Link>
      </div>
      </>
      )}
    </div>
  )
}

// «¿Y cómo volvéis?»: tres entradas a las formas de volver a casa (metro, Nit Bus, taxi), con el estado del metro de esta noche.
// Es lo que más suele quedarse sin decidir en un plan de grupo. Los textos son los de la portada («Cómo volver a casa»).
function GetHomeBlock() {
  const t = useCityT()
  const city = useSelectedCity()
  const madrid = city === "madrid"
  const [metro, setMetro] = useState<MetroTonight | null>(null)
  useEffect(() => setMetro(getMetroTonight(city)), [city])

  const metroLabel = !metro
    ? null
    : metro.state === "closed"
      ? t("clubPage.metroClosed")
      : metro.closes === "all-night"
        ? t("clubPage.metroAllNight")
        : t("clubPage.metroUntil").replace("{time}", metro.closes)

  const tile = "flex min-w-0 flex-col items-start gap-1 rounded-ctl border border-white/10 bg-night/60 p-3 transition hover:border-white/25"
  return (
    <section className="mt-4 rounded-card border border-white/10 bg-surface p-4" aria-labelledby="plan-gethome">
      <h2 id="plan-gethome" className="text-sm font-semibold text-ink">{t("sharedPlan.homeTitle")}</h2>
      <p className="mt-0.5 text-xs text-zinc-400">{t("sharedPlan.homeBody")}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <CityLink href="/metro" className={tile}>
          <TrainFront size={20} className="text-brand-soft" aria-hidden="true" />
          <span className="text-sm font-bold leading-tight text-ink">{t("home.doorMetro")}</span>
          {metroLabel && <span className="text-[11px] leading-snug text-zinc-400">{metroLabel}</span>}
        </CityLink>
        <CityLink href={madrid ? "/buhos" : "/nitbus"} className={tile}>
          <BusFront size={20} className="text-brand-soft" aria-hidden="true" />
          <span className="text-sm font-bold leading-tight text-ink">{t("home.doorNitbus")}</span>
        </CityLink>
        <CityLink href="/essentials/taxi" className={tile}>
          <CarTaxiFront size={20} className="text-brand-soft" aria-hidden="true" />
          <span className="text-sm font-bold leading-tight text-ink">{t("home.getHomeTaxi")}</span>
        </CityLink>
      </div>
    </section>
  )
}
