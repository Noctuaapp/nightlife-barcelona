"use client"

import { useEffect, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import OwnerStatsAccess from "../../../components/admin/OwnerStatsAccess"
import { supabase } from "../../../lib/supabase"
import { getSortedCountries } from "../../../lib/countries"
import CountrySelect from "../../../components/ui/CountrySelect"
import { BLOCK_REASONS, BLOCK_DURATIONS, computeBlockedUntil, isBlockActive, type BlockDuration } from "../../../lib/blockReasons"
import { getLevelStatus } from "../../../lib/xp"
import { ADMIN_EMAIL } from "../../../lib/admin"
import Link from "next/link"
import { Activity, Ban, Crown, Search, UserPlus, Users } from "lucide-react"
import { ACCENT, AVATAR_ORDER, StatTile } from "../../../components/admin/ui"

// El admin es una herramienta interna en español, así que aquí no depende del idioma del
// visitante — siempre se muestra (y se guarda) en español, con bandera.
const ADMIN_COUNTRIES = getSortedCountries("es")

type User = {
  id: string
  email: string
  username: string | null
  gender: string | null
  country: string | null
  created_at: string
  last_sign_in_at: string | null
  // Última vez que la persona estuvo en la web, de verdad (10/11/2026): lo más reciente entre su actividad
  // registrada (analytics), el día de su último inicio contado (profiles.last_login_date) y el último
  // inicio de sesión de auth. last_sign_in_at SOLO cambia cuando alguien escribe su clave o pulsa Google;
  // quien vuelve cada día con la sesión ya guardada en el móvil se queda con una fecha vieja aunque entre a diario.
  last_active_at?: string | null
  is_blocked: boolean
  block_reason?: string | null
  block_note?: string | null
  blocked_until?: string | null
  xp: number | null
  level_key: string | null
  level_since: string | null
  birth_year?: number | null
  terms_accepted_at?: string | null
  // Estado de la cuenta en auth (admin_users_auth_status, supabase/83). Si esa función aún no está
  // creada, auth_known queda en false y no se enseña nada de esto.
  auth_known?: boolean
  email_confirmed_at?: string | null
  auth_provider?: string | null
}

type OwnableClub = { id: number; name: string; owner_user_id: string | null }
// Festivales (tabla "events", distinta de las noches de club "club_events"). Una noche de club
// pertenece automáticamente al dueño del club (se gestiona dentro de /mi-club), pero un festival
// no está atado a ningún club, así que cada uno se vincula a mano aquí, igual que un club.
type OwnableFestival = { id: number; title: string; date: string | null; owner_user_id: string | null }

// La más reciente de varias fechas (ignora las vacías o rotas).
function latestOf(...dates: (string | null | undefined)[]): string | null {
  let best: string | null = null
  let bestMs = -Infinity
  for (const d of dates) {
    if (!d) continue
    const ms = new Date(d).getTime()
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms
      best = d
    }
  }
  return best
}

