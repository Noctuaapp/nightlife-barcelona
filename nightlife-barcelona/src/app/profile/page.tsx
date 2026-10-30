"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { isAdminEmail } from "../../lib/admin"
import { useFavorites } from "../../context/FavoritesContext"
import { useLanguage } from "../../context/LanguageContext"
import { getLevelStatus } from "../../lib/xp"
import { Heart, Trophy, CalendarDays, Gift, Building2, Music2, Camera, Pin, Trash2, MessageSquare, Megaphone, AlarmClock, Bell, ChevronRight } from "lucide-react"
import BirthYearSelect from "../../components/ui/BirthYearSelect"
import CountrySelect from "../../components/ui/CountrySelect"
import { createSlug } from "../../lib/slug"
import { toDateLocale } from "../../lib/dateLocale"
import { ADMIN_EMAIL } from "../../lib/admin"
import NocOwl from "../../components/mascot/NocOwl"
import DeniedVenuesCard from "../../components/profile/DeniedVenuesCard"
import InstallAppButton from "../../components/system/InstallAppButton"
import LoginWall from "../../components/ui/LoginWall"
import Image from "next/image"

// Perfil. Rehecho tras la auditoría de octubre 2026: fuera las cifras de relleno ("BCN · Ciudad",
// "🌙 Night owl", "Noctua Member") y los emojis como iconos; arriba, el acceso a todo lo de "tu
// noche" (favoritos, Club Noctua, tu mes, invitar), que antes estaba repartido por la app.

const timeAgo = (iso: string | null, t: (k: string) => string, locale: string) => {
  if (!iso) return ""
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return t("time.now")
  if (mins < 60) return t("time.minutes").replace("{n}", String(mins))
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t("time.hours").replace("{n}", String(hours))
  const days = Math.floor(hours / 24)
  if (days < 7) return t("time.days").replace("{n}", String(days))
  return new Date(iso).toLocaleDateString(toDateLocale(locale), { day: "numeric", month: "short" })
}

const NOTIF_ICON: Record<string, typeof Bell> = {
  reply: MessageSquare,
  broadcast: Megaphone,
  favorite_reminder: AlarmClock,
}

// Los avisos "broadcast" son UNA fila compartida por todos los usuarios (user_id = null), así
// que su estado de leído/prioridad/borrado no puede escribirse en esa fila en Supabase — eso
// cambiaría el aviso para todo el mundo. En vez de eso, cada persona guarda su propio estado en
// su navegador. Usa las mismas claves que el badge de notificaciones del Header, así los dos
// sitios están siempre de acuerdo sobre qué avisos ha leído.
const readBroadcastIds = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem("noctua_read_broadcasts") || "[]")
  } catch { return [] }
}
const pinnedBroadcastIds = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem("noctua_pinned_broadcasts") || "[]")
  } catch { return [] }
}
const hiddenBroadcastIds = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem("noctua_hidden_broadcasts") || "[]")
  } catch { return [] }
}
const addToLocalIdSet = (key: string, id: number) => {
  try {
    const current: number[] = JSON.parse(localStorage.getItem(key) || "[]")
    if (!current.includes(id)) localStorage.setItem(key, JSON.stringify([...current, id]))
  } catch {}
}
const removeFromLocalIdSet = (key: string, id: number) => {
  try {
    const current: number[] = JSON.parse(localStorage.getItem(key) || "[]")
    localStorage.setItem(key, JSON.stringify(current.filter((x) => x !== id)))
  } catch {}
}

const sortByPinned = <T extends { pinned?: boolean | null; created_at?: string | null }>(list: T[]): T[] =>
  [...list].sort((a, b) => {
    const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
    if (pinDiff !== 0) return pinDiff
    return (b.created_at || "").localeCompare(a.created_at || "")
  })

