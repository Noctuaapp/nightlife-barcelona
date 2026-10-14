"use client"

import { useEffect } from "react"
import Link from "next/link"
import NocOwl from "../components/mascot/NocOwl"

// Pantalla de error propia. Antes un fallo inesperado (Supabase caído, un dato roto en un club...)
// mostraba la pantalla genérica de Next.js en inglés, sin forma de volver.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-6 py-16 text-white">
      <div className="max-w-md text-center">
        <NocOwl size={88} mood="wow" className="mx-auto" />
        <h1 className="font-display mt-6 text-3xl leading-tight">Algo ha fallado</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          No hemos podido cargar esta página. Suele ser algo puntual: vuelve a intentarlo en unos segundos.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => unstable_retry()}
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Ir al inicio
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-[11px] text-zinc-600">Código: {error.digest}</p>}
      </div>
    </main>
  )
}
