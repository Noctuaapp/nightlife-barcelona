"use client"

import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="mt-20 border-t border-white/5 bg-black px-4 py-16 text-white">
      <div className="mx-auto max-w-7xl">

        {/* Top row */}
        <div className="grid gap-12 md:grid-cols-3">

          {/* Brand */}
          <div>
            <p className="text-xl font-black tracking-tight">🌙 Noctua</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              {t("footer.tagline")}
            </p>
            <a
              href="/contact?type=club_partnership"
              className="mt-5 inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-300 transition hover:bg-purple-500 hover:text-white"
            >
              {t("footer.venue_cta")}
            </a>
          </div>

          {/* Links */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">{t("footer.explore")}</p>
            <div className="flex flex-col gap-3">
              <Link href="/clubs" className="text-sm text-zinc-400 transition hover:text-white">{t("nav.clubs")}</Link>
              <Link href="/events" className="text-sm text-zinc-400 transition hover:text-white">{t("nav.events")}</Link>
              <Link href="/essentials" className="text-sm text-zinc-400 transition hover:text-white">{t("nav.essentials")}</Link>
              <Link href="/map" className="text-sm text-zinc-400 transition hover:text-white">{t("nav.map")}</Link>
              <Link href="/plan" className="text-sm text-zinc-400 transition hover:text-white">{t("nav.plan")}</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">{t("footer.legal")}</p>
            <div className="flex flex-col gap-3">
              <Link href="/privacy" className="text-sm text-zinc-400 transition hover:text-white">Privacy</Link>
              <Link href="/terms" className="text-sm text-zinc-400 transition hover:text-white">Terms</Link>
              <Link href="/contact" className="text-sm text-zinc-400 transition hover:text-white">Contact</Link>
              <Link href="/faq" className="text-sm text-zinc-400 transition hover:text-white">FAQ</Link>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-12 border-t border-white/5 pt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-zinc-600">{t("footer.copyright")}</p>
          <p className="text-xs text-zinc-600 max-w-md">
            {t("footer.privacy_note")}
          </p>
        </div>

      </div>
    </footer>
  )
}