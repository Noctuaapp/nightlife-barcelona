"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function BlockedPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked")
        .eq("id", data.session.user.id)
        .maybeSingle()
      if (!profile?.is_blocked) {
        router.replace("/")
        return
      }
      setChecking(false)
    }
    check()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-500">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-[36px] border border-red-500/20 bg-red-500/5 p-8 backdrop-blur-xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-3xl">
          🚫
        </div>
        <h1 className="mb-3 text-2xl font-bold">Cuenta suspendida</h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
          Tu cuenta de Noctua ha sido suspendida. Si crees que se trata de un error, contacta con
          nosotros y lo revisaremos.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="/contact"
            className="w-full rounded-2xl bg-white py-4 font-bold text-black transition hover:scale-[1.02]"
          >
            Contactar con soporte
          </a>
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 font-bold text-white transition hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  )
}
