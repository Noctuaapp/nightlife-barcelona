import type { Metadata } from "next"
import Link from "next/link"
import Header from "../components/layout/Header"
import BottomNav from "../components/layout/BottomNav"
import NocOwl from "../components/mascot/NocOwl"

// Página 404 propia. Antes Next.js mostraba su pantalla por defecto (fondo blanco, en inglés),
// que rompía por completo la estética y no ofrecía ninguna salida útil.
export const metadata: Metadata = {
  title: "Página no encontrada | Noctua",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex min-h-[70vh] items-center justify-center px-6 pb-32 pt-12 text-white">
        <div className="max-w-md text-center">
          <NocOwl size={96} mood="sleepy" className="mx-auto" />
          <h1 className="font-display mt-6 text-3xl leading-tight sm:text-4xl">Aquí no hay fiesta</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Esta página no existe o el local ya no está en Noctua. Puede que el enlace sea antiguo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/clubs"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              Ver clubs abiertos
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
