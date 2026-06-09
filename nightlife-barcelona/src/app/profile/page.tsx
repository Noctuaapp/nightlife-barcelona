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
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

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

  const deleteAccount = async () => {
    setDeleteError("")

    if (email === "info@noctuaapp.com") {
      setDeleteError("Admin account cannot be deleted.")
      return
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This will remove your favorites and cannot be undone."
    )

    if (!confirmed) return

    setDeleting(true)

    const { error } = await supabase.rpc("delete_current_user")

    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    window.location.href = "/signup"
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

            <div className="mt-6 flex flex-wrap gap-4">
  <button
    onClick={logout}
    className="rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
  >
    Log out
  </button>

  <Link
    href="/profile/change-password"
    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white hover:text-black"
  >
    Change password
  </Link>
</div>
          </div>

          <div className="mt-6 rounded-[32px] border border-red-500/20 bg-red-500/10 p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-red-300">
              Danger zone
            </p>

            <h2 className="mt-4 text-3xl font-black text-white">
              Delete account
            </h2>

            <p className="mt-4 text-red-100/80">
              Permanently delete your Noctua account and remove your saved favorites. This action cannot be undone.
            </p>

            {deleteError && (
              <p className="mt-4 text-sm font-bold text-red-300">
                {deleteError}
              </p>
            )}

            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/20 px-6 py-4 font-bold text-red-200 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting account..." : "Delete account"}
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </>
  )
}