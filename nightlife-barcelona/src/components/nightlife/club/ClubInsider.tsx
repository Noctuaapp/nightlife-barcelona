"use client"

import Icon from "../../ui/Icon"
import NocOwl from "../../mascot/NocOwl"
import { InlineEditText } from "../../admin/InlineEdit"
import { useLanguage } from "../../../context/LanguageContext"
import { clubInsider, hasInsider } from "../../../lib/clubInsider"

// Bloque «Antes de ir» (29/10/2026): lo que alguien quiere saber antes de salir y que no cabe en
// los datos prácticos — lo mejor del sitio, a qué hay que ir con ojo, hora punta, para quién es y
// un consejo de Noc. Son campos de texto de la tabla clubs (supabase/52_antes_de_ir.sql).
//
// Regla de la casa: vacío antes que inventado. Quien visita solo ve lo que alguien ha escrito (y
// nada si no hay nada). El admin, o el dueño de esta ficha, ve debajo un recuadro para escribirlo
// tocando el texto, igual que la descripción. El texto va en español (no hay traducción); lo que
// se traduce son los títulos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Club = Record<string, any>

function EditRow({ club, field, label, multiline = false, hint }: { club: Club; field: string; label: string; multiline?: boolean; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-zinc-400">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-200">
        <InlineEditText table="clubs" id={club.id} field={field} value={club[field]} multiline={multiline} emptyLabel="añadir" />
      </p>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  )
}

export default function ClubInsider({ club, isAdmin }: { club: Club; isAdmin: boolean }) {
  const { t } = useLanguage()
  const data = clubInsider(club)
  const filled = hasInsider(club)
  if (!filled && !isAdmin) return null

  const facts = [
    data.peak && { key: "peak", icon: "clock", label: t("clubPage.insiderPeak"), value: data.peak },
    data.audience && { key: "audience", icon: "users", label: t("clubPage.insiderAudience"), value: data.audience },
  ].filter(Boolean) as { key: string; icon: string; label: string; value: string }[]

  return (
    <div className="rounded-card border border-white/10 bg-surface p-6 sm:p-7">
      <h2 className="mb-5 text-lg font-semibold text-ink">{t("clubPage.insiderTitle")}</h2>

      {filled && (
        <div className="space-y-5">
          {facts.length > 0 && (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.key} className="flex items-start gap-3 rounded-ctl border border-white/10 px-4 py-3">
                  <Icon name={f.icon} className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                  <div className="min-w-0">
                    <dt className="text-xs text-zinc-400">{f.label}</dt>
                    <dd className="mt-0.5 break-words text-sm font-semibold leading-snug text-ink">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}

          {(data.best.length > 0 || data.watch.length > 0) && (
            <div className={`grid grid-cols-1 gap-6 ${data.best.length > 0 && data.watch.length > 0 ? "sm:grid-cols-2" : ""}`}>
              {data.best.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-ink">{t("clubPage.insiderBest")}</h3>
                  <ul className="mt-3 space-y-2.5">
                    {data.best.map((line, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-200">
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-open" />
                        <span className="min-w-0 break-words">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.watch.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-ink">{t("clubPage.insiderWatch")}</h3>
                  <ul className="mt-3 space-y-2.5">
                    {data.watch.map((line, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-200">
                        <Icon name="flag" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                        <span className="min-w-0 break-words">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {data.tip && (
            <div className="flex items-start gap-3 rounded-ctl border border-brand/30 bg-brand/[0.08] p-4">
              <div className="shrink-0 rounded-full bg-white/[0.06] p-1">
                <NocOwl size={30} mood="wink" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-soft">{t("clubPage.insiderTip")}</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-zinc-100">{data.tip}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className={`rounded-ctl border border-dashed border-purple-400/40 bg-purple-500/[0.05] p-4 ${filled ? "mt-5" : ""}`}>
          <p className="mb-3 text-xs font-semibold text-purple-200">
            Escribe solo lo que hayas comprobado. Lo vacío no se enseña, y si todo está vacío el bloque no sale.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditRow club={club} field="peak_hours" label={t("clubPage.insiderPeak")} />
            <EditRow club={club} field="audience" label={t("clubPage.insiderAudience")} />
            <EditRow club={club} field="highlights" label={t("clubPage.insiderBest")} multiline hint="Una frase por línea (máximo 5)." />
            <EditRow club={club} field="watchouts" label={t("clubPage.insiderWatch")} multiline hint="Una frase por línea (máximo 5)." />
            <div className="sm:col-span-2">
              <EditRow club={club} field="tip" label={t("clubPage.insiderTip")} multiline />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
