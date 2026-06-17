"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

const countries = [
  { code: "ES", name: "España" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "US", name: "United States" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "PL", name: "Poland" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "BR", name: "Brazil" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "KR", name: "South Korea" },
  { code: "OTHER", name: "Other" },
]

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [country, setCountry] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const isVisitor = country !== "" && country !== "ES"

  const signup = async () => {
    setError("")
    if (!email || !password || !username) { setError("Please fill in all fields."); return }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return }
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.toLowerCase().trim(),
        country: country || null,
      })
      if (profileError) {
        if (profileError.code === "23505") {
          setError("Username already taken. Try another one.")
        } else {
          setError(profileError.message)
        }
        setLoading(false)
        return
      }
    }

    setLoading(false)
    window.location.href = "/login"
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/favorites` },
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Noctua</p>
        <h1 className="mt-4 text-4xl font-black">Create account</h1>
        <p className="mt-3 text-zinc-400">Save your favorite clubs, events and nights across Barcelona.</p>

        <button
          onClick={loginWithGoogle}
          className="mt-8 w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
          placeholder="Username"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
          placeholder="Email"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
          placeholder="Password"
        />

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none text-white"
          style={{ color: country === "" ? "rgba(255,255,255,0.4)" : "#fff" }}
        >
          <option value="" disabled>Where are you from?</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code} style={{ background: "#000" }}>{c.name}</option>
          ))}
        </select>

        {/* Visitor warning */}
        {isVisitor && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-bold text-white mb-2">🌍 Welcome to Barcelona!</p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Barcelona is one of Europe's most vibrant and beautiful cities, with an incredible nightlife, amazing food and a unique Mediterranean atmosphere. We're happy to have you here!
            </p>
            <p className="text-sm text-amber-300 leading-relaxed mt-3">
              ⚠️ One thing to keep in mind: Barcelona has high rates of pickpocketing in busy areas. Keep your phone and wallet secure, especially in the metro, Las Ramblas and crowded clubs.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          onClick={signup}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <Link href="/login" className="mt-5 block text-center text-sm font-bold text-zinc-400 hover:text-white">
          Already have an account? Sign in
        </Link>
      </div>
    </main>
  )
}