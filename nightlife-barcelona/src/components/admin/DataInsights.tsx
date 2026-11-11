"use client"

import { Compass, Filter, Globe2, Languages } from "lucide-react"
import { Panel, SectionTitle } from "./ui"
import {
  MIN_PEOPLE, browseSteps, countrySummary, languageRows, signupErrorRows, signupSteps, sourceRows,
  type CountryRow, type FunnelRow, type FunnelStep, type LanguageRow, type SignupErrorRow, type SourceQualityRow,
} from "../../lib/dataInsights"

// Paneles de Admin › Datos que usan supabase/88_datos_comparativas.sql (11/11/2026): del primer vistazo al registro,
// qué origen convierte y en qué idioma ven la web y de qué país vienen. Solo dibujan lo que ya viene calculado de lib/dataInsights.

const fmtPct = (v: number | null) => (v === null ? "—" : `${String(v).replace(".", ",")} %`)

function StepBar({ step, widthOf, note, tone = "bg-purple-500" }: { step: FunnelStep; widthOf: number; note: string | null; tone?: string }) {
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="min-w-0 text-zinc-200">{step.label}</span>
        <span className="shrink-0 tabular-nums">
          <span className="font-semibold text-ink">{step.n}</span>
          {note && <span className="ml-2 text-zinc-400">{note}</span>}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/5">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(step.n > 0 ? 2 : 0, widthOf)}%` }} />
      </div>
    </li>
  )
}

