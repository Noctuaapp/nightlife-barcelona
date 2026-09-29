"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function ConfirmAgePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [confirmedAge, setConfirmedAge] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("terms_accepted_at")
        .eq("id", data.session.user.id)
        .maybeSingle()
      if (profile?.terms_accepted_at) {
        router.replace("/")
        return
      }
      setUserId(data.session.user.id)
      setChecking(false)
    }
    check()
  }, [router])

  const handleConfirm = async () => {
    setError("")
    if (!acceptedTerms || !confirmedAge) {
      setError("Debes marcar ambas casillas para continuar.")
      return
    }
    if (!userId) return
    setSaving(true)
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: userId,
      terms_accepted_at: new Date().toISOString(),
    })
    setSaving(false)
    if (upsertError) {
      setError(upsertError.message)
      return
    }
    router.replace("/")
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
      <div className="w-full max-w-md rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-400">Un último paso</p>
        <h1 className="mb-3 text-2xl font-bold">Antes de continuar</h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
          Para usar Noctua necesitamos que confirmes lo siguiente.
        </p>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-purple-500"
            />
            <span className="text-sm leading-relaxed text-zinc-400">
              Acepto los{" "}
              <a href="/terms" target="_blank" className="text-purple-400 transition hover:text-purple-300">
                términos y condiciones
              </a>{" "}
              y la{" "}
              <a href="/privacy" target="_blank" className="text-purple-400 transition hover:text-purple-300">
                política de privacidad
              </a>{" "}
              de Noctua, incluyendo el uso de mi ubicación para mostrar contenido relevante.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={confirmedAge}
              onChange={(e) => setConfirmedAge(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-purple-500"
            />
            <span className="text-sm leading-relaxed text-zinc-400">Confirmo que soy mayor de 18 años.</span>
          </label>
        </div>

        {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="mt-6 w-full rounded-2xl bg-white py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Continuar →"}
        </button>
      </div>
    </main>
  )
}
