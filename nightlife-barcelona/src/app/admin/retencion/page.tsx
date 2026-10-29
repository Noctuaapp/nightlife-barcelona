"use client"

import { useEffect, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { isAdminEmail } from "../../../lib/admin"

// Retención (29/10/2026): «¿vuelve la gente?». Se mide sin guardar nada en el móvil de nadie, solo
// con lo que ya se registra:
//   1. Cuentas registradas: de las que se crean, cuántas vuelven (al día siguiente, en la primera
//      semana, en el primer mes) y cuántas hay activas cada día. «Volver» = abrir la web con la
//      sesión iniciada en otro día.
//   2. App instalada: personas que abren Noctua desde el icono cada día (origen "pwa"),
//      instalaciones confirmadas por el móvil y cuentas que abren la app en 2 o más días distintos.
// Datos: admin_retention() en supabase/51_retencion.sql.
// Colores del gráfico validados contra el fondo oscuro con scripts/validate_palette.js (dataviz):
// morado de la marca = cuentas que ya existían, verde azulado = cuentas nuevas.

const C_BACK = "#7c5cff"
const C_NEW = "#14a89a"

type Pair = { eligible: number; returned: number }
type DayRow = { day: string; active: number; fresh: number; back: number }
type AppDay = { day: string; app_people: number; app_visits: number; all_people: number; installs: number }
type Data = {
  today: string
  cohort_days: number
  accounts: number
  d1: Pair
  w1: Pair
  m1: Pair
  ever: Pair
  active_today: number
  active_7d: number
  active_30d: number
  old_active_7d: number
  freq: { one: number; few: number; many: number; lots: number }
  daily: DayRow[]
  app: { installs_total: number; installs_30d: number; accounts: number; accounts_multi: number; daily: AppDay[] }
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)
const dayDate = (day: string) => new Date(day + "T12:00:00")
const dayLong = (day: string) => dayDate(day).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
const dayShort = (day: string) => {
  const d = dayDate(day)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// Máximo "redondo" del eje (4, 10, 20, 50, 100...) para que las marcas sean números limpios.
function niceMax(n: number) {
  if (n <= 4) return 4
  const p = Math.pow(10, Math.floor(Math.log10(n)))
  for (const m of [1, 2, 5, 10]) if (n <= m * p) return m * p
  return 10 * p
}

type Seg = { label: string; value: number; color: string }
type Col = { day: string; segs: Seg[] }

// Columnas por día (apiladas si hay varias series). Barras de hasta 24 px, 4 px redondeadas arriba,
// 2 px de hueco entre tramos; pasar el ratón (o el foco) por una columna enseña su detalle.
// Hay también vista de tabla.
function DayColumns({ cols, unit, caption }: { cols: Col[]; unit: string; caption: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const H = 144
  const totals = cols.map((c) => c.segs.reduce((n, s) => n + s.value, 0))
  const max = niceMax(Math.max(0, ...totals))
  const n = cols.length
  const legend = cols[0]?.segs.length > 1 ? cols[0].segs : []
  const hoverCol = hover !== null ? cols[hover] : null

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {legend.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-zinc-300">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
        <button type="button" onClick={() => setTable((v) => !v)} className="ml-auto text-xs font-semibold text-brand-soft hover:underline">
          {table ? "Ver gráfico" : "Ver como tabla"}
        </button>
      </div>

      {table ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 bg-surface text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-semibold">Día</th>
                {cols[0]?.segs.map((s) => (
                  <th key={s.label} className="px-3 py-2 text-right font-semibold">{s.label}</th>
                ))}
                {legend.length > 0 && <th className="px-3 py-2 text-right font-semibold">Total</th>}
              </tr>
            </thead>
            <tbody>
              {[...cols].reverse().map((c, i) => (
                <tr key={c.day} className="border-t border-white/[0.06]">
                  <td className="px-3 py-1.5 text-zinc-300">{dayLong(c.day)}</td>
                  {c.segs.map((s) => (
                    <td key={s.label} className="px-3 py-1.5 text-right tabular-nums text-ink">{s.value}</td>
                  ))}
                  {legend.length > 0 && <td className="px-3 py-1.5 text-right tabular-nums text-ink">{totals[n - 1 - i]}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative" role="img" aria-label={caption}>
          <div className="flex">
            <div className="relative w-7 shrink-0 text-[11px] tabular-nums text-zinc-500" style={{ height: H }} aria-hidden="true">
              {[0, 0.5, 1].map((t) => (
                <span key={t} className="absolute right-1.5 -translate-y-1/2" style={{ bottom: t * H }}>
                  {Math.round(max * t)}
                </span>
              ))}
            </div>
            <div className="relative flex-1" style={{ height: H }}>
              {[0, 0.5, 1].map((t) => (
                <span key={t} className="absolute inset-x-0 border-t border-white/10" style={{ bottom: t * H }} aria-hidden="true" />
              ))}
              <div className="absolute inset-0 flex items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
                {cols.map((c, i) => {
                  const segs = c.segs.filter((s) => s.value > 0)
                  return (
                    <button
                      key={c.day}
                      type="button"
                      onMouseEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      aria-label={`${dayLong(c.day)}: ${totals[i]} ${unit}`}
                      className="flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:bg-white/5"
                    >
                      <span
                        className="flex w-full max-w-[24px] flex-col-reverse gap-[2px] transition-opacity"
                        style={{ opacity: hover === null || hover === i ? 1 : 0.55 }}
                      >
                        {segs.map((s, k) => (
                          <span
                            key={s.label}
                            style={{
                              height: Math.max(3, (s.value / max) * H),
                              background: s.color,
                              borderRadius: k === segs.length - 1 ? "4px 4px 0 0" : 0,
                            }}
                          />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="ml-7 mt-1.5 flex gap-[3px] text-[11px] text-zinc-500" aria-hidden="true">
            {cols.map((c, i) => (
              <span key={c.day} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
                {(n - 1 - i) % 7 === 0 ? <span className={i === n - 1 ? "-ml-5 block" : "block"}>{dayShort(c.day)}</span> : null}
              </span>
            ))}
          </div>
          {hoverCol && hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-max max-w-[220px] rounded-xl border border-white/10 bg-surface-2 px-3 py-2 text-xs shadow-lg"
              style={
                hover < 5
                  ? { left: 36 }
                  : hover > n - 6
                    ? { right: 0 }
                    : { left: `calc(28px + (100% - 28px) * ${(hover + 0.5) / n})`, transform: "translateX(-50%)" }
              }
            >
              <p className="font-bold text-ink">{dayLong(hoverCol.day)}</p>
              {hoverCol.segs.map((s) => (
                <p key={s.label} className="mt-0.5 flex items-center gap-1.5 text-zinc-300">
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} aria-hidden="true" />
                  {s.label}: <span className="font-semibold tabular-nums text-ink">{s.value}</span>
                </p>
              ))}
              {hoverCol.segs.length > 1 && <p className="mt-1 text-zinc-400">Total: {totals[hover]}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-1 font-display text-2xl tabular-nums text-ink">{value}</dd>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{sub}</p>}
    </div>
  )
}

function RetentionKpi({ label, pair, soon }: { label: string; pair: Pair; soon: string }) {
  const p = pct(pair.returned, pair.eligible)
  return (
    <Kpi
      label={label}
      value={p === null ? "—" : `${p} %`}
      sub={p === null ? soon : `${pair.returned} de ${pair.eligible} ${pair.eligible === 1 ? "cuenta" : "cuentas"}`}
    />
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-sm font-black">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function AdminRetentionPage() {
  const [checking, setChecking] = useState(true)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState(false)

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
    supabase.rpc("admin_retention", { p_days: 60 }).then(({ data, error }) => {
      if (error || !data) setError(true)
      else setData(data as Data)
    })
  }, [checking])

  if (checking) {
    return (
      <AdminShell title="Retención">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const lastApp = data?.app.daily[data.app.daily.length - 1]
  const last7 = data?.app.daily.slice(-7) || []
  const appAvg7 = last7.length ? Math.round((last7.reduce((n, d) => n + d.app_people, 0) / last7.length) * 10) / 10 : 0
  const freqRows = data
    ? [
        { label: "1 día", n: data.freq.one },
        { label: "2 o 3 días", n: data.freq.few },
        { label: "4 a 7 días", n: data.freq.many },
        { label: "8 días o más", n: data.freq.lots },
      ]
    : []
  const freqTotal = freqRows.reduce((n, r) => n + r.n, 0)

  return (
    <AdminShell title="Retención" subtitle="¿Vuelve la gente? Cuentas registradas y app instalada, sin guardar nada en el móvil de nadie.">
      {error && (
        <div className="mb-6 rounded-2xl border border-warn/40 bg-warn/10 p-5 text-sm text-warn">
          Falta ejecutar supabase/51_retencion.sql en Supabase.
        </div>
      )}

      {!data && !error ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />
      ) : data ? (
        <>
          <h2 className="text-base font-black">Cuentas registradas</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Cuentas creadas en los últimos {data.cohort_days} días: {data.accounts}. «Vuelve» = abre la web con la sesión iniciada en otro día distinto al del registro. No cuenta tu cuenta de admin.
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <RetentionKpi label="Vuelven al día siguiente" pair={data.d1} soon="Aún no hay cuentas de ayer o antes" />
            <RetentionKpi label="Vuelven en la primera semana" pair={data.w1} soon="Aún no hay cuentas con 7 días" />
            <RetentionKpi label="Vuelven en el primer mes" pair={data.m1} soon="Aún no hay cuentas con 30 días" />
            <RetentionKpi label="Han vuelto alguna vez" pair={data.ever} soon="Aún no hay cuentas de ayer o antes" />
          </dl>
          {data.d1.eligible > 0 && data.d1.eligible < 20 && (
            <p className="mt-2 text-xs text-zinc-500">
              Con tan pocas cuentas el porcentaje baila mucho con una sola persona: fíjate en los números de «de N cuentas».
            </p>
          )}

          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Cuentas activas hoy" value={String(data.active_today)} />
            <Kpi label="Activas en 7 días" value={String(data.active_7d)} />
            <Kpi label="Activas en 30 días" value={String(data.active_30d)} />
            <Kpi label="Ya tenían cuenta antes de esta semana" value={String(data.old_active_7d)} sub="y han entrado en los últimos 7 días" />
          </dl>

          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Panel title="Cuentas activas cada día (30 días)">
              <DayColumns
                unit="cuentas activas"
                caption="Cuentas activas cada día en los últimos 30 días, separando las que ya existían de las que se crearon ese día"
                cols={data.daily.map((d) => ({
                  day: d.day,
                  segs: [
                    { label: "Ya tenían cuenta", value: d.back, color: C_BACK },
                    { label: "Cuenta creada ese día", value: d.fresh, color: C_NEW },
                  ],
                }))}
              />
              <p className="mt-3 text-[11px] text-zinc-500">El último día es hoy y aún no ha terminado.</p>
            </Panel>
            <Panel title="Cuántos días entra cada cuenta (30 días)">
              {freqTotal === 0 ? (
                <p className="text-sm text-zinc-500">Todavía nada.</p>
              ) : (
                <ul className="space-y-3">
                  {freqRows.map((r) => (
                    <li key={r.label}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-zinc-200">{r.label}</span>
                        <span className="tabular-nums text-zinc-400">{r.n}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(3, (r.n / freqTotal) * 100)}%`, background: C_BACK }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[11px] leading-snug text-zinc-500">Cuantas más cuentas en «2 días o más», más vuelve la gente.</p>
            </Panel>
          </div>

          <h2 className="mt-10 text-base font-black">App instalada</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Personas que abren Noctua desde el icono del móvil. Android avisa de cada instalación; iPhone no avisa de nada: allí solo se ve cuando alguien abre la web desde el icono.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Instalaciones confirmadas"
              value={String(data.app.installs_total)}
              sub={`${data.app.installs_30d} en los últimos 30 días · solo Android lo avisa`}
            />
            <Kpi label="Abren la app hoy" value={String(lastApp?.app_people ?? 0)} sub={`de ${lastApp?.all_people ?? 0} personas que visitan hoy`} />
            <Kpi label="Media diaria (7 días)" value={String(appAvg7).replace(".", ",")} sub="personas que abren la app cada día" />
            <Kpi
              label="Cuentas que usan la app"
              value={String(data.app.accounts)}
              sub={`${data.app.accounts_multi} la abren en 2 o más días distintos (30 días)`}
            />
          </dl>
          <div className="mt-4">
            <Panel title="Personas que abren la app cada día (30 días)">
              <DayColumns
                unit="personas con la app"
                caption="Personas distintas que abren la app instalada cada día en los últimos 30 días"
                cols={data.app.daily.map((d) => ({ day: d.day, segs: [{ label: "Abren la app", value: d.app_people, color: C_BACK }] }))}
              />
              <p className="mt-3 text-[11px] leading-snug text-zinc-500">
                Cada día se cuenta aparte: quien abre la app tres días seguidos suma una persona en cada uno. Si la barra sube semana a semana, la app engancha.
              </p>
            </Panel>
          </div>
        </>
      ) : null}
    </AdminShell>
  )
}
