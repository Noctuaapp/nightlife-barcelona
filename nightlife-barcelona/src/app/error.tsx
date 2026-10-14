"use client"

import { useEffect } from "react"
import Link from "next/link"
import NocOwl from "../components/mascot/NocOwl"
import { useLanguage } from "../context/LanguageContext"

// Pantalla de error propia. Antes un fallo inesperado (Supabase caído, un dato roto en un club...)
// mostraba la pantalla genérica de Next.js en inglés, sin forma de volver.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const { t } = useLanguage()
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-night px-6 py-16 text-ink">
      <div className="max-w-md text-center">
        <NocOwl size={88} mood="wow" className="mx-auto" />
        <h1 className="font-display mt-6 text-3xl leading-tight">{t("errorPage.title")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">{t("errorPage.body")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => unstable_retry()}
            className="rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
          >
            {t("errorPage.retry")}
          </button>
          <Link
            href="/"
            className="rounded-ctl border border-white/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"
          >
            {t("notFound.home")}
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-xs text-zinc-400">{t("errorPage.code")}: {error.digest}</p>}
      </div>
    </main>
  )
}
