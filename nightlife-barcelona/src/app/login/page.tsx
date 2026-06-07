"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("info@noctuaapp.com")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const login = async () => {
    setError("")

    if (email !== "info@noctuaapp.com") {
      setError("Unauthorized admin email")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    window.location.href = "/admin"
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Noctua Admin
        </p>

        <h1 className="mt-4 text-4xl font-black">
          Login
        </h1>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-8 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
          placeholder="Email"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
          placeholder="Password"
        />

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={login}
          className="mt-6 w-full rounded-2xl bg-white px-6 py-4 font-bold text-black"
        >
          Enter admin
        </button>
      </div>
    </main>
  )
}