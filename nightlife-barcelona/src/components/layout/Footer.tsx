"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "../../context/LanguageContext"
import { OPEN_CONSENT_EVENT } from "../../lib/consent"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="mt-20 border-t border-white/10 bg-night px-4 pb-28 pt-14 text-ink md:pb-14">
      <div className="mx-auto max-w-7xl">

        {/* Para locales: antes era un recuadro gris más, fácil de pasar por alto. Ahora es una banda
            destacada con el color de la marca, título, una frase de qué ganan y un botón claro. */}
        <a
          href="/para-locales"
          className="group mb-14 flex flex-col gap-5 overflow-hidden rounded-card border border-brand/40 p-6 transition hover:border-brand/70 sm:flex-row sm:items-center sm:justify-between sm:p-8"
          style={{ background: "linear-gradient(120deg, rgba(124,92,255,0.28) 0%, rgba(124,92,255,0.10) 55%, rgba(236,72,153,0.14) 100%)" }}
        >
          <div className="min-w-0">
            <p className="font-display text-xl leading-tight text-ink sm:text-2xl">{t("footer.venueTitle")}</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-200">{t("footer.venueText")}</p>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(124,92,255,0.9)] transition group-hover:bg-brand-strong sm:self-auto">
            {t("footer.venueButton")}
            <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </a>

        {/* Top row */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">

          {/* Brand */}
          <div>
            <Image src="/noctua_logo.png" alt="Noctua" width={160} height={98} className="h-10 w-auto object-contain" />
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="mb-4 text-sm font-semibold text-zinc-300">{t("footer.explore")}</p>
            <div className="flex flex-col gap-3">
              <Link href="/clubs" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.clubs")}</Link>
              <Link href="/events" className="text-sm text-zinc-400 transition hover:text-ink">
                {t("nav.events")}
                {EVENTS_HIDDEN && <span className="ml-2 rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-bold text-warn">{t("nav.soon")}</span>}
              </Link>
              <Link href="/essentials" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.essentials")}</Link>
              <Link href="/map" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.map")}</Link>
              <Link href="/plan" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.plan")}</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-sm font-semibold text-zinc-300">{t("footer.legal")}</p>
            <div className="flex flex-col gap-3">
              <Link href="/privacy" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_privacy")}</Link>
              <Link href="/terms" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_terms")}</Link>
              <Link href="/contact" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_contact")}</Link>
              <Link href="/faq" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_faq")}</Link>
              <Link href="/opinion" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_feedback")}</Link>
              {/* Vuelve a abrir el banner de cookies para cambiar la decisión */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
                className="text-left text-sm text-zinc-400 transition hover:text-ink"
              >
                {t("footer.link_cookies")}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex border-t border-white/10 pt-8 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-zinc-400">{t("footer.copyright")}</p>
          <p className="max-w-md text-xs text-zinc-400">
            {t("footer.privacy_note")}
          </p>
        </div>

      </div>
    </footer>
  )
}