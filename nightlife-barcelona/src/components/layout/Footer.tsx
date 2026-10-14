"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "../../context/LanguageContext"

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="mt-20 border-t border-white/10 bg-night px-4 pb-28 pt-14 text-ink md:pb-14">
      <div className="mx-auto max-w-7xl">

        {/* ¿Tienes un club? — destacado arriba del todo del footer */}
        <div className="mb-12 overflow-hidden rounded-2xl p-[1px]" style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}>
          <div className="flex flex-col gap-5 rounded-2xl bg-night/90 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="min-w-0">
              <p className="text-xl font-black leading-tight text-white sm:text-2xl">🪩 {t("footer.venueTitle")}</p>
              <p className="mt-2 text-sm text-zinc-300">{t("footer.venueText")}</p>
            </div>
            <Link
              href="/contact?type=club_partnership"
              className="shrink-0 rounded-full px-7 py-3.5 text-center text-sm font-black text-white shadow-[0_8px_24px_-6px_rgba(236,72,153,0.6)] transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
            >
              {t("footer.venueButton")}
            </Link>
          </div>
        </div>

        {/* Explorar a la izquierda, marca en el centro, Legal a la derecha (en el móvil, la marca
            arriba y las dos columnas debajo, una a cada lado). */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1fr_auto_1fr] md:items-start">
          <div className="col-span-2 mx-auto flex max-w-sm flex-col items-center text-center md:order-2 md:col-span-1">
            <Image src="/noctua_logo.png" alt="Noctua" width={160} height={98} className="h-12 w-auto object-contain" />
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">{t("footer.tagline")}</p>
          </div>

          <div className="text-left md:order-1">
            <p className="mb-4 text-sm font-semibold text-zinc-300">{t("footer.explore")}</p>
            <div className="flex flex-col gap-3">
              <Link href="/clubs" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.clubs")}</Link>
              <Link href="/events" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.events")}</Link>
              <Link href="/essentials" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.essentials")}</Link>
              <Link href="/map" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.map")}</Link>
              <Link href="/plan" className="text-sm text-zinc-400 transition hover:text-ink">{t("nav.plan")}</Link>
            </div>
          </div>

          <div className="text-right md:order-3">
            <p className="mb-4 text-sm font-semibold text-zinc-300">{t("footer.legal")}</p>
            <div className="flex flex-col items-end gap-3">
              <Link href="/privacy" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_privacy")}</Link>
              <Link href="/terms" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_terms")}</Link>
              <Link href="/contact" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_contact")}</Link>
              <Link href="/faq" className="text-sm text-zinc-400 transition hover:text-ink">{t("footer.link_faq")}</Link>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/10 pt-8 text-center">
          <p className="text-xs text-zinc-400">{t("footer.copyright")}</p>
          <p className="max-w-md text-xs text-zinc-400">
            {t("footer.privacy_note")}
          </p>
        </div>

      </div>
    </footer>
  )
}