// «hoy 18:42», «ayer 23:10» o «06/11/2026», siempre en hora de Madrid.
function fmtLastAccess(iso: string): string {
  const d = new Date(iso)
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" })
  const time = d.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })
  // Si lo más reciente es el día suelto de la racha (sin hora de verdad), no se inventa una hora.
  const dateOnly = iso.endsWith("T12:00:00+01:00")
  const now = new Date()
  if (day(d) === day(now)) return dateOnly ? "hoy" : `hoy ${time}`
  if (day(d) === day(new Date(now.getTime() - 86400000))) return dateOnly ? "ayer" : `ayer ${time}`
  return d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [search, setSearch] = useState("")
  // Filtro y orden de la lista (antes solo había búsqueda por texto y el orden era fijo).
  const [listFilter, setListFilter] = useState<"all" | "new" | "active" | "blocked" | "owners">("all")
  const [sortBy, setSortBy] = useState<"created" | "last" | "xp">("created")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUsername, setEditUsername] = useState("")
  const [editGender, setEditGender] = useState("")
  const [editCountry, setEditCountry] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const [messagingId, setMessagingId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageSentId, setMessageSentId] = useState<string | null>(null)

  const [blockingId, setBlockingId] = useState<string | null>(null)
  const [blockTarget, setBlockTarget] = useState<User | null>(null)
  const [blockReason, setBlockReason] = useState("spam")
  const [blockNote, setBlockNote] = useState("")
  const [blockDuration, setBlockDuration] = useState<BlockDuration>("forever")

  // Vincular un usuario a "su" club y/o "sus" festivales (owner_user_id en clubs / events), para
  // que luego pueda gestionarlos él mismo desde /mi-club y /mi-festival sin tocar SQL a mano. Las
  // noches de club (club_events) NO se vinculan aquí — pertenecen automáticamente al club y se
  // gestionan dentro de /mi-club.
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [ownableClubs, setOwnableClubs] = useState<OwnableClub[]>([])
  const [ownableFestivals, setOwnableFestivals] = useState<OwnableFestival[]>([])
  const [savingLink, setSavingLink] = useState(false)

  const loadOwnables = async () => {
    const [{ data: clubsData }, { data: festivalsData }] = await Promise.all([
      supabase.from("clubs").select("id, name, owner_user_id").order("name"),
      supabase.from("events").select("id, title, date, owner_user_id").order("date", { ascending: true }),
    ])
    setOwnableClubs(clubsData || [])
    setOwnableFestivals(festivalsData || [])
  }

  const startLinking = (userId: string) => {
    setLinkingId(userId)
    if (ownableClubs.length === 0 && ownableFestivals.length === 0) loadOwnables()
  }

  // Aviso al usuario, como notificación dentro de la app, de que ya puede gestionar su club o
  // festival — mismo mecanismo que usa el botón "💬 Mensaje" (tabla notifications).
  const notifyOwnerAccess = async (userId: string, title: string, body: string) => {
    await supabase.from("notifications").insert([
      { user_id: userId, title, body, type: "admin_message" },
    ])
  }

  const setUserClub = async (userId: string, clubId: number | null) => {
    setSavingLink(true)
    // Si este usuario ya tenía otro club vinculado, lo desvinculamos primero — una persona no
    // debería quedar vinculada a dos clubs a la vez por error.
    const previousClub = ownableClubs.find((c) => c.owner_user_id === userId && c.id !== clubId)
    if (previousClub) {
      await supabase.from("clubs").update({ owner_user_id: null }).eq("id", previousClub.id)
    }
    if (clubId) {
      const { error } = await supabase.from("clubs").update({ owner_user_id: userId }).eq("id", clubId)
      if (error) { window.alert("No se pudo vincular el club: " + error.message); setSavingLink(false); return }
    }
    setOwnableClubs((prev) =>
      prev.map((c) => {
        if (c.id === clubId) return { ...c, owner_user_id: userId }
        if (previousClub && c.id === previousClub.id) return { ...c, owner_user_id: null }
        return c
      })
    )
    setSavingLink(false)

    if (clubId) {
      const club = ownableClubs.find((c) => c.id === clubId)
      await notifyOwnerAccess(
        userId,
        "Ya puedes gestionar tu club",
        `Te hemos dado acceso a "${club?.name ?? "tu club"}". Entra en /mi-club para editar su ficha y sus noches.`
      )
    }
  }

  const toggleUserFestival = async (userId: string, festivalId: number, currentlyOwned: boolean) => {
    setSavingLink(true)
    const { error } = await supabase
      .from("events")
      .update({ owner_user_id: currentlyOwned ? null : userId })
      .eq("id", festivalId)
    setSavingLink(false)
    if (error) { window.alert("No se pudo actualizar el festival: " + error.message); return }
    setOwnableFestivals((prev) =>
      prev.map((e) => (e.id === festivalId ? { ...e, owner_user_id: currentlyOwned ? null : userId } : e))
    )

    if (!currentlyOwned) {
      const festival = ownableFestivals.find((e) => e.id === festivalId)
      await notifyOwnerAccess(
        userId,
        "Ya puedes gestionar tu festival",
        `Te hemos dado acceso a "${festival?.title ?? "tu festival"}". Entra en /mi-festival para editar su ficha y su line-up.`
      )
    }
  }

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    }
    checkAdmin()
  }, [])

  const fetchUsers = async () => {
    // admin_list_users() es una función solo para admin (antes la vista users_view).
    const { data: rawUsers, error } = await supabase.rpc("admin_list_users")
    if (error) { console.log("USERS ERROR:", error); return }
    const data = [...((rawUsers || []) as any[])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // country se pide aparte de users_view (igual que is_blocked) porque la vista de Supabase
    // no incluía esta columna hasta ahora: así no hace falta tocar la vista para que aparezca.
    // xp/level_key/level_since igual: antes no se pedían aquí y por eso no se veía ni el nivel
    // ni el XP de cada usuario en esta página (sí se calculaban, pero solo en /club-noctua).
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
    if (profilesError) console.log("PROFILES ERROR:", profilesError)

    const blockedMap = new Map((profiles || []).map((p) => [p.id, !!p.is_blocked]))
    const reasonMap = new Map((profiles || []).map((p) => [p.id, { r: p.block_reason as string | null, n: p.block_note as string | null }]))
    const countryMap = new Map((profiles || []).map((p) => [p.id, p.country as string | null]))
    const untilMap = new Map((profiles || []).map((p) => [p.id, (p as any).blocked_until as string | null]))
    const xpMap = new Map((profiles || []).map((p) => [p.id, (p as any).xp as number | null]))
    const levelKeyMap = new Map((profiles || []).map((p) => [p.id, (p as any).level_key as string | null]))
    const levelSinceMap = new Map((profiles || []).map((p) => [p.id, (p as any).level_since as string | null]))
    // Edad (26/10/2026): solo se guarda el año de nacimiento, no la fecha completa.
    const birthMap = new Map((profiles || []).map((p) => [p.id, (p as any).birth_year as number | null]))
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))
    const termsMap = new Map((profiles || []).map((p) => [p.id, (p as any).terms_accepted_at as string | null]))
    // Correo confirmado o no, y con qué se registró (correo o Google). Si la función no existe todavía, se ignora.
    // Última actividad real. admin_users_activity (supabase/24) da, por usuario, la última vez que dejó rastro
    // en la web; se pide un periodo largo para que cualquiera tenga fecha aunque lleve meses sin entrar.
    // Si esa función aún no existe o falla, se usa solo lo demás (profiles.last_login_date y auth).
    const todayUtc = new Date()
    const toDate = new Date(todayUtc.getTime() + 86400000).toISOString().slice(0, 10) // mañana: cubre el final del día en Madrid
    const fromDate = new Date(todayUtc.getTime() - 800 * 86400000).toISOString().slice(0, 10)
    const { data: activityRows } = await supabase.rpc("admin_users_activity", { p_from: fromDate, p_to: toDate })
    const lastSeenMap = new Map(
      ((activityRows || []) as { user_id: string; last_seen: string | null }[]).map((r) => [r.user_id, r.last_seen])
    )
    const { data: authRows } = await supabase.rpc("admin_users_auth_status")
    const authMap = new Map(
      ((authRows || []) as { user_id: string; email_confirmed_at: string | null; provider: string | null }[]).map((r) => [r.user_id, r])
    )

    if (data) {
      setUsers(
        data.map((u) => ({
          ...u,
          is_blocked: blockedMap.get(u.id) ?? false,
          block_reason: reasonMap.get(u.id)?.r ?? null,
          block_note: reasonMap.get(u.id)?.n ?? null,
          blocked_until: untilMap.get(u.id) ?? null,
          country: u.country ?? countryMap.get(u.id) ?? null,
          xp: xpMap.get(u.id) ?? null,
          level_key: levelKeyMap.get(u.id) ?? null,
          level_since: levelSinceMap.get(u.id) ?? null,
          birth_year: birthMap.get(u.id) ?? null,
          terms_accepted_at: termsMap.get(u.id) ?? null,
          last_active_at: latestOf(
            lastSeenMap.get(u.id),
            // last_login_date es un día suelto (hora de Madrid), sin hora: se toma el mediodía solo para poder comparar.
            (profileMap.get(u.id) as any)?.last_login_date ? `${(profileMap.get(u.id) as any).last_login_date}T12:00:00+01:00` : null,
            u.last_sign_in_at
          ),
          auth_known: authMap.has(u.id),
          email_confirmed_at: authMap.get(u.id)?.email_confirmed_at ?? null,
          auth_provider: authMap.get(u.id)?.provider ?? null,
        }))
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!checkingAdmin) fetchUsers()
  }, [checkingAdmin])

  // Quién tiene un club o un festival vinculado, para el filtro "Dueños de club/festival".
  const [ownerIds, setOwnerIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (checkingAdmin) return
    Promise.all([
      supabase.from("clubs").select("owner_user_id").not("owner_user_id", "is", null),
      supabase.from("events").select("owner_user_id").not("owner_user_id", "is", null),
    ]).then(([c, e]) => {
      const ids = new Set<string>()
      for (const r of [...(c.data || []), ...(e.data || [])] as { owner_user_id: string | null }[]) {
        if (r.owner_user_id) ids.add(r.owner_user_id)
      }
      setOwnerIds(ids)
    })
  }, [checkingAdmin])

  const weekAgo = Date.now() - 7 * 86400000
  const filteredUsers = users
    .filter((u) => {
      if (listFilter === "new" && new Date(u.created_at).getTime() < weekAgo) return false
      if (listFilter === "active" && !(u.last_active_at && new Date(u.last_active_at).getTime() >= weekAgo)) return false
      if (listFilter === "blocked" && !u.is_blocked) return false
      if (listFilter === "owners" && !ownerIds.has(u.id)) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === "last") return new Date(b.last_active_at || 0).getTime() - new Date(a.last_active_at || 0).getTime()
      if (sortBy === "xp") return (b.xp || 0) - (a.xp || 0)
      return b.created_at.localeCompare(a.created_at)
    })

  const startEditing = (user: User) => {
    setEditingId(user.id)
    setEditUsername(user.username || "")
    setEditGender(user.gender || "")
    setEditCountry(user.country || "")
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditUsername("")
    setEditGender("")
    setEditCountry("")
  }

  const saveEditing = async (userId: string) => {
    setSavingEdit(true)
    const { error } = await supabase
      .from("profiles")
      .update({ username: editUsername.trim() || null, gender: editGender || null, country: editCountry || null })
      .eq("id", userId)
    setSavingEdit(false)

    if (error) {
      console.log("UPDATE USER ERROR:", error)
      window.alert("No se pudo guardar el usuario")
      return
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, username: editUsername.trim() || null, gender: editGender || null, country: editCountry || null }
          : u
      )
    )
    cancelEditing()
  }

  // Bloquear abre un cuadro para elegir el motivo; desbloquear es directo.
  const toggleBlocked = (user: User) => {
    if (user.is_blocked) {
      applyBlock(user, false)
      return
    }
    setBlockReason("spam")
    setBlockNote("")
    setBlockDuration("forever")
    setBlockTarget(user)
  }

  const applyBlock = async (user: User, nextBlocked: boolean) => {
    setBlockingId(user.id)
    const blockedUntil = nextBlocked ? computeBlockedUntil(blockDuration) : null
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      is_blocked: nextBlocked,
      block_reason: nextBlocked ? blockReason : null,
      block_note: nextBlocked ? blockNote.trim().slice(0, 300) || null : null,
      blocked_at: nextBlocked ? new Date().toISOString() : null,
      blocked_until: blockedUntil,
    })
    setBlockingId(null)

    if (error) {
      console.log("BLOCK USER ERROR:", error)
      window.alert("No se pudo actualizar el bloqueo")
      return
    }

    setBlockTarget(null)
    setUsers((prev) =>
      prev.map((x) =>
        x.id === user.id
          ? {
              ...x,
              is_blocked: nextBlocked,
              block_reason: nextBlocked ? blockReason : null,
              block_note: nextBlocked ? blockNote.trim() || null : null,
              blocked_until: blockedUntil,
            }
          : x
      )
    )
  }

  const startMessaging = (userId: string) => {
    setMessagingId(userId)
    setMessageText("")
    setMessageSentId(null)
  }

  const sendMessage = async (userId: string) => {
    if (!messageText.trim()) return
    setSendingMessage(true)
    const { error } = await supabase.from("notifications").insert([
      {
        user_id: userId,
        title: "Mensaje de Noctua",
        body: messageText.trim(),
        type: "admin_message",
      },
    ])
    setSendingMessage(false)

    if (error) {
      console.log("SEND USER MESSAGE ERROR:", error)
      window.alert("No se pudo enviar el mensaje")
      return
    }

    setMessageSentId(userId)
    setMessageText("")
    setTimeout(() => {
      setMessagingId(null)
      setMessageSentId(null)
    }, 1200)
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">Cargando…</p>
      </main>
    )
  }

  return (
    <AdminShell title="Usuarios" subtitle={`${users.length} usuarios registrados en Noctua.`}>
      <>
        <OwnerStatsAccess />
        <section className="mx-auto max-w-7xl">
          <div className="relative mb-4">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email o username..."
              aria-label="Buscar usuarios"
              className="w-full rounded-ctl border border-white/10 bg-surface py-3.5 pl-12 pr-4 text-sm text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand/60"
            />
          </div>

          {/* Los filtros son a la vez el recuento: tocar una casilla filtra la lista. */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {([
              ["all", "Todos", users.length, Users, "violet"],
              ["new", "Nuevos (7 días)", users.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length, UserPlus, "pink"],
              ["active", "Activos (7 días)", users.filter((u) => u.last_active_at && new Date(u.last_active_at).getTime() >= weekAgo).length, Activity, "cyan"],
              ["owners", "Dueños de club/festival", users.filter((u) => ownerIds.has(u.id)).length, Crown, "coral"],
              ["blocked", "Bloqueados", users.filter((u) => u.is_blocked).length, Ban, "violet"],
            ] as const).map(([key, label, n, icon, accent]) => (
              <StatTile key={key} accent={accent} icon={icon} label={label} value={n} active={listFilter === key} onClick={() => setListFilter(key)} />
            ))}
          </div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-400">{filteredUsers.length} de {users.length}</p>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              Ordenar por
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{ colorScheme: "dark" }}
                className="rounded-ctl border border-white/10 bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-brand/60"
              >
                <option value="created">Registro más reciente</option>
                <option value="last">Último acceso</option>
                <option value="xp">Más XP</option>
              </select>
            </label>
          </div>

          {loading ? (
            <p className="text-zinc-400 text-sm text-center py-20">Cargando usuarios...</p>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user, i) => (
                <div
                  key={user.id}
                  className={`rounded-card border p-6 flex flex-col gap-4 ${
                    user.is_blocked ? "border-red-500/30 bg-red-500/[0.04]" : "border-white/10 bg-surface"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-sm font-black text-white ${ACCENT[AVATAR_ORDER[i % AVATAR_ORDER.length]].avatar}`}>
                          {user.email?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{user.email}</p>
                          {user.username && <p className="text-sm text-zinc-400">@{user.username}</p>}
                        </div>
                        {user.is_blocked && (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase text-red-300">
                            {isBlockActive(user.is_blocked, user.blocked_until ?? null) ? "Bloqueado" : "Bloqueo caducado"}
                            {user.block_reason ? ` · ${BLOCK_REASONS.find((x) => x.code === user.block_reason)?.label || user.block_reason}` : ""}
                            {user.blocked_until ? ` · hasta ${new Date(user.blocked_until).toLocaleDateString("es-ES")}` : " · para siempre"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                      {user.gender && (
                        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-zinc-300">
                          {user.gender === "Hombre" ? "♂️" : user.gender === "Mujer" ? "♀️" : "🧑"} {user.gender}
                        </span>
                      )}
                      {user.country && (
                        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-zinc-300">
                          {ADMIN_COUNTRIES.find((c) => c.es === user.country)?.flag || "🌍"} {user.country}
                        </span>
                      )}
                      {user.birth_year ? (
                        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-zinc-300" title={`Nacido/a en ${user.birth_year}`}>
                          🎂 {new Date().getFullYear() - user.birth_year - 1}–{new Date().getFullYear() - user.birth_year} años
                        </span>
                      ) : (
                        <span className="rounded-full bg-warn/12 px-3 py-1 font-semibold text-warn" title="No ha pasado por la confirmación de edad">
                          ⚠️ Edad sin confirmar
                        </span>
                      )}
                      {user.auth_known && !user.email_confirmed_at ? (
                        // Registrada con correo y sin pulsar aún el enlace: todavía no puede entrar. La casilla de
                        // términos del formulario era obligatoria, así que no se marca como «sin aceptar».
                        <span className="rounded-full bg-warn/12 px-3 py-1 font-semibold text-warn" title="Se registró pero no ha pulsado el enlace del correo: aún no puede entrar">
                          ✉️ Correo sin confirmar
                        </span>
                      ) : (
                        !user.terms_accepted_at && (
                          <span
                            className="rounded-full bg-warn/12 px-3 py-1 font-semibold text-warn"
                            title={`Tiene cuenta${user.auth_provider ? ` (${user.auth_provider})` : ""} pero no ha completado «Antes de continuar»: la web se lo pide en cada página hasta que lo haga`}
                          >
                            ⚠️ Sin aceptar términos
                          </span>
                        )
                      )}
                      <span className="rounded-full bg-white/[0.06] px-3 py-1 text-zinc-300">
                        📅 Registrado: {new Date(user.created_at).toLocaleDateString("es-ES")}
                      </span>
                      {user.last_active_at && (
                        <span
                          className="rounded-full bg-white/[0.06] px-3 py-1 text-zinc-300"
                          title="Lo más reciente entre su actividad en la web, su último día contado de racha y su último inicio de sesión"
                        >
                          🕒 Último acceso: {fmtLastAccess(user.last_active_at)}
                        </span>
                      )}
                      {(() => {
                        // Antes esta página no pedía xp/level_key/level_since, así que no había
                        // forma de ver el nivel ni el XP de nadie aquí (sí se veía, pero solo
                        // dentro de la propia ficha de /club-noctua de cada usuario).
                        const status = getLevelStatus(user.xp ?? 0, user.level_key, user.level_since)
                        return (
                          <span
                            className="rounded-full border px-3 py-1 font-semibold"
                            style={{
                              borderColor: `${status.current.color}4d`,
                              background: `${status.current.color}1a`,
                              color: status.current.color,
                            }}
                          >
                            {status.current.icon} {status.current.name} · {user.xp ?? 0} XP
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  {editingId === user.id ? (
                    <div className="rounded-2xl border border-white/10 bg-night/60 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">Username</label>
                          <input
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand/60"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">Género</label>
                          <select
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                            style={{ colorScheme: "dark" }}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand/60"
                          >
                            <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="">Sin especificar</option>
                            <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Hombre">Hombre</option>
                            <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Mujer">Mujer</option>
                            <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Prefiero no decirlo">Prefiero no decirlo</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">País</label>
                          <CountrySelect value={editCountry} onChange={setEditCountry} locale="es" placeholder="Sin especificar" size="sm" />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={() => saveEditing(user.id)}
                          disabled={savingEdit}
                          className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:scale-[1.02] disabled:opacity-40"
                        >
                          {savingEdit ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : messagingId === user.id ? (
                    <div className="rounded-2xl border border-white/10 bg-night/60 p-4">
                      <label className="mb-1 block text-xs text-zinc-400">
                        Mensaje directo para {user.email}
                      </label>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={3}
                        placeholder="Escribe el mensaje que recibirá como notificación en la app..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder-zinc-600 focus:border-brand/60"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => sendMessage(user.id)}
                          disabled={sendingMessage || !messageText.trim()}
                          className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:scale-[1.02] disabled:opacity-40"
                        >
                          {sendingMessage ? "Enviando..." : "Enviar"}
                        </button>
                        <button
                          onClick={() => setMessagingId(null)}
                          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cancelar
                        </button>
                        {messageSentId === user.id && (
                          <span className="text-sm font-bold text-emerald-400">Enviado ✓</span>
                        )}
                      </div>
                    </div>
                  ) : linkingId === user.id ? (
                    <div className="rounded-2xl border border-white/10 bg-night/60 p-4">
                      <label className="mb-1 block text-xs text-zinc-400">
                        Club vinculado (puede editar su propia ficha en /mi-club)
                      </label>
                      <select
                        value={ownableClubs.find((c) => c.owner_user_id === user.id)?.id ?? ""}
                        onChange={(e) => setUserClub(user.id, e.target.value ? Number(e.target.value) : null)}
                        disabled={savingLink}
                        style={{ colorScheme: "dark" }}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand/60"
                      >
                        <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="">Ninguno</option>
                        {ownableClubs.map((c) => (
                          <option key={c.id} value={c.id} style={{ backgroundColor: "#18181b", color: "#fff" }}>
                            {c.name}{c.owner_user_id && c.owner_user_id !== user.id ? " (ya vinculado a otro usuario)" : ""}
                          </option>
                        ))}
                      </select>

                      <label className="mb-2 mt-4 block text-xs text-zinc-400">
                        Festivales vinculados (puede editarlos en /mi-festival)
                      </label>
                      <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                        {ownableFestivals.length === 0 && <p className="text-xs text-zinc-400">No hay festivales creados todavía.</p>}
                        {ownableFestivals.map((f) => {
                          const owned = f.owner_user_id === user.id
                          return (
                            <button
                              key={f.id}
                              type="button"
                              disabled={savingLink}
                              onClick={() => toggleUserFestival(user.id, f.id, owned)}
                              title={f.owner_user_id && !owned ? "Ya vinculado a otro usuario" : undefined}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                                owned
                                  ? "bg-purple-500 text-white"
                                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                              }`}
                            >
                              {f.title} {f.date ? `· ${f.date}` : ""}
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-4">
                        <button
                          onClick={() => setLinkingId(null)}
                          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEditing(user)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                      >
                        ✏️ Editar
                      </button>
                      <Link
                        href={`/admin/actividad?user=${user.id}`}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                      >
                        📈 Actividad
                      </Link>
                      <button
                        onClick={() => startMessaging(user.id)}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                      >
                        💬 Mensaje
                      </button>
                      <button
                        onClick={() => startLinking(user.id)}
                        className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-300 transition hover:bg-purple-500/20"
                      >
                        🔑 Vincular
                      </button>
                      <button
                        onClick={() => toggleBlocked(user)}
                        disabled={blockingId === user.id}
                        className={`rounded-xl border px-4 py-2 text-xs font-bold transition disabled:opacity-40 ${
                          user.is_blocked
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            : "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                        }`}
                      >
                        {blockingId === user.id ? "..." : user.is_blocked ? "✓ Desbloquear" : "🚫 Bloquear"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-zinc-400 text-sm text-center py-20">No se encontraron usuarios.</p>
              )}
            </div>
          )}
        </section>
      </>
    {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={() => setBlockTarget(null)}>
          <div className="w-full max-w-md rounded-card border border-red-500/30 bg-night p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black">Bloquear a {blockTarget.email}</p>
            <p className="mt-1 text-xs text-zinc-400">No podrá usar la app hasta que lo desbloquees. Verá el motivo en su idioma.</p>
            <label className="mt-4 block text-xs font-bold text-zinc-400">Motivo</label>
            <select
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="mt-1 w-full rounded-ctl border border-white/10 bg-night/70 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand/60"
            >
              {BLOCK_REASONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-bold text-zinc-400">Duración</label>
            <select
              value={blockDuration}
              onChange={(e) => setBlockDuration(e.target.value as BlockDuration)}
              style={{ colorScheme: "dark" }}
              className="mt-1 w-full rounded-ctl border border-white/10 bg-night/70 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand/60"
            >
              {BLOCK_DURATIONS.map((d) => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-bold text-zinc-400">Mensaje adicional (opcional, lo verá el usuario)</label>
            <textarea
              value={blockNote}
              onChange={(e) => setBlockNote(e.target.value)}
              rows={3}
              maxLength={300}
              className="mt-1 w-full rounded-ctl border border-white/10 bg-night/70 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand/60"
            />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setBlockTarget(null)} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-zinc-300">Cancelar</button>
              <button
                onClick={() => applyBlock(blockTarget, true)}
                disabled={blockingId === blockTarget.id}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {blockingId === blockTarget.id ? "..." : "Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
