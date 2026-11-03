"use client"

import { useEffect, useMemo, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { isAdminEmail } from "../../../lib/admin"
import { madridDaysAgo, madridToday } from "../../../lib/madridDay"
import { ADMIN_RANGE_MIN, normalizeRange, rangeDays, yearRange, yearsUpTo, type AdminRange } from "../../../lib/adminRange"
import { ALCOHOL_POLL_IDS, PARTY_POLLS, pollText } from "../../../lib/partyPolls"
import { percent, summarizeDays, tallyByDay, votesPerDay, type VoteRow } from "../../../lib/pollStats"

// Encuestas (03/11/2026): «¿Qué preferirías?», día a día. Cuántos votos hubo cada día, de qué
// preguntas, qué opción ganó y cuánta gente votó con cuenta y sin ella. Los votos sin cuenta
// (party_poll_anon_votes, SQL 53) no llevan nombre ni dispositivo: solo cuentan. No hace falta SQL
// nuevo: el admin ya puede leer las dos tablas de votos.

const PERIODS = [
  { key: 1, label: "Hoy" },
  { key: 7, label: "7 días" },
  { key: 30, label: "30 días" },
]
const DAYS_AT_FIRST = 14

type RawVote = { poll_id: string; choice: number; created_at: string }

const POLLS_BY_ID = new Map(PARTY_POLLS.map((p) => [p.id, p]))

// Pide todas las filas de una tabla de votos entre dos instantes, de mil en mil (Supabase corta ahí).
async function loadVotes(table: "party_poll_votes" | "party_poll_anon_votes", lo: string, hi: string) {
  const out: RawVote[] = []
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select("poll_id, choice, created_at")
      .gte("created_at", lo)
      .lt("created_at", hi)
      .order("created_at", { ascending: true })
      .range(from, from + 999)
    if (error) return { rows: out, error: error.message || "error" }
    out.push(...((data || []) as RawVote[]))
    if (!data || data.length < 1000) break
  }
  return { rows: out, error: null as string | null }
}

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))

