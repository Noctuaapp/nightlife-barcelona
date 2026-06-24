"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useFavorites } from "../../context/FavoritesContext"
import { useLanguage } from "../../context/LanguageContext"

export default function ProfilePage() {
  const { favorites } = useFavorites()
  const { t } = useLanguage()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const [username, setUsername] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [usernameUpdatedAt, setUsernameUpdatedAt] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState("")
  const [usernameSuccess, setUsernameSuccess] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { window.location.href = "/login"; return }
      setEmail(data.user.email || "")

      const { data: profile } = await supabase.from("profiles").select("username, username_updated_at").eq("id", data.user.id).single()
      if (profile) {
        setUsername(profile.username || "")
        setNewUsername(profile.username || "")
        setUsernameUpdatedAt(profile.username_updated_at || null)
      }

      setLoading(false)
    }
    getUser()
  }, [])

  const canChangeUsername = () => {
    if (!usernameUpdatedAt) return true
    const lastChange = new Date(usernameUpdatedAt)
    const now = new Date()
    const daysDiff = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff >= 30
  }

  const daysUntilChange = () => {
    if (!usernameUpdatedAt) return 0
    const lastChange = new Date(usernameUpdatedAt)
    const now = new Date()
    const daysDiff = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
    return Math.ceil(30 - daysDiff)
  }

  const saveUsername = async () => {
    setUsernameError("")
    setUsernameSuccess("")
    if (!newUsername || newUsername.length < 3) { setUsernameError("Username must be at least 3 characters."); return }
    if (newUsername === username) { setEditingUsername(false); return }
    if (!canChangeUsername()) { setUsernameError(t("profile.days_until_change").replace("{days}", String(daysUntilChange()))); return }

    setSavingUsername(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { error } = await supabase.from("profiles").update({
      username: newUsername.toLowerCase().trim(),
      username_updated_at: new Date().toISOString(),
    }).eq("id", userData.user.id)

    setSavingUsername(false)

    if (error) {
      if (error.code === "23505") {
        setUsernameError("Username already taken. Try another one.")
      } else {
        setUsernameError(error.message)
      }
      return
    }

    setUsername(newUsername.toLowerCase().trim())
    setUsernameUpdatedAt(new Date().toISOString())
    setUsernameSuccess("Username updated successfully!")
    setEditingUsername(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const deleteAccount = async () => {
    setDeleteError("")
    if (email === "info@noctuaapp.com") { setDeleteError("Admin account cannot be deleted."); return }
    const confirmed = window.confirm("Are you sure you want to delete your account? This will remove your favorites and cannot be undone.")
    if (!confirmed) return
    setDeleting(true)
    const { error } = await supabase.rpc("delete_current_user")
    if (error) { setDeleteError(error.message); setDeleting(false); return }
    await supabase.auth.signOut()
    window.location.href = "/signup"
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("common.loading")}</p>
      </main>
    )
  }

  const initials = username ? username.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}
        <section className="relative overflow-hidden pt-14 pb-20 px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-3xl font-black text-white shadow-lg">
                {initials}
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight">
                {username ? `@${username}` : t("profile.title")}
              </h1>
              <p className="mt-2 text-zinc-400">{email}</p>
              <div className="mt-4 flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span className="text-sm text-purple-300">Noctua Member</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4">

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-3xl font-black text-white">{favorites.length}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{t("profile.favorites")}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-3xl font-black text-white">BCN</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Ciudad</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-3xl font-black text-white">🌙</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Night owl</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
              <Link href="/favorites" className="block">
                <p className="text-3xl font-black text-purple-400">→</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{t("profile.view_favorites")}</p>
              </Link>
            </div>
          </div>

          {/* Username */}
          <div className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">{t("profile.username")}</p>
                <h2 className="mt-2 text-2xl font-black">@{username || "—"}</h2>
              </div>
              {!editingUsername && canChangeUsername() && (
                <button
                  onClick={() => { setEditingUsername(true); setUsernameError(""); setUsernameSuccess("") }}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                >
                  {t("profile.change_username")}
                </button>
              )}
            </div>

            {editingUsername && (
              <div className="mt-6">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={t("profile.username")}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50"
                />
                <p className="mt-2 text-xs text-zinc-500">{t("profile.username_hint")}</p>
                {usernameError && <p className="mt-2 text-sm text-red-400">{usernameError}</p>}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={saveUsername}
                    disabled={savingUsername}
                    className="rounded-2xl bg-white px-6 py-3 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
                  >
                    {savingUsername ? t("profile.saving") : t("profile.save")}
                  </button>
                  <button
                    onClick={() => { setEditingUsername(false); setNewUsername(username); setUsernameError("") }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-white transition hover:bg-white/10"
                  >
                    {t("profile.cancel")}
                  </button>
                </div>
              </div>
            )}

            {!editingUsername && !canChangeUsername() && (
              <p className="mt-3 text-sm text-zinc-500">
                {t("profile.days_until_change").replace("{days}", String(daysUntilChange()))}
              </p>
            )}
            {usernameSuccess && <p className="mt-3 text-sm text-emerald-400">{usernameSuccess}</p>}
          </div>

          {/* Account */}
          <div className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">{t("profile.session")}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={logout}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
              >
                {t("profile.logout")}
              </button>
              <Link
                href="/profile/change-password"
                className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
              >
                {t("profile.change_password")}
              </Link>
            </div>
          </div>

          {/* Delete */}
          <div className="rounded-[32px] border border-red-500/20 bg-red-500/5 p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-red-400">{t("profile.danger")}</p>
              <p className="mt-1 text-xs text-red-300/70">{t("profile.delete_subtitle")}</p>
              {deleteError && <p className="mt-2 text-xs text-red-300">{deleteError}</p>}
            </div>
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
            >
              {deleting ? t("profile.deleting") : t("profile.delete")}
            </button>
          </div>

        </section>
      </main>
      <BottomNav />
    </>
  )
}