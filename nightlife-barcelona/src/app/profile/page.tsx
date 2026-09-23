"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useFavorites } from "../../context/FavoritesContext"
import { useLanguage } from "../../context/LanguageContext"

const ACCENT_PATTERN = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g")

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(ACCENT_PATTERN, "").replace(/\s+/g, "-")

const timeAgo = (iso: string | null) => {
  if (!iso) return ""
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

const NOTIF_ICON: Record<string, string> = {
  reply: "💬",
  broadcast: "📢",
  favorite_reminder: "⏰",
}

const sortByPinned = <T extends { pinned?: boolean | null; created_at?: string | null }>(list: T[]): T[] =>
  [...list].sort((a, b) => {
    const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
    if (pinDiff !== 0) return pinDiff
    return (b.created_at || "").localeCompare(a.created_at || "")
  })

export default function ProfilePage() {
  const { favorites } = useFavorites()
  const { t } = useLanguage()

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [username, setUsername] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [usernameUpdatedAt, setUsernameUpdatedAt] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState("")
  const [usernameSuccess, setUsernameSuccess] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)

  const [calendarItems, setCalendarItems] = useState<any[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(true)

  const [inboxTab, setInboxTab] = useState<"notifications" | "messages">("notifications")
  const [notifHistory, setNotifHistory] = useState<any[]>([])
  const [sentMessages, setSentMessages] = useState<any[]>([])
  const [loadingInbox, setLoadingInbox] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { window.location.href = "/login"; return }
      setUserId(data.user.id)
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

  useEffect(() => {
    const loadCalendar = async () => {
      setLoadingCalendar(true)

      const eventIds = favorites.filter((f) => f.item_type === "event").map((f) => f.item_id)
      const clubEventIds = favorites.filter((f) => f.item_type === "club_event").map((f) => f.item_id)

      const [eventsRes, clubEventsRes] = await Promise.all([
        eventIds.length > 0 ? supabase.from("events").select("*").in("id", eventIds) : Promise.resolve({ data: [] as any[] }),
        clubEventIds.length > 0 ? supabase.from("club_events").select("*").in("id", clubEventIds) : Promise.resolve({ data: [] as any[] }),
      ])

      const merged = [
        ...(eventsRes.data || []).map((e: any) => ({
          id: e.id,
          kind: "event" as const,
          title: e.title,
          date: e.date,
          time: e.start_time,
          slug: createSlug(e.title || ""),
        })),
        ...(clubEventsRes.data || []).map((e: any) => ({
          id: e.id,
          kind: "club_event" as const,
          title: e.title || e.name || "Noche de club",
          date: e.date,
          time: e.start_time || e.time,
          slug: null,
        })),
      ]

      merged.sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      setCalendarItems(merged)
      setLoadingCalendar(false)
    }
    loadCalendar()
  }, [favorites])

  useEffect(() => {
    if (!userId || !email) return
    const loadInbox = async () => {
      setLoadingInbox(true)
      const [notifRes, messagesRes] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("contact_messages").select("*").eq("email", email).order("created_at", { ascending: false }).limit(50),
      ])
      setNotifHistory(sortByPinned(notifRes.data || []))
      setSentMessages(sortByPinned(messagesRes.data || []))
      setLoadingInbox(false)
    }
    loadInbox()
  }, [userId, email])

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

  const askDeleteAccount = () => {
    setDeleteError("")
    if (email === "info@noctuaapp.com") { setDeleteError("Admin account cannot be deleted."); return }
    setShowDeleteModal(true)
  }

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false)
    setDeleting(true)
    const { error } = await supabase.rpc("delete_current_user")
    if (error) { setDeleteError(error.message); setDeleting(false); return }
    await supabase.auth.signOut()
    window.location.href = "/signup"
  }

  const toggleNotifRead = async (id: number, current: boolean) => {
    const next = !current
    setNotifHistory((prev) => prev.map((n) => (n.id === id ? { ...n, read: next } : n)))
    await supabase.from("notifications").update({ read: next }).eq("id", id)
  }

  const toggleNotifPinned = async (id: number, current: boolean) => {
    const next = !current
    setNotifHistory((prev) => sortByPinned(prev.map((n) => (n.id === id ? { ...n, pinned: next } : n))))
    await supabase.from("notifications").update({ pinned: next }).eq("id", id)
  }

  const deleteNotif = async (id: number) => {
    setNotifHistory((prev) => prev.filter((n) => n.id !== id))
    await supabase.from("notifications").delete().eq("id", id)
  }

  const toggleMessagePinned = async (id: number, current: boolean) => {
    const next = !current
    setSentMessages((prev) => sortByPinned(prev.map((m) => (m.id === id ? { ...m, pinned: next } : m))))
    await supabase.from("contact_messages").update({ pinned: next }).eq("id", id)
  }

  const deleteMessage = async (id: number) => {
    const confirmed = window.confirm("¿Eliminar este mensaje? No se puede deshacer.")
    if (!confirmed) return
    setSentMessages((prev) => prev.filter((m) => m.id !== id))
    await supabase.from("contact_messages").delete().eq("id", id)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("common.loading")}</p>
      </main>
    )
  }

  const initials = username ? username.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()
  const today = new Date().toISOString().split("T")[0]
  const unreadCount = notifHistory.filter((n) => !n.read).length

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

          {/* Calendario de favoritos */}
          <div className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Tu calendario</p>
            {loadingCalendar ? (
              <p className="text-sm text-zinc-500">Cargando...</p>
            ) : calendarItems.length === 0 ? (
              <p className="text-sm text-zinc-500">Guarda eventos o noches de club en favoritos para verlos aquí.</p>
            ) : (
              <div className="space-y-3">
                {calendarItems.map((item) => {
                  const isPast = item.date ? item.date < today : false
                  const isToday = item.date === today
                  const dateLabel = item.date
                    ? new Date(item.date).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })
                    : "Fecha por confirmar"
                  const card = (
                    <div
                      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                        isPast ? "border-white/5 opacity-50" : isToday ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {isToday ? "🟢 Hoy" : dateLabel}{item.time ? ` · ${item.time}` : ""}
                        </p>
                      </div>
                      <span className="text-zinc-500">→</span>
                    </div>
                  )
                  return item.kind === "event" ? (
                    <Link key={`event-${item.id}`} href={`/event/${item.slug}`}>{card}</Link>
                  ) : (
                    <Link key={`club_event-${item.id}`} href="/favorites">{card}</Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* BUZON */}
          <div className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs uppercase tracking-widest text-zinc-500">📥 Buzón</p>
              {unreadCount > 0 && (
                <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-3 py-1 text-xs font-bold text-purple-300">
                  {unreadCount} sin leer
                </span>
              )}
            </div>

            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setInboxTab("notifications")}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  inboxTab === "notifications" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Notificaciones
              </button>
              <button
                onClick={() => setInboxTab("messages")}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  inboxTab === "messages" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Tus mensajes
              </button>
            </div>

            {loadingInbox ? (
              <p className="text-sm text-zinc-500">Cargando...</p>
            ) : inboxTab === "notifications" ? (
              notifHistory.length === 0 ? (
                <p className="text-sm text-zinc-500">Todavía no tienes notificaciones.</p>
              ) : (
                <div className="space-y-3">
                  {notifHistory.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-2xl border p-4 transition ${
                        n.pinned
                          ? "border-amber-400/40 bg-amber-400/[0.06]"
                          : n.read
                          ? "border-white/5 bg-white/[0.01]"
                          : "border-purple-500/20 bg-purple-500/[0.06]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => !n.read && toggleNotifRead(n.id, n.read)}
                          className="flex flex-1 items-start gap-3 text-left"
                        >
                          <span className="text-xl">{NOTIF_ICON[n.type] || "🔔"}</span>
                          <div>
                            <p className="font-bold text-white">{n.title}</p>
                            {n.body && <p className="mt-1 text-sm text-zinc-400">{n.body}</p>}
                          </div>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="text-xs text-zinc-500">{timeAgo(n.created_at)}</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleNotifPinned(n.id, !!n.pinned)}
                              title={n.pinned ? "Quitar prioridad" : "Marcar como prioritario"}
                              className={n.pinned ? "text-amber-400" : "text-zinc-600 hover:text-amber-300"}
                            >
                              📌
                            </button>
                            <button
                              onClick={() => toggleNotifRead(n.id, n.read)}
                              title={n.read ? "Marcar como no leído" : "Marcar como leído"}
                              className={n.read ? "text-zinc-600 hover:text-white" : "text-purple-400"}
                            >
                              {n.read ? "○" : "●"}
                            </button>
                            <button
                              onClick={() => deleteNotif(n.id)}
                              title="Eliminar"
                              className="text-zinc-600 hover:text-red-400"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : sentMessages.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Todavía no has enviado ningún mensaje. Puedes escribirnos desde{" "}
                <Link href="/contact" className="text-purple-300 underline">contacto</Link>.
              </p>
            ) : (
              <div className="space-y-3">
                {sentMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-4 ${
                      m.pinned ? "border-amber-400/40 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-white">{m.subject || "Mensaje enviado"}</p>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            m.reply ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-zinc-400"
                          }`}
                        >
                          {m.reply ? "Respondido" : "Pendiente"}
                        </span>
                        <button
                          onClick={() => toggleMessagePinned(m.id, !!m.pinned)}
                          title={m.pinned ? "Quitar prioridad" : "Marcar como prioritario"}
                          className={m.pinned ? "text-amber-400" : "text-zinc-600 hover:text-amber-300"}
                        >
                          📌
                        </button>
                        <button onClick={() => deleteMessage(m.id)} title="Eliminar" className="text-zinc-600 hover:text-red-400">
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{m.message}</p>
                    <p className="mt-2 text-xs text-zinc-600">{timeAgo(m.created_at)}</p>
                    {m.reply && (
                      <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <p className="text-xs uppercase tracking-widest text-emerald-400 mb-1">Respuesta de Noctua</p>
                        <p className="text-sm text-zinc-300">{m.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
              onClick={askDeleteAccount}
              disabled={deleting}
              className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
            >
              {deleting ? t("profile.deleting") : t("profile.delete")}
            </button>
          </div>

        </section>

        {showDeleteModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-[32px] border border-red-500/30 bg-[#111] p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-3xl">⚠️</div>
              <h2 className="mt-5 text-2xl font-black text-white">¿Eliminar tu cuenta?</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Esta acción es <span className="font-bold text-red-400">permanente</span>. Se borrarán tu perfil, tus favoritos y todo tu historial en Noctua. No podrás recuperarlo.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={confirmDeleteAccount}
                  disabled={deleting}
                  className="rounded-2xl bg-red-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? "Eliminando..." : "Sí, eliminar mi cuenta"}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </>
  )
}