export default function AdminPollsPage() {
  const [checking, setChecking] = useState(true)
  const [days, setDays] = useState(7)
  const [custom, setCustom] = useState<AdminRange | null>(null)
  const today = madridToday()
  const range: AdminRange = custom ?? { from: madridDaysAgo(days - 1), to: today }
  const [votes, setVotes] = useState<VoteRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState(DAYS_AT_FIRST)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!isAdminEmail(data.session?.user.email)) {
        window.location.href = "/"
        return
      }
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (checking) return
    // Si se cambia de periodo rápido, solo vale la última respuesta.
    let current = true
    setVotes(null)
    setError(null)
    setShown(DAYS_AT_FIRST)
    // Un día de margen por cada lado: el día se mide en hora de Madrid y las fechas de la base van en UTC.
    const lo = new Date(Date.parse(`${range.from}T00:00:00Z`) - 86400000).toISOString()
    const hi = new Date(Date.parse(`${range.to}T00:00:00Z`) + 2 * 86400000).toISOString()
    Promise.all([loadVotes("party_poll_votes", lo, hi), loadVotes("party_poll_anon_votes", lo, hi)]).then(([withAccount, withoutAccount]) => {
      if (!current) return
      const failure = withAccount.error || withoutAccount.error
      if (failure) setError(failure)
      setVotes([
        ...withAccount.rows.map((r) => ({ ...r, anon: false })),
        ...withoutAccount.rows.map((r) => ({ ...r, anon: true })),
      ])
    })
    return () => {
      current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, range.from, range.to])

  const dayList = useMemo(() => (votes ? tallyByDay(votes, range) : []), [votes, range.from, range.to]) // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(() => summarizeDays(dayList, range), [dayList, range.from, range.to]) // eslint-disable-line react-hooks/exhaustive-deps
  const series = useMemo(() => votesPerDay(dayList, range), [dayList, range.from, range.to]) // eslint-disable-line react-hooks/exhaustive-deps
  const maxDay = Math.max(1, ...series.map((s) => s.total))

  if (checking) {
    return (
      <AdminShell title="Encuestas">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? "bg-white text-black" : "border border-white/10 text-zinc-300 hover:bg-white/5"}`

  return (
    <AdminShell title="Encuestas" subtitle="La encuesta «¿Qué preferirías?» de cada día: cuánta gente vota, con y sin cuenta, y qué gana.">
      <div className="mb-3 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" className={chip(!custom && days === p.key)} onClick={() => { setCustom(null); setDays(p.key) }}>
            {p.label}
          </button>
        ))}
        <button type="button" className={chip(custom?.from === madridDaysAgo(1) && custom?.to === madridDaysAgo(1))} onClick={() => setCustom({ from: madridDaysAgo(1), to: madridDaysAgo(1) })}>
          Ayer
        </button>
        {yearsUpTo(today).map((y) => {
          const r = yearRange(y, today)
          return (
            <button key={y} type="button" className={chip(!!r && custom?.from === r.from && custom?.to === r.to)} onClick={() => r && setCustom(r)}>
              {y === Number(today.slice(0, 4)) ? `Este año (${y})` : String(y)}
            </button>
          )
        })}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-zinc-400">
        <label className="flex items-center gap-2">
          Desde
          <input
            type="date"
            min={ADMIN_RANGE_MIN}
            max={today}
            value={range.from}
            onChange={(e) => { const r = normalizeRange(e.target.value, range.to, today); if (r) setCustom(r) }}
            className="rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-xs text-zinc-200 [color-scheme:dark]"
          />
        </label>
        <label className="flex items-center gap-2">
          Hasta
          <input
            type="date"
            min={ADMIN_RANGE_MIN}
            max={today}
            value={range.to}
            onChange={(e) => { const r = normalizeRange(range.from, e.target.value, today); if (r) setCustom(r) }}
            className="rounded-full border border-white/10 bg-transparent px-3 py-1.5 text-xs text-zinc-200 [color-scheme:dark]"
          />
        </label>
        <span className="text-zinc-500">{range.from === range.to ? `Día ${range.from}` : `${rangeDays(range)} días`}</span>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-warn/40 bg-warn/10 p-5 text-sm text-warn">
          {/does not exist|schema cache/i.test(error)
            ? "Falta ejecutar supabase/23_encuestas_que_prefieres.sql y supabase/53_encuesta_sin_cuenta.sql en Supabase."
            : `No se pudieron cargar todos los votos (${error}). Los números de abajo pueden estar incompletos; vuelve a intentarlo en un momento.`}
        </div>
      )}

      {!votes ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Votos" value={String(summary.votes)} sub={`${summary.avgPerDay.toString().replace(".", ",")} de media al día`} />
            <Kpi label="Con cuenta" value={String(summary.account)} sub={`${percent(summary.account, summary.votes)} % de los votos`} />
            <Kpi label="Sin cuenta" value={String(summary.anon)} sub={`${percent(summary.anon, summary.votes)} % de los votos`} />
            <Kpi label="Días con votos" value={`${summary.daysWithVotes} de ${summary.daysInRange}`} />
          </dl>

          {summary.votes === 0 ? (
            <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
              No hay votos en estas fechas. La encuesta sale una vez al día a quien la ve; sin cuenta, solo a quien ha aceptado el banner de cookies.
            </p>
          ) : (
            <>
              {series.length > 1 && (
                <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="text-sm font-black">Votos por día</h2>
                  <div className="mt-4 overflow-x-auto">
                    <div className="flex h-28 items-end gap-[3px]" style={{ minWidth: series.length > 45 ? `${series.length * 9}px` : undefined }}>
                      {series.map((s) => (
                        <div key={s.day} className="flex h-full min-w-[4px] flex-1 flex-col justify-end" title={`${dayLabel(s.day)}: ${s.total} ${s.total === 1 ? "voto" : "votos"}`}>
                          <div className={`w-full rounded-t-[3px] ${s.total ? "bg-brand" : "bg-white/10"}`} style={{ height: s.total ? `${Math.max(6, (s.total / maxDay) * 100)}%` : "2px" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
                    <span>{dayLabel(series[0].day)}</span>
                    <span>máx. {maxDay} en un día</span>
                    <span>{dayLabel(series[series.length - 1].day)}</span>
                  </div>
                </section>
              )}

              <h2 className="mb-3 mt-8 text-sm font-black">Día a día</h2>
              <ul className="space-y-3">
                {dayList.slice(0, shown).map((d) => (
                  <li key={d.day} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-sm font-black capitalize text-ink">{dayLabel(d.day)}</h3>
                      <p className="text-xs text-zinc-400">
                        {d.total} {d.total === 1 ? "voto" : "votos"} · {d.account} con cuenta · {d.anon} sin cuenta
                      </p>
                    </div>
                    <ul className="mt-4 space-y-5">
                      {d.polls.map((p) => {
                        const poll = POLLS_BY_ID.get(p.pollId)
                        const text = poll ? pollText(poll, "es") : null
                        const pa = percent(p.a, p.total)
                        const pb = percent(p.b, p.total)
                        return (
                          <li key={p.pollId}>
                            <div className="space-y-2">
                              {[
                                { label: text?.a ?? "Opción A", n: p.a, pct: pa, lead: p.a >= p.b },
                                { label: text?.b ?? "Opción B", n: p.b, pct: pb, lead: p.b >= p.a },
                              ].map((o, i) => (
                                <div key={i}>
                                  <div className="flex justify-between gap-3 text-sm">
                                    <span className={o.lead && p.a !== p.b ? "text-ink" : "text-zinc-300"}>{o.label}</span>
                                    <span className="shrink-0 tabular-nums text-zinc-300">
                                      {o.pct} % <span className="text-zinc-500">· {o.n}</span>
                                    </span>
                                  </div>
                                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                                    <div className={`h-1.5 rounded-full ${i === 0 ? "bg-brand" : "bg-zinc-400"}`} style={{ width: `${o.pct}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-[11px] text-zinc-500">
                              {p.total} {p.total === 1 ? "voto" : "votos"} · {p.account} con cuenta · {p.anon} sin cuenta
                              {ALCOHOL_POLL_IDS.has(p.pollId) && " · pregunta de alcohol (solo con cuenta)"}
                              {!poll && ` · pregunta «${p.pollId}» que ya no está en la lista`}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
              {dayList.length > shown && (
                <button type="button" className={`${chip(false)} mt-4`} onClick={() => setShown((n) => n + 30)}>
                  Ver más días ({dayList.length - shown} más)
                </button>
              )}
              <p className="mt-6 text-xs leading-relaxed text-zinc-500">
                Un voto cuenta para el día de Barcelona en que se emitió. En un mismo día pueden salir preguntas distintas: quien ya votó la de hoy recibe la
                siguiente, y sin cuenta no salen las de alcohol. Los votos sin cuenta son anónimos (no se guarda quién ni desde dónde); como solo se recuerda
                el voto en el móvil si se aceptan las cookies, una misma persona podría votar más de una vez si borra los datos del navegador.
              </p>
            </>
          )}
        </>
      )}
    </AdminShell>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-1 font-display text-2xl tabular-nums text-ink">{value}</dd>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
    </div>
  )
}
