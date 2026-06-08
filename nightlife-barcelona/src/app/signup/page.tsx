"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const signup = async () => {
    setError("")

    if (!email || !password) {
      setError("Please enter your email and password.")
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    window.location.href = "/login"
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Noctua
        </p>

        <h1 className="mt-4 text-4xl font-black">
          Create account
        </h1>

        <p className="mt-3 text-zinc-400">
          Save your favorite clubs, events and nights across Barcelona.
        </p>

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
          onClick={signup}
          className="mt-6 w-full rounded-2xl bg-white px-6 py-4 font-bold text-black"
        >
          Create account
        </button>

        <Link
          href="/login"
          className="mt-5 block text-center text-sm font-bold text-zinc-400 hover:text-white"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </main>
  )
}