function ProfileInner() {
  const { favorites } = useFavorites()
  const { t, locale } = useLanguage()
  const ago = (iso: string | null) => timeAgo(iso, t, locale)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [username, setUsername] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [birthYearMsg, setBirthYearMsg] = useState("")
  // «Sobre ti» (27/10/2026): género y país, opcionales. Ya no se piden al registrarse.
  const [gender, setGender] = useState("")
  const [country, setCountry] = useState("")
  const [aboutMsg, setAboutMsg] = useState("")
  const [usernameUpdatedAt, setUsernameUpdatedAt] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState("")
  const [usernameSuccess, setUsernameSuccess] = useState("")
  const [savingUsername, setSavingUsername] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [xp, setXp] = useState(0)
  const [loginStreakDays, setLoginStreakDays] = useState(0)
  // Nivel efectivo gateado por tiempo (profiles.level_key/level_since). Null hasta que se ejecute
  // supabase/9_niveles_y_moderacion.sql o si la consulta falla por cualquier motivo — en ese caso
  // getLevelStatus cae de vuelta al cálculo de nivel puro por XP, sin romper nada.
  const [levelKey, setLevelKey] = useState<string | null>(null)
  const [levelSince, setLevelSince] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState("")

  const [calendarItems, setCalendarItems] = useState<any[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(true)

  const [recentVisits, setRecentVisits] = useState<any[]>([])
  const [loadingVisits, setLoadingVisits] = useState(true)

  const [inboxTab, setInboxTab] = useState<"notifications" | "messages">("notifications")
  const [notifHistory, setNotifHistory] = useState<any[]>([])
  const [sentMessages, setSentMessages] = useState<any[]>([])
  const [loadingInbox, setLoadingInbox] = useState(true)

  // Los botones "Mi club" / "Mis festivales" solo se enseñan a quien de verdad tiene algo
  // vinculado a su cuenta (owner_user_id en clubs / events) — mostrarlos a todo el mundo solo
  // generaría confusión y mensajes de gente que no es dueña de nada. Las noches de club no
  // llevan link propio aquí: se gestionan dentro de /mi-club, ligadas al club.
  const [hasLinkedClub, setHasLinkedClub] = useState(false)
  const [hasLinkedFestival, setHasLinkedFestival] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { window.location.href = "/login"; return }
      setUserId(data.user.id)
      setEmail(data.user.email || "")

      const { data: profile } = await supabase.from("profiles").select("username, username_updated_at, avatar_url, xp, birth_year, login_streak_days, gender, country").eq("id", data.user.id).single()
      if (profile) {
        setUsername(profile.username || "")
        setNewUsername(profile.username || "")
        setUsernameUpdatedAt(profile.username_updated_at || null)
        // La cuenta oficial de Noctua lleva el logo como foto si no se ha subido otra.
        setAvatarUrl(profile.avatar_url || (isAdminEmail(data.user.email) ? "/noctua_logo.png" : null))
        setXp(profile.xp || 0)
        setBirthYear(profile.birth_year ? String(profile.birth_year) : "")
        setGender(profile.gender || "")
        setCountry(profile.country || "")
        setLoginStreakDays(profile.login_streak_days || 0)
      }

      // Consulta aparte y a propósito: si las columnas level_key/level_since todavía no existen
      // (no se ha ejecutado supabase/9_niveles_y_moderacion.sql), esta llamada falla sola sin
      // tumbar el resto de la página — getLevelStatus ya sabe comportarse igual que antes sin ellas.
      try {
        const { data: levelData, error: levelError } = await supabase
          .from("profiles")
          .select("level_key, level_since")
          .eq("id", data.user.id)
          .maybeSingle()
        if (!levelError && levelData) {
          setLevelKey(levelData.level_key || null)
          setLevelSince(levelData.level_since || null)
        }
      } catch {}

      const [{ data: ownedClub }, { data: ownedFestival }] = await Promise.all([
        supabase.from("clubs").select("id").eq("owner_user_id", data.user.id).maybeSingle(),
        supabase.from("events").select("id").eq("owner_user_id", data.user.id).limit(1).maybeSingle(),
      ])
      setHasLinkedClub(!!ownedClub)
      setHasLinkedFestival(!!ownedFestival)

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
          slug: e.slug || createSlug(e.title || ""),
        })),
        ...(clubEventsRes.data || []).map((e: any) => ({
          id: e.id,
          kind: "club_event" as const,
          title: e.title || e.name || t("clubEvent.defaultClubName"),
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
    if (!userId) return
    const loadRecentVisits = async () => {
      setLoadingVisits(true)
      // Traemos más de la cuenta porque un mismo club/evento puede aparecer varias veces
      // (visitas repetidas) — nos quedamos solo con la más reciente de cada uno.
      const { data } = await supabase
        .from("analytics")
        .select("item_type, item_id, item_name, created_at")
        .eq("user_id", userId)
        .eq("event_type", "page_view")
        .order("created_at", { ascending: false })
        .limit(40)

      const seen = new Set<string>()
      const unique: any[] = []
      for (const row of data || []) {
        const key = `${row.item_type}-${row.item_id}`
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(row)
        if (unique.length >= 6) break
      }
      setRecentVisits(unique)
      setLoadingVisits(false)
    }
    loadRecentVisits()
  }, [userId])

  useEffect(() => {
    if (!userId || !email) return
    const loadInbox = async () => {
      setLoadingInbox(true)
      const [notifRes, messagesRes] = await Promise.all([
        // Antes esto era .eq("user_id", userId), lo que excluía los avisos "broadcast" del admin
        // (user_id = null) — nunca aparecían en el buzón de nadie. Con .or() se incluyen también.
        supabase.from("notifications").select("*").or(`user_id.eq.${userId},user_id.is.null`).order("created_at", { ascending: false }).limit(50),
        supabase.from("contact_messages").select("*").eq("email", email).order("created_at", { ascending: false }).limit(50),
      ])

      const readIds = readBroadcastIds()
      const pinnedIds = pinnedBroadcastIds()
      const hiddenIds = hiddenBroadcastIds()
      const withLocalState = (notifRes.data || [])
        .filter((n: any) => n.type !== "broadcast" || !hiddenIds.includes(n.id))
        .map((n: any) => (n.type === "broadcast" ? { ...n, read: readIds.includes(n.id), pinned: pinnedIds.includes(n.id) } : n))

      setNotifHistory(sortByPinned(withLocalState))
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

  const saveBirthYear = async (v: string) => {
    setBirthYear(v)
    setBirthYearMsg("")
    if (!userId) return
    const { error } = await supabase.from("profiles").update({ birth_year: v ? Number(v) : null }).eq("id", userId)
    setBirthYearMsg(error ? t("profilePage.saveError") : t("profilePage.saved"))
  }

  const saveAbout = async (field: "gender" | "country", value: string) => {
    if (field === "gender") setGender(value)
    else setCountry(value)
    setAboutMsg("")
    if (!userId) return
    const { error } = await supabase.from("profiles").update({ [field]: value || null }).eq("id", userId)
    setAboutMsg(error ? t("profilePage.saveError") : t("profilePage.saved"))
  }

  const saveUsername = async () => {
    setUsernameError("")
    setUsernameSuccess("")
    if (!newUsername || newUsername.length < 3) { setUsernameError(t("profile.username_too_short")); return }
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
        setUsernameError(t("profile.username_taken"))
      } else {
        setUsernameError(error.message)
      }
      return
    }

    setUsername(newUsername.toLowerCase().trim())
    setUsernameUpdatedAt(new Date().toISOString())
    setUsernameSuccess(t("profile.username_updated"))
    setEditingUsername(false)
  }

  const uploadAvatar = async (file: File) => {
    if (!userId) return
    setAvatarError("")

    if (!file.type.startsWith("image/")) { setAvatarError(t("profile.avatar_must_be_image")); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarError(t("profile.avatar_too_big")); return }

    setUploadingAvatar(true)
    const fileExt = file.name.split(".").pop()
    // Carpeta = userId, así las políticas de Storage solo dejan a cada usuario subir/borrar
    // dentro de su propia carpeta (auth.uid() = primer segmento de la ruta).
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })
    if (uploadError) {
      setUploadingAvatar(false)
      setAvatarError(uploadError.message)
      return
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(fileName)
    const publicUrl = pub.publicUrl

    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId)
    setUploadingAvatar(false)
    if (updateError) { setAvatarError(updateError.message); return }

    setAvatarUrl(publicUrl)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadAvatar(file)
    e.target.value = ""
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const askDeleteAccount = () => {
    setDeleteError("")
    if (email === ADMIN_EMAIL) { setDeleteError(t("profilePage.adminNoDelete")); return }
    setShowDeleteModal(true)
  }

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false)
    setDeleting(true)
    // Borrar la cuenta (delete_current_user) elimina los datos de la base de datos, pero NO los archivos
    // del almacenamiento: las fotos de perfil (un archivo nuevo cada vez que se cambia la foto) se
    // quedaban publicadas para siempre. Se borran aquí, antes, mientras la sesión sigue activa. Si falla,
    // no se bloquea el borrado de la cuenta.
    if (userId) {
      try {
        const { data: files } = await supabase.storage.from("avatars").list(userId, { limit: 200 })
        if (files && files.length > 0) {
          await supabase.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`))
        }
      } catch {
        /* se sigue con el borrado de la cuenta */
      }
    }
    const { error } = await supabase.rpc("delete_current_user")
    if (error) { setDeleteError(error.message); setDeleting(false); return }
    await supabase.auth.signOut()
    window.location.href = "/signup"
  }

  const toggleNotifRead = async (id: number, current: boolean) => {
    const next = !current
    const notif = notifHistory.find((n) => n.id === id)
    setNotifHistory((prev) => prev.map((n) => (n.id === id ? { ...n, read: next } : n)))

    if (notif?.type === "broadcast") {
      // Fila compartida por todos los usuarios: el estado de leído se guarda solo en este
      // navegador, nunca se escribe en la fila de Supabase (afectaría a todo el mundo).
      if (next) addToLocalIdSet("noctua_read_broadcasts", id)
      else removeFromLocalIdSet("noctua_read_broadcasts", id)
      return
    }
    await supabase.from("notifications").update({ read: next }).eq("id", id)
  }

  const toggleNotifPinned = async (id: number, current: boolean) => {
    const next = !current
    const notif = notifHistory.find((n) => n.id === id)
    setNotifHistory((prev) => sortByPinned(prev.map((n) => (n.id === id ? { ...n, pinned: next } : n))))

    if (notif?.type === "broadcast") {
      if (next) addToLocalIdSet("noctua_pinned_broadcasts", id)
      else removeFromLocalIdSet("noctua_pinned_broadcasts", id)
      return
    }
    await supabase.from("notifications").update({ pinned: next }).eq("id", id)
  }

  const deleteNotif = async (id: number) => {
    const notif = notifHistory.find((n) => n.id === id)
    setNotifHistory((prev) => prev.filter((n) => n.id !== id))

    if (notif?.type === "broadcast") {
      // No se borra la fila (es de todos) — solo se oculta para este usuario/navegador.
      addToLocalIdSet("noctua_hidden_broadcasts", id)
      return
    }
    await supabase.from("notifications").delete().eq("id", id)
  }

  const toggleMessagePinned = async (id: number, current: boolean) => {
    const next = !current
    setSentMessages((prev) => sortByPinned(prev.map((m) => (m.id === id ? { ...m, pinned: next } : m))))
    await supabase.from("contact_messages").update({ pinned: next }).eq("id", id)
  }

  // Borrar un mensaje pide una segunda pulsación (antes salía un confirm() del navegador).
  const deleteMessage = async (id: number) => {
    if (pendingDelete !== id) {
      setPendingDelete(id)
      return
    }
    setPendingDelete(null)
    setSentMessages((prev) => prev.filter((m) => m.id !== id))
    await supabase.from("contact_messages").delete().eq("id", id)
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-night text-ink">
          <p className="text-sm text-zinc-400">{t("common.loading")}</p>
        </main>
      </>
    )
  }

  const initials = username ? username.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()
  const today = new Date().toISOString().split("T")[0]
  const unreadCount = notifHistory.filter((n) => !n.read).length
  const isAdmin = email === ADMIN_EMAIL
  // Antes el admin se veía siempre a nivel Élite al 100% sin tocar su XP real — pero eso hacía
  // que Noc se quedara fijo en el color de Élite y que el XP mostrado no coincidiera con la
  // insignia. Ahora el admin ve su nivel y su XP real, igual que cualquier usuario.
  const level = getLevelStatus(xp, levelKey, levelSince)

  const card = "rounded-card border border-white/10 bg-surface p-5 sm:p-6"
  const h2 = "text-lg font-semibold text-ink"
  const pill = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-white text-night" : "border border-white/10 text-zinc-200 hover:bg-white/5"}`
  const ghostBtn = "rounded-ctl border border-white/15 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/5"
  const iconBtn = "rounded-ctl p-1.5 transition"

  const hub = [
    { href: "/favorites", icon: Heart, title: t("profile.favorites"), sub: t("profilePage.favCount").replace("{n}", String(favorites.length)) },
    { href: "/club-noctua", icon: Trophy, title: "Club Noctua", sub: t("profilePage.clubSub") },
    { href: "/mi-mes", icon: CalendarDays, title: t("profilePage.monthTitle"), sub: t("profilePage.monthSub") },
    { href: "/invitar", icon: Gift, title: t("profilePage.inviteTitle"), sub: t("profilePage.inviteSub") },
    ...(hasLinkedClub ? [{ href: "/mi-club", icon: Building2, title: t("profilePage.myClub"), sub: t("profilePage.myClubSub") }] : []),
    ...(hasLinkedFestival ? [{ href: "/mi-festival", icon: Music2, title: t("profilePage.myFestivals"), sub: t("profilePage.myFestivalsSub") }] : []),
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-night pb-40 text-ink">
        <section className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
          <div className="flex items-center gap-4">
            {/* Ventaja propia de la app (no depende de ningún local): el aro del avatar lleva el
                color de tu nivel, así se nota de un vistazo sin tener que entrar a mirarlo. */}
            <label
              className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-full ring-[3px] ring-offset-2 ring-offset-night"
              style={{ ["--tw-ring-color" as any]: level.current.color }}
              aria-label={t("profilePage.changePhoto")}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-semibold text-white">{initials}</span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-night bg-white text-night">
                {uploadingAvatar ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-night/30 border-t-night" /> : <Camera size={14} />}
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
            <div className="min-w-0">
              <h1 className="font-display truncate text-2xl sm:text-3xl">{username ? `@${username}` : t("profile.title")}</h1>
              <p className="mt-1 truncate text-sm text-zinc-400">{email}</p>
            </div>
          </div>
          {avatarError && <p className="mt-3 text-sm text-red-300">{avatarError}</p>}

          <Link href="/club-noctua" className="mt-6 block rounded-card border border-white/10 bg-surface p-5 transition hover:border-white/25">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-base font-semibold text-ink">
                <NocOwl size={28} levelColor={level.current.color} />
                {t(`levels.${level.current.key}`)}
              </span>
              <span className="text-sm font-semibold text-zinc-300">
                {xp} {t("levels.xpLabel")}
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand" style={{ width: `${level.progressPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              {level.unlocksAt
                ? t("levels.waitingUntil").replace("{date}", level.unlocksAt.toLocaleDateString(toDateLocale(locale), { day: "numeric", month: "short" }))
                : level.next
                  ? `${t("levels.nextIn")} ${level.xpToNext} ${t("levels.toNextLevel")}`
                  : t("levels.maxLevel")}
            </p>
            {loginStreakDays > 1 && (
              <p className="mt-2 text-xs font-semibold text-amber-300">
                🔥 {t("levels.streakDays").replace("{days}", String(loginStreakDays))}
              </p>
            )}
          </Link>
        </section>

        <section className="mx-auto mt-8 max-w-3xl px-4">
          <h2 className={`${h2} mb-4`}>{t("profilePage.yourNight")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {hub.map((item) => {
              const I = item.icon
              return (
                <Link key={item.href} href={item.href} className="flex flex-col gap-3 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25">
                  <I size={22} className="text-brand-soft" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{item.sub}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-3xl space-y-5 px-4">
          <div className={card}>
            <h2 className={`${h2} mb-4`}>{t("profilePage.calendar")}</h2>
            {loadingCalendar ? (
              <p className="text-sm text-zinc-400">{t("common.loading")}</p>
            ) : calendarItems.length === 0 ? (
              <p className="text-sm text-zinc-400">{t("profilePage.calendarEmpty")}</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {calendarItems.map((item) => {
                  const isPast = item.date ? item.date < today : false
                  const isToday = item.date === today
                  const dateLabel = item.date
                    ? new Date(`${item.date}T12:00:00`).toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric", month: "short" })
                    : t("eventPage.dateTbc")
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link
                        href={item.kind === "event" ? `/event/${item.slug}` : `/club-event/${item.id}`}
                        className={`flex items-center justify-between gap-4 py-3 ${isPast ? "opacity-50" : ""}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{item.title}</span>
                          <span className={`mt-0.5 block text-xs ${isToday ? "font-semibold text-open" : "text-zinc-400"}`}>
                            {isToday ? t("profilePage.today") : dateLabel}
                            {item.time ? ` · ${item.time}` : ""}
                          </span>
                        </span>
                        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className={card}>
            <h2 className={`${h2} mb-4`}>{t("profilePage.recent")}</h2>
            {loadingVisits ? (
              <p className="text-sm text-zinc-400">{t("common.loading")}</p>
            ) : recentVisits.length === 0 ? (
              <p className="text-sm text-zinc-400">{t("profilePage.recentEmpty")}</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {recentVisits.map((visit) => (
                  <li key={`${visit.item_type}-${visit.item_id}`}>
                    <Link
                      href={visit.item_type === "event" ? `/event/${createSlug(visit.item_name || "")}` : `/clubs/${createSlug(visit.item_name || "")}`}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{visit.item_name}</span>
                        <span className="mt-0.5 block text-xs text-zinc-400">
                          {visit.item_type === "event" ? t("profilePage.kindEvent") : t("profilePage.kindClub")} · {ago(visit.created_at)}
                        </span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-zinc-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div id="buzon" className={`${card} scroll-mt-24`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={h2}>{t("profilePage.inbox")}</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-soft">
                  {t("profilePage.unread").replace("{n}", String(unreadCount))}
                </span>
              )}
            </div>

            <div className="mb-4 flex gap-2" role="tablist">
              <button role="tab" aria-selected={inboxTab === "notifications"} onClick={() => setInboxTab("notifications")} className={pill(inboxTab === "notifications")}>
                {t("header.notifications")}
              </button>
              <button role="tab" aria-selected={inboxTab === "messages"} onClick={() => setInboxTab("messages")} className={pill(inboxTab === "messages")}>
                {t("profilePage.yourMessages")}
              </button>
            </div>

            {loadingInbox ? (
              <p className="text-sm text-zinc-400">{t("common.loading")}</p>
            ) : inboxTab === "notifications" ? (
              notifHistory.length === 0 ? (
                <p className="text-sm text-zinc-400">{t("header.noNotifications")}</p>
              ) : (
                <ul className="space-y-2">
                  {notifHistory.map((n) => {
                    const NIcon = NOTIF_ICON[n.type] || Bell
                    return (
                      <li
                        key={n.id}
                        className={`rounded-ctl border p-4 ${n.pinned ? "border-warn/40 bg-warn/5" : n.read ? "border-white/5" : "border-brand/30 bg-brand/5"}`}
                      >
                        <div className="flex items-start gap-3">
                          <button onClick={() => !n.read && toggleNotifRead(n.id, n.read)} className="flex flex-1 items-start gap-3 text-left">
                            <NIcon size={18} className={`mt-0.5 shrink-0 ${n.read ? "text-zinc-500" : "text-brand-soft"}`} />
                            <span>
                              <span className="block font-semibold text-ink">{n.title}</span>
                              {n.body && <span className="mt-1 block text-sm text-zinc-300">{n.body}</span>}
                              <span className="mt-1 block text-xs text-zinc-400">{ago(n.created_at)}</span>
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => toggleNotifPinned(n.id, !!n.pinned)}
                              aria-label={n.pinned ? t("profilePage.unpin") : t("profilePage.pin")}
                              title={n.pinned ? t("profilePage.unpin") : t("profilePage.pin")}
                              className={`${iconBtn} ${n.pinned ? "text-warn" : "text-zinc-400 hover:text-ink"}`}
                            >
                              <Pin size={16} />
                            </button>
                            <button
                              onClick={() => toggleNotifRead(n.id, n.read)}
                              aria-label={n.read ? t("profilePage.markUnread") : t("profilePage.markRead")}
                              title={n.read ? t("profilePage.markUnread") : t("profilePage.markRead")}
                              className={`${iconBtn} text-zinc-400 hover:text-ink`}
                            >
                              <span className={`block h-2.5 w-2.5 rounded-full ${n.read ? "border border-zinc-500" : "bg-brand"}`} />
                            </button>
                            <button onClick={() => deleteNotif(n.id)} aria-label={t("profilePage.delete")} title={t("profilePage.delete")} className={`${iconBtn} text-zinc-400 hover:text-red-300`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )
            ) : sentMessages.length === 0 ? (
              <p className="text-sm text-zinc-400">
                {t("profilePage.noMessages")}{" "}
                <Link href="/contact" className="font-semibold text-brand-soft underline underline-offset-4">
                  {t("footer.link_contact")}
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {sentMessages.map((m) => (
                  <li key={m.id} className={`rounded-ctl border p-4 ${m.pinned ? "border-warn/40 bg-warn/5" : "border-white/10"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink">{m.subject || t("profilePage.messageSent")}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={`mr-1 rounded-full px-2.5 py-1 text-xs font-semibold ${m.reply ? "bg-open/15 text-open" : "bg-white/10 text-zinc-300"}`}>
                          {m.reply ? t("profilePage.answered") : t("profilePage.pending")}
                        </span>
                        <button
                          onClick={() => toggleMessagePinned(m.id, !!m.pinned)}
                          aria-label={m.pinned ? t("profilePage.unpin") : t("profilePage.pin")}
                          className={`${iconBtn} ${m.pinned ? "text-warn" : "text-zinc-400 hover:text-ink"}`}
                        >
                          <Pin size={16} />
                        </button>
                        <button onClick={() => deleteMessage(m.id)} aria-label={t("profilePage.delete")} className={`${iconBtn} text-zinc-400 hover:text-red-300`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {pendingDelete === m.id && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-zinc-300">{t("profilePage.confirmDelete")}</span>
                        <button onClick={() => deleteMessage(m.id)} className="rounded-ctl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">
                          {t("profilePage.delete")}
                        </button>
                        <button onClick={() => setPendingDelete(null)} className="rounded-ctl border border-white/15 px-3 py-1.5 text-xs font-semibold text-ink">
                          {t("common.cancel")}
                        </button>
                      </div>
                    )}
                    <p className="mt-2 text-sm text-zinc-300">{m.message}</p>
                    <p className="mt-2 text-xs text-zinc-400">{ago(m.created_at)}</p>
                    {m.reply && (
                      <div className="mt-3 rounded-ctl border border-open/20 bg-open/5 p-3">
                        <p className="mb-1 text-xs font-semibold text-open">{t("profilePage.replyFromNoctua")}</p>
                        <p className="text-sm text-zinc-200">{m.reply}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Locales donde no le dejaron entrar: no se le recomiendan hasta que los vuelva a mostrar. */}
          <DeniedVenuesCard cardClass={card} titleClass={h2} />

          {/* «Instalar Noctua en tu móvil»: solo en móvil y si aún no está instalada. */}
          <InstallAppButton from="profile" variant="card" cardClass={card} titleClass={h2} />

          <div className={card}>
            <h2 className={`${h2} mb-5`}>{t("profilePage.settings")}</h2>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-400">{t("profile.username")}</p>
                <p className="mt-0.5 font-semibold text-ink">@{username || "—"}</p>
              </div>
              {!editingUsername && canChangeUsername() && (
                <button onClick={() => { setEditingUsername(true); setUsernameError(""); setUsernameSuccess("") }} className={ghostBtn}>
                  {t("profile.change_username")}
                </button>
              )}
            </div>
            {editingUsername && (
              <div className="mt-4">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  aria-label={t("profile.username")}
                  placeholder={t("profile.username")}
                  className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3 text-ink outline-none focus:border-brand"
                />
                <p className="mt-2 text-xs text-zinc-400">{t("profile.username_hint")}</p>
                {usernameError && <p className="mt-2 text-sm text-red-300">{usernameError}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={saveUsername} disabled={savingUsername} className="rounded-ctl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50">
                    {savingUsername ? t("profile.saving") : t("profile.save")}
                  </button>
                  <button onClick={() => { setEditingUsername(false); setNewUsername(username); setUsernameError("") }} className={ghostBtn}>
                    {t("profile.cancel")}
                  </button>
                </div>
              </div>
            )}
            {!editingUsername && !canChangeUsername() && (
              <p className="mt-2 text-sm text-zinc-400">{t("profile.days_until_change").replace("{days}", String(daysUntilChange()))}</p>
            )}
            {usernameSuccess && <p className="mt-2 text-sm text-open">{usernameSuccess}</p>}

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="mb-2 text-sm text-zinc-400">{t("profilePage.birthYear")}</p>
              <BirthYearSelect value={birthYear} onChange={saveBirthYear} />
              {birthYearMsg && <p className="mt-2 text-sm text-open">{birthYearMsg}</p>}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-sm text-zinc-400">{t("profilePage.aboutYou")}</p>
              <p className="mb-3 mt-0.5 text-xs text-zinc-500">{t("profilePage.aboutYouHelp")}</p>
              <div className="space-y-3">
                <CountrySelect value={country} onChange={(v) => saveAbout("country", v)} locale={locale} placeholder={t("signup.country")} />
                <select
                  value={gender}
                  onChange={(e) => saveAbout("gender", e.target.value)}
                  aria-label={t("signup.gender")}
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-zinc-300 outline-none transition focus:border-brand"
                >
                  <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="">
                    {t("signup.gender")}
                  </option>
                  <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Hombre">
                    {t("signup.gender_male")}
                  </option>
                  <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Mujer">
                    {t("signup.gender_female")}
                  </option>
                  <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Prefiero no decirlo">
                    {t("signup.gender_unspecified")}
                  </option>
                </select>
              </div>
              {aboutMsg && <p className="mt-2 text-sm text-open">{aboutMsg}</p>}
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
              <Link href="/profile/change-password" className={ghostBtn}>
                {t("profile.change_password")}
              </Link>
              <button onClick={logout} className={ghostBtn}>
                {t("profile.logout")}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-card border border-red-500/20 p-5">
            <div>
              <p className="text-sm font-semibold text-red-300">{t("profile.danger")}</p>
              <p className="mt-1 text-xs text-zinc-400">{t("profile.delete_subtitle")}</p>
              {deleteError && <p className="mt-2 text-xs text-red-300">{deleteError}</p>}
            </div>
            <button
              onClick={askDeleteAccount}
              disabled={deleting}
              className="shrink-0 rounded-ctl border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
            >
              {deleting ? t("profile.deleting") : t("profile.delete")}
            </button>
          </div>
        </section>

        {showDeleteModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="w-full max-w-md rounded-card border border-red-500/30 bg-surface p-6 sm:p-8">
              <h2 id="delete-title" className="text-xl font-semibold text-ink">{t("profile.delete_confirm_title")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {t("profile.delete_confirm_body_1")} <span className="font-semibold text-red-300">{t("profile.delete_confirm_body_2")}</span>. {t("profile.delete_confirm_body_3")}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button onClick={confirmDeleteAccount} disabled={deleting} className="rounded-ctl bg-red-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50">
                  {deleting ? t("profile.deleting") : t("profile.delete_confirm_yes")}
                </button>
                <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="rounded-ctl border border-white/15 px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/5">
                  {t("common.cancel")}
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

// Zona privada (29/10/2026): sin sesión ya no se redirige de golpe a /login; se enseña la puerta con
// «Continuar con Google», crear cuenta con email e iniciar sesión, y se vuelve aquí al terminar.
export default function ProfilePage() {
  const { t } = useLanguage()
  const [state, setState] = useState<"checking" | "in" | "out">("checking")
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState(data.session ? "in" : "out"))
  }, [])
  if (state === "checking") {
    // Pantalla de carga con el logo (autocontenida: no depende de ningún componente aparte).
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-night">
        <Image src="/noctua_logo.png" alt="Noctua" width={88} height={54} className="h-12 w-auto object-contain" />
        <p className="mt-5 text-xs text-zinc-500">{t("common.loading")}</p>
      </main>
    )
  }
  if (state === "out") {
    return (
      <>
        <Header />
        <LoginWall titleKey="profilePage.gateTitle" subtitleKey="profilePage.gateSubtitle" next="/profile" />
        <BottomNav />
      </>
    )
  }
  return <ProfileInner />
}
