"use client"

import Link from "next/link"
import NocOwl from "../mascot/NocOwl"
import { useLanguage } from "../../context/LanguageContext"

export default function NotFoundContent() {
  const { t } = useLanguage()
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-night px-6 pb-32 pt-12 text-ink">
      <div className="max-w-md text-center">
        <NocOwl size={96} mood="sleepy" className="mx-auto" />
        <h1 className="font-display mt-6 text-3xl leading-tight sm:text-4xl">{t("notFound.title")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">{t("notFound.body")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/clubs" className="rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong">
            {t("notFound.clubs")}
          </Link>
          <Link href="/" className="rounded-ctl border border-white/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/5">
            {t("notFound.home")}
          </Link>
        </div>
      </div>
    </main>
  )
}