export function FunnelPanel({ browse, signup, errors }: { browse: FunnelRow[]; signup: FunnelRow[]; errors: SignupErrorRow[] }) {
  const b = browseSteps(browse)
  const s = signupSteps(signup)
  const top = Math.max(1, b[0]?.n || 0)
  const topSignup = Math.max(1, ...s.map((x) => x.n))
  const errRows = signupErrorRows(errors)
  return (
    <Panel accent="violet">
      <SectionTitle icon={Filter} accent="violet" className="mb-1">De la visita al registro</SectionTitle>
      <p className="mb-5 text-xs text-zinc-400">
        Personas = visitantes distintos (el código anónimo cambia cada día, así que quien vuelve otro día cuenta otra vez). Lo que va entre paréntesis es el porcentaje que pasa de un paso al siguiente.
      </p>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold text-zinc-300">Desde que llegan hasta que hacen algo</p>
          <ol className="space-y-3">
            {b.map((x, i) => (
              <StepBar key={x.key} step={x} widthOf={(x.n / top) * 100} note={i === 0 ? null : `(${fmtPct(x.ofPrev)} del anterior)`} />
            ))}
          </ol>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold text-zinc-300">Registro</p>
          <ol className="space-y-3">
            {s.map((x) => (
              <StepBar
                key={x.key}
                step={x}
                widthOf={(x.n / topSignup) * 100}
                note={x.ofFirst === null ? null : `(${fmtPct(x.ofFirst)} de los que abren)`}
                tone={x.key === "signup_error" ? "bg-red-400" : "bg-purple-500"}
              />
            ))}
          </ol>
          <p className="mt-3 text-xs text-zinc-500">
            Quien se registra con Google sale de la web y vuelve, así que «Envían el formulario» puede quedar por debajo de «Completan». Los pasos del registro no son una cadena estricta.
          </p>
        </div>
      </div>
      {errRows.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">Errores más frecuentes al registrarse</p>
          <ul className="space-y-1 text-xs text-zinc-300">
            {errRows.map((e) => (
              <li key={e.label} className="flex justify-between gap-3">
                <span>{e.label}</span>
                <span className="tabular-nums text-zinc-400">{e.n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

const SOURCE_COLS: { key: "ficha" | "clicked" | "intent" | "signed" | "bounced"; label: string }[] = [
  { key: "ficha", label: "Ven una ficha" },
  { key: "clicked", label: "Hacen clic" },
  { key: "intent", label: "Entradas / llegar / taxi" },
  { key: "signed", label: "Se registran" },
  { key: "bounced", label: "Rebotan" },
]

export function SourcePanel({ rows }: { rows: SourceQualityRow[] }) {
  const data = sourceRows(rows)
  const anySmall = data.some((r) => r.small)
  return (
    <Panel accent="pink">
      <SectionTitle icon={Compass} accent="pink" className="mb-1">Qué origen convierte</SectionTitle>
      <p className="mb-4 text-xs text-zinc-400">
        Por cada origen del tráfico, el porcentaje de sus visitantes que hace cada cosa. «Rebotan» = abren y no hacen nada más. Un origen con muchas visitas y pocos clics es tráfico que no sirve.
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin datos en este periodo.</p>
      ) : (
        <>
          {/* Móvil: una tarjeta por origen (una tabla de 7 columnas no cabe). */}
          <ul className="space-y-3 sm:hidden">
            {data.map((r) => (
              <li key={r.label} className={`rounded-xl border border-white/10 p-3 ${r.small ? "text-zinc-500" : "text-zinc-200"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-sm font-semibold">{r.label}{r.small ? " *" : ""}</span>
                  <span className="shrink-0 text-xs tabular-nums">{r.people} visitantes</span>
                </div>
                <dl className="mt-2 grid grid-cols-1 gap-y-1 text-xs">
                  {SOURCE_COLS.map((c) => (
                    <div key={c.key} className="flex justify-between gap-3">
                      <dt className="text-zinc-400">{c.label}</dt>
                      <dd className="font-semibold tabular-nums">{fmtPct(r[c.key])}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
          {/* Pantalla ancha: tabla. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-zinc-400">
                  <th className="px-2 py-2 text-left font-semibold">Origen</th>
                  <th className="px-2 py-2 text-right font-semibold">Visitantes</th>
                  {SOURCE_COLS.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-right font-semibold">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.label} className={`border-b border-white/5 ${r.small ? "text-zinc-500" : "text-zinc-200"}`}>
                    <td className="px-2 py-2 font-semibold">{r.label}{r.small ? " *" : ""}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.people}</td>
                    {SOURCE_COLS.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{fmtPct(r[c.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {anySmall && <p className="mt-3 text-xs text-zinc-500">* Menos de {MIN_PEOPLE} personas: con tan pocas, un solo visitante mueve mucho el porcentaje.</p>}
    </Panel>
  )
}

export function LanguagePanel({ rows }: { rows: LanguageRow[] }) {
  const data = languageRows(rows)
  const max = Math.max(1, ...data.map((r) => r.people))
  const anySmall = data.some((r) => r.small)
  return (
    <Panel accent="cyan">
      <SectionTitle icon={Languages} accent="cyan" className="mb-1">Idioma con el que ven la web</SectionTitle>
      <p className="mb-4 text-xs text-zinc-400">
        Todos los visitantes, con o sin cuenta. Es el idioma de la web que ven (el que eligen o el de su navegador), no su país: el país está en el panel de arriba.
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-zinc-400">Sin datos en este periodo.</p>
      ) : (
        <ol className="space-y-3">
          {data.map((r) => (
            <li key={r.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                <span className={`min-w-0 ${r.small ? "text-zinc-500" : "text-zinc-200"}`}>{r.label}{r.small ? " *" : ""}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold text-ink">{r.people}</span>
                  <span className="ml-2 text-zinc-400">{fmtPct(r.ficha)} ven una ficha · {fmtPct(r.clicked)} hacen clic</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${(r.people / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {anySmall && <p className="mt-3 text-xs text-zinc-500">* Menos de {MIN_PEOPLE} personas: los porcentajes no son fiables.</p>}
    </Panel>
  )
}

export function CountryPanel({ rows }: { rows: CountryRow[] }) {
  const sum = countrySummary(rows)
  const max = Math.max(1, ...sum.rows.map((r) => r.people))
  const anySmall = sum.rows.some((r) => r.small)
  const empty = sum.known === 0 && sum.unknown === 0
  return (
    <Panel accent="violet">
      <SectionTitle icon={Globe2} accent="violet" className="mb-1">De qué país nos visitan</SectionTitle>
      <p className="mb-4 text-xs text-zinc-400">
        Todos los visitantes, con o sin cuenta. El país sale de su conexión: solo se guarda el código de dos letras, nunca la IP ni la ciudad.
      </p>
      {empty ? (
        <p className="text-sm text-zinc-400">Sin datos en este periodo.</p>
      ) : sum.known === 0 ? (
        <p className="text-sm text-amber-300">
          Ninguna visita de este periodo tiene país. Solo se guarda desde que se ejecutó el SQL 89: si ya lo has ejecutado y pasan unas horas sin que aparezca nada, la base de datos no está recibiendo el país y hay que avisarme.
        </p>
      ) : (
        <ol className="space-y-3">
          {sum.rows.map((r) => (
            <li key={r.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                <span className={`min-w-0 ${r.small ? "text-zinc-500" : "text-zinc-200"}`}>{r.label}{r.small ? " *" : ""}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold text-ink">{r.people}</span>
                  <span className="ml-1 text-zinc-400">({fmtPct(r.share)})</span>
                  <span className="ml-2 text-zinc-400">{fmtPct(r.ficha)} ven una ficha · {fmtPct(r.clicked)} hacen clic</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${(r.people / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {sum.known > 0 && sum.unknown > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          {sum.unknown} {sum.unknown === 1 ? "persona" : "personas"} ({fmtPct(sum.unknownPct)}) sin país: visitas anteriores al SQL 89 o sin el dato. No entran en el reparto.
        </p>
      )}
      {anySmall && <p className="mt-2 text-xs text-zinc-500">* Menos de {MIN_PEOPLE} personas: los porcentajes no son fiables.</p>}
    </Panel>
  )
}
