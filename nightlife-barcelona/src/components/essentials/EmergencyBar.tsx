"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Phone, X, CarTaxiFront, Bus, Pill, Hospital, PawPrint, UtensilsCrossed, Toilet, Siren, PackageSearch, ChevronRight, type LucideIcon } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { categoryInfo } from "../../lib/essentialCategories"

// «Me ha pasado algo» (05/11/2026).
//
// Un único botón rojo (token `sos`) en la portada, con una nota con asterisco que explica para qué sirve: ese rojo
// es solo para esto (urgencia real). El 112 NO está suelto en la
// portada ni en el mapa para que nadie lo toque sin querer una noche de fiesta: vive dentro de la hoja, en una
// barra fija abajo (lejos de donde se pulsó para abrirla) y es un enlace `tel:112`, que no depende de la base
// de datos, de la ubicación ni de que haya cargado nada. La hoja tiene accesos rápidos a búsquedas que ya
// existen (categoría + «abierto ahora» + más cerca primero); no hay textos de ayuda propios que se queden
// anticuados. Un acceso solo aparece si su categoría tiene sitios publicados: no se enseñan atajos vacíos.
// No se guarda la ubicación ni se anota qué atajo se pulsa: lo que mida la analítica es la visita a la
// categoría a la que lleva.

type Shortcut = { key: string; href: string; icon: LucideIcon; title: string; hint: string }

export default function EmergencyBar({ counts }: { counts: Record<string, number> }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  // Un atajo solo sale si su categoría ya se enseña en la portada (tiene los sitios mínimos publicados).
  const has = (cat: string) => (counts[cat] || 0) >= categoryInfo(cat).minPlaces
  const slug = (cat: string) => categoryInfo(cat).slug

  const shortcuts: Shortcut[] = []
  // Volver a casa: el taxi si ya hay paradas publicadas; si no, el bus nocturno (siempre existe).
  const taxiReady = (counts.Taxi || 0) >= categoryInfo("Taxi").minPlaces
  shortcuts.push({
    key: "home",
    href: taxiReady ? `/essentials/${slug("Taxi")}?near=1` : `/essentials/${slug("Nitbus")}`,
    icon: taxiReady ? CarTaxiFront : Bus,
    title: t("essentialsHelp.home"),
    hint: t("essentialsHelp.homeHint"),
  })
  if (has("Pharmacy")) shortcuts.push({ key: "pharmacy", href: `/essentials/${slug("Pharmacy")}?now=1&near=1`, icon: Pill, title: t("essentialsHelp.pharmacy"), hint: t("essentialsHelp.pharmacyHint") })
  if (has("Hospital")) shortcuts.push({ key: "medical", href: `/essentials/${slug("Hospital")}?near=1`, icon: Hospital, title: t("essentialsHelp.medical"), hint: t("essentialsHelp.medicalHint") })
  if (has("Veterinary")) shortcuts.push({ key: "pet", href: `/essentials/${slug("Veterinary")}?near=1`, icon: PawPrint, title: t("essentialsHelp.pet"), hint: t("essentialsHelp.petHint") })
  if (has("Food")) shortcuts.push({ key: "food", href: `/essentials/${slug("Food")}?now=1&near=1`, icon: UtensilsCrossed, title: t("essentialsHelp.food"), hint: t("essentialsHelp.foodHint") })
  // Aseos, policía y objetos perdidos: sin «abierto ahora» (?now=1), porque hasta que alguien verifica su horario no cuentan
  // como abiertos y la lista saldría vacía. Se ordenan por cercanía y cada ficha dice si el horario está sin confirmar.
  if (has("Toilets")) shortcuts.push({ key: "toilets", href: `/essentials/${slug("Toilets")}?near=1`, icon: Toilet, title: t("essentialsHelp.toilets"), hint: t("essentialsHelp.toiletsHint") })
  if (has("Police")) shortcuts.push({ key: "police", href: `/essentials/${slug("Police")}?near=1`, icon: Siren, title: t("essentialsHelp.police"), hint: t("essentialsHelp.policeHint") })
  if (has("LostFound")) shortcuts.push({ key: "lost", href: `/essentials/${slug("LostFound")}?near=1`, icon: PackageSearch, title: t("essentialsHelp.lost"), hint: t("essentialsHelp.lostHint") })

  return (
    <>
      <section className="mx-auto mt-6 max-w-7xl px-4" aria-label={t("essentialsHelp.title")}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-pill flex items-center gap-3 bg-sos py-2 pl-2 pr-5 text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(225,29,72,0.85)] hover:bg-sos-strong"
          aria-haspopup="dialog"
          aria-describedby="sos-note"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sos">
            <Siren size={18} aria-hidden="true" />
          </span>
          <span>
            {t("essentialsHelp.button")}
            <span aria-hidden="true">*</span>
          </span>
        </button>
        <p id="sos-note" className="mt-2 max-w-md text-xs leading-snug text-zinc-400">
          * {t("essentialsHelp.buttonNote")}
        </p>
      </section>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={t("essentialsHelp.title")}>
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label={t("essentialsHelp.close")} />
          <div className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-card border border-white/10 bg-surface p-5 sm:max-w-lg sm:rounded-card">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-2xl leading-tight text-ink">{t("essentialsHelp.title")}</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-zinc-300 transition hover:text-ink" aria-label={t("essentialsHelp.close")}>
                <X size={20} />
              </button>
            </div>

            <ul className="mt-4 flex flex-col gap-2.5">
              {shortcuts.map((s) => {
                const Icon = s.icon
                return (
                  <li key={s.key}>
                    <Link href={s.href} className="flex items-center gap-4 rounded-card border border-white/10 bg-night/60 p-4 transition hover:border-white/25" onClick={() => setOpen(false)}>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-ink">
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">{s.title}</span>
                        <span className="mt-0.5 block text-xs text-zinc-400">{s.hint}</span>
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-zinc-400" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {[
                { n: "092", l: t("essentialsHelp.phone092") },
                { n: "088", l: t("essentialsHelp.phone088") },
              ].map((p) => (
                <a key={p.n} href={`tel:${p.n}`} className="flex items-center gap-3 rounded-card border border-white/10 bg-night/60 p-3 transition hover:border-white/25">
                  <Phone size={16} className="shrink-0 text-zinc-300" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-base font-bold tabular-nums text-ink">{p.n}</span>
                    <span className="block truncate text-xs text-zinc-400">{p.l}</span>
                  </span>
                </a>
              ))}
            </div>

            <div className="sticky -bottom-5 -mx-5 -mb-5 mt-5 border-t border-white/10 bg-surface px-5 pb-5 pt-4">
              <a href="tel:112" className="btn-pill flex w-full items-center justify-center gap-2 bg-sos px-5 py-3.5 text-base font-semibold text-white hover:bg-sos-strong">
                <Phone size={18} aria-hidden="true" /> {t("essentialsHelp.call112")}
              </a>
              <p className="mt-2 text-xs leading-snug text-zinc-400">{t("essentialsHelp.note")}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
