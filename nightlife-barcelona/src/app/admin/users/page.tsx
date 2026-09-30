"use client"

import { useEffect, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { getSortedCountries } from "../../../lib/countries"
import CountrySelect from "../../../components/ui/CountrySelect"

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
  is_blocked: boolean
}

type OwnableClub = { id: number; name: string; owner_user_id: string | null }
// Festivales (tabla "events", distinta de las noches de club "club_events"). Una noche de club
// pertenece automáticamente al dueño del club (se gestiona dentro de /mi-club), pero un festival
// no está atado a ningún club, así que cada uno se vincula a mano aquí, igual que un club.
type OwnableFestival = { id: number; title: string; date: string | null; owner_user_id: string | null }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [search, setSearch] = useState("")

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
      if (data.session?.user.email !== "info@noctuaapp.com") {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    }
    checkAdmin()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users_view").select("*").order("created_at", { ascending: false })
    if (error) { console.log("USERS ERROR:", error); return }

    // country se pide aparte de users_view (igual que is_blocked) porque la vista de Supabase
    // no incluía esta columna hasta ahora: así no hace falta tocar la vista para que aparezca.
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, is_blocked, country")
    if (profilesError) console.log("PROFILES ERROR:", profilesError)

    const blockedMap = new Map((profiles || []).map((p) => [p.id, !!p.is_blocked]))
    const countryMap = new Map((profiles || []).map((p) => [p.id, p.country as string | null]))

    if (data) {
      setUsers(
        data.map((u) => ({
          ...u,
          is_blocked: blockedMap.get(u.id) ?? false,
          country: u.country ?? countryMap.get(u.id) ?? null,
        }))
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!checkingAdmin) fetchUsers()
  }, [checkingAdmin])

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
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

  const toggleBlocked = async (user: User) => {
    const nextBlocked = !user.is_blocked
    if (nextBlocked && !window.confirm(`¿Bloquear a ${user.email}? No podrá usar la app hasta que lo desbloquees.`)) {
      return
    }

    setBlockingId(user.id)
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, is_blocked: nextBlocked })
    setBlockingId(null)

    if (error) {
      console.log("BLOCK USER ERROR:", error)
      window.alert("No se pudo actualizar el bloqueo")
      return
    }

    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_blocked: nextBlocked } : u)))
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
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading admin...</p>
      </main>
    )
  }

  return (
    <AdminShell title="Users" subtitle={`${users.length} usuarios registrados en Noctua.`}>
      <>
        <section className="mx-auto max-w-7xl">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o username..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 outline-none mb-6"
          />

          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-20">Cargando usuarios...</p>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`rounded-[24px] border p-6 flex flex-col gap-4 ${
                    user.is_blocked ? "border-red-500/30 bg-red-500/[0.04]" : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-black text-sm">
                          {user.email?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{user.email}</p>
                          {user.username && <p className="text-sm text-zinc-400">@{user.username}</p>}
                        </div>
                        {user.is_blocked && (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase text-red-300">
                            Bloqueado
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      {user.gender && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {user.gender === "Hombre" ? "♂️" : user.gender === "Mujer" ? "♀️" : "🧑"} {user.gender}
                        </span>
                      )}
                      {user.country && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {ADMIN_COUNTRIES.find((c) => c.es === user.country)?.flag || "🌍"} {user.country}
                        </span>
                      )}
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        📅 Registrado: {new Date(user.created_at).toLocaleDateString("es-ES")}
                      </span>
                      {user.last_sign_in_at && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          🕒 Último acceso: {new Date(user.last_sign_in_at).toLocaleDateString("es-ES")}
                        </span>
                      )}
                    </div>
                  </div>

                  {editingId === user.id ? (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">Username</label>
                          <input
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">Género</label>
                          <select
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                            style={{ colorScheme: "dark" }}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500/50"
                          >
                            <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="">Sin especificar</option>
                            <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Hombre">Hombre</option>
                            <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Mujer">Mujer</option>
                            <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Prefiero no decirlo">Prefiero no decirlo</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">País</label>
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
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">
                        Mensaje directo para {user.email}
                      </label>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={3}
                        placeholder="Escribe el mensaje que recibirá como notificación en la app..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder-zinc-600 focus:border-purple-500/50"
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
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">
                        Club vinculado (puede editar su propia ficha en /mi-club)
                      </label>
                      <select
                        value={ownableClubs.find((c) => c.owner_user_id === user.id)?.id ?? ""}
                        onChange={(e) => setUserClub(user.id, e.target.value ? Number(e.target.value) : null)}
                        disabled={savingLink}
                        style={{ colorScheme: "dark" }}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500/50"
                      >
                        <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="">Ninguno</option>
                        {ownableClubs.map((c) => (
                          <option key={c.id} value={c.id} style={{ backgroundColor: "#18181b", color: "#fff" }}>
                            {c.name}{c.owner_user_id && c.owner_user_id !== user.id ? " (ya vinculado a otro usuario)" : ""}
                          </option>
                        ))}
                      </select>

                      <label className="mb-2 mt-4 block text-xs uppercase tracking-widest text-zinc-500">
                        Festivales vinculados (puede editarlos en /mi-festival)
                      </label>
                      <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                        {ownableFestivals.length === 0 && <p className="text-xs text-zinc-600">No hay festivales creados todavía.</p>}
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
                <p className="text-zinc-500 text-sm text-center py-20">No se encontraron usuarios.</p>
              )}
            </div>
          )}
        </section>
      </>
    </AdminShell>
  )
}
