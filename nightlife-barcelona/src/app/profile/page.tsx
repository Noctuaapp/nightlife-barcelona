"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { supabase } from "../../lib/supabase"
import { useFavorites } from "../../context/FavoritesContext"

export default function ProfilePage() {
  const { favorites } = useFavorites()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        window.location.href = "/login"
        return
      }

      setEmail(data.user.email || "")
      setLoading(false)
    }

    getUser()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Loading profile...
        </p>
      </main>
    )
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="mx-auto max-w-5xl px-4 pt-14">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Account
          </p>

          <h1 className="mt-4 text-6xl font-black tracking-tight">
            Your profile
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-zinc-400">
            Manage your Noctua account, favorites and session.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Email
              </p>

              <h2 className="mt-4 break-all text-2xl font-black">
                {email}
              </h2>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Favorites
              </p>

              <h2 className="mt-4 text-5xl font-black">
                {favorites.length}
              </h2>

              <Link
                href="/favorites"
                className="mt-6 inline-block rounded-full bg-white px-5 py-3 text-sm font-bold text-black"
              >
                View favorites
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Session
            </p>

            <h2 className="mt-4 text-3xl font-black">
              Logout
            </h2>

            <p className="mt-4 text-zinc-400">
              Sign out from this device. You can log back in whenever you want.
            </p>

            <button
              onClick={logout}
              className="mt-6 rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
            >
              Log out
            </button>
          </div>

          <div className="mt-6 rounded-[32px] border border-red-500/20 bg-red-500/10 p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-red-300">
              Danger zone
            </p>

            <h2 className="mt-4 text-3xl font-black text-white">
              Delete account
            </h2>

            <p className="mt-4 text-red-100/80">
              Account deletion will be added soon. For now, contact Noctua support if you need your account removed.
            </p>

            <button
              disabled
              className="mt-6 cursor-not-allowed rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 font-bold text-red-300 opacity-60"
            >
              Delete account coming soon
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </>
  )
}