"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Search, Send, Trash2 } from "lucide-react"
import AdminShell, { invalidateAdminBadges } from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { toast } from "../../../components/ui/Toast"
import { createSlug } from "../../../lib/slug"

// Buzón de propietarios (30/10/2026): la conversación privada con la gente que has vinculado a un
// club o a un festival (la ven dentro de «Mi club» / «Mi festival»). Datos: supabase/59.
// - Una conversación por cuenta vinculada, aunque aún no haya mensajes (así puedes escribir tú
//   primero: «ya tienes acceso a tu ficha...»).
// - Los mensajes de los dueños salen como no leídos hasta que abres la conversación; el contador
//   del menú y de «Resumen» sale de aquí.
// - Sin email: el dueño ve tu respuesta dentro de la web (y en su campana de notificaciones).

type Msg = {
  id: number
  owner_user_id: string
  sender: "owner" | "admin"
  body: string
  club_id: number | null
  event_id: number | null
  created_at: string
  read_at: string | null
}
type Owned = { kind: "club" | "event"; id: number; name: string; slug: string | null }
type Convo = {
  userId: string
  email: string | null
  username: string | null
  owned: Owned[]
  msgs: Msg[]
  unread: number
  last: Msg | null
}

const when = (iso: string) => {
  const d = new Date(iso)
  const min = (Date.now() - d.getTime()) / 60000
  if (min < 1) return "ahora"
  if (min < 60) return `hace ${Math.round(min)} min`
  if (min < 24 * 60) return `hace ${Math.round(min / 60)} h`
  return d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" })
}
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export default function AdminBuzonPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [owned, setOwned] = useState<Owned[]>([])
  const [ownerOf, setOwnerOf] = useState<Record<string, string[]>>({}) // userId -> claves "club:1" / "event:2"
  const [people, setPeople] = useState<Record<string, { email: string | null; username: string | null }>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  const load = useCallback(async () => {
    const [clubsRes, eventsRes, msgsRes, usersRes] = await Promise.all([
      supabase.from("clubs").select("id,name,slug,owner_user_id").not("owner_user_id", "is", null),
      supabase.from("events").select("id,title,owner_user_id").not("owner_user_id", "is", null),
      supabase.from("owner_messages").select("*").order("created_at", { ascending: true }).limit(2000),
      supabase.rpc("admin_list_users"),
    ])
    if (msgsRes.error) {
      logError("BUZON LOAD:", msgsRes.error)
      setFailed(true)
      setLoaded(true)
      return
    }
    setFailed(false)
    const list: Owned[] = []
    const byUser: Record<string, string[]> = {}
    for (const c of (clubsRes.data || []) as { id: number; name: string; slug: string | null; owner_user_id: string }[]) {
      list.push({ kind: "club", id: c.id, name: c.name, slug: c.slug })
      ;(byUser[c.owner_user_id] ||= []).push(`club:${c.id}`)
    }
    for (const e of (eventsRes.data || []) as { id: number; title: string; owner_user_id: string }[]) {
      list.push({ kind: "event", id: e.id, name: e.title, slug: null })
      ;(byUser[e.owner_user_id] ||= []).push(`event:${e.id}`)
    }
    const ppl: Record<string, { email: string | null; username: string | null }> = {}
    for (const u of (usersRes.data || []) as { id: string; email: string | null; username: string | null }[]) ppl[u.id] = { email: u.email, username: u.username }
    setOwned(list)
    setOwnerOf(byUser)
    setPeople(ppl)
    setMsgs((msgsRes.data || []) as Msg[])
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (checkingAdmin) return
    load()
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load()
    }, 60_000)
    return () => window.clearInterval(id)
  }, [checkingAdmin, load])

  const convos = useMemo<Convo[]>(() => {
    const ids = new Set<string>([...Object.keys(ownerOf), ...msgs.map((m) => m.owner_user_id)])
    const items: Convo[] = []
    ids.forEach((userId) => {
      const mine = msgs.filter((m) => m.owner_user_id === userId)
      const keys = ownerOf[userId] || []
      items.push({
        userId,
        email: people[userId]?.email ?? null,
        username: people[userId]?.username ?? null,
        owned: keys.map((k) => owned.find((o) => `${o.kind}:${o.id}` === k)).filter(Boolean) as Owned[],
        msgs: mine,
        unread: mine.filter((m) => m.sender === "owner" && !m.read_at).length,
        last: mine.length ? mine[mine.length - 1] : null,
      })
    })
    return items.sort((a, b) => {
      if (!!b.unread !== !!a.unread) return b.unread ? 1 : -1
      if (a.last && b.last) return b.last.created_at.localeCompare(a.last.created_at)
      if (a.last || b.last) return a.last ? -1 : 1
      return label(a).localeCompare(label(b))
    })
  }, [msgs, owned, ownerOf, people])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return convos.filter((c) => {
      if (onlyUnread && !c.unread) return false
      if (!q) return true
      return `${label(c)} ${c.email || ""} ${c.username || ""}`.toLowerCase().includes(q)
    })
  }, [convos, query, onlyUnread])

  const current = convos.find((c) => c.userId === selected) || null
  const totalUnread = convos.reduce((n, c) => n + c.unread, 0)

  // Al abrir una conversación, lo que escribió el dueño pasa a leído.
  useEffect(() => {
    if (!current || current.unread === 0) return
    const ids = current.msgs.filter((m) => m.sender === "owner" && !m.read_at).map((m) => m.id)
    const nowIso = new Date().toISOString()
    supabase
      .from("owner_messages")
      .update({ read_at: nowIso })
      .in("id", ids)
      .is("read_at", null)
      .then(({ error }) => {
        if (error) {
          logError("BUZON READ:", error)
          return
        }
        setMsgs((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read_at: nowIso } : m)))
        invalidateAdminBadges()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, current?.unread])

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [selected, current?.msgs.length])

  useEffect(() => {
    setReply("")
    setConfirmClear(false)
  }, [selected])

  const send = async () => {
    const body = reply.trim()
    if (!current || !body || sending) return
    setSending(true)
    const { data, error } = await supabase
      .from("owner_messages")
      .insert({ owner_user_id: current.userId, sender: "admin", body })
      .select("*")
      .single()
    setSending(false)
    if (error || !data) {
      logError("BUZON SEND:", error)
      toast("No se pudo enviar el mensaje")
      return
    }
    setMsgs((prev) => [...prev, data as Msg])
    setReply("")
  }

  const clearConversation = async () => {
    if (!current) return
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    const { error } = await supabase.from("owner_messages").delete().eq("owner_user_id", current.userId)
    if (error) {
      logError("BUZON DELETE:", error)
      toast("No se pudo borrar la conversación")
      return
    }
    setMsgs((prev) => prev.filter((m) => m.owner_user_id !== current.userId))
    setConfirmClear(false)
    invalidateAdminBadges()
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night text-ink">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </main>
    )
  }

  return (
    <AdminShell
      title="Buzón de propietarios"
      subtitle="Conversación privada con quien gestiona un club o un festival. Lo ven dentro de «Mi club» o «Mi festival»; no se envía email."
    >
      {!loaded ? (
        <p className="text-sm text-zinc-400">Cargando…</p>
      ) : failed ? (
        <div className="rounded-card border border-warn/40 bg-warn/[0.08] p-5 text-sm text-zinc-200">
          No se ha podido cargar el buzón. Si todavía no has ejecutado el SQL 59 en Supabase, hazlo y recarga esta página.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* Lista de conversaciones */}
          <section className={`${selected ? "hidden lg:block" : ""}`} aria-label="Conversaciones">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por club, festival o email"
                className="w-full rounded-ctl border border-white/15 bg-night py-3 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-zinc-500 focus:border-brand"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setOnlyUnread(false)}
                aria-pressed={!onlyUnread}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${!onlyUnread ? "bg-white text-night" : "border border-white/15 text-zinc-300"}`}
              >
                Todos ({convos.length})
              </button>
              <button
                type="button"
                onClick={() => setOnlyUnread(true)}
                aria-pressed={onlyUnread}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${onlyUnread ? "bg-white text-night" : "border border-white/15 text-zinc-300"}`}
              >
                Sin leer ({totalUnread})
              </button>
            </div>

            {shown.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-400">
                {convos.length === 0
                  ? "Todavía no hay nadie vinculado. Cuando vincules a alguien a un club o festival (Admin › Usuarios) aparecerá aquí."
                  : "Nada con ese filtro."}
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {shown.map((c) => (
                  <li key={c.userId}>
                    <button
                      type="button"
                      onClick={() => setSelected(c.userId)}
                      aria-current={selected === c.userId ? "true" : undefined}
                      className={`w-full rounded-card border p-3.5 text-left transition ${
                        selected === c.userId ? "border-brand/50 bg-brand/[0.08]" : "border-white/10 bg-surface hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-semibold text-ink">{label(c)}</span>
                        {c.unread > 0 ? (
                          <span className="shrink-0 rounded-full bg-warn px-2 py-0.5 text-[11px] font-bold leading-tight text-night">
                            {c.unread}
                            <span className="sr-only"> sin leer</span>
                          </span>
                        ) : (
                          c.last && <span className="shrink-0 text-[11px] text-zinc-500">{when(c.last.created_at)}</span>
                        )}
                      </span>
                      <span className="mt-1 block truncate text-xs text-zinc-400">
                        {c.last ? `${c.last.sender === "admin" ? "Tú: " : ""}${c.last.body}` : c.email || "Sin mensajes todavía"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Conversación */}
          <section className={`${selected ? "" : "hidden lg:block"} min-w-0`} aria-label="Conversación">
            {!current ? (
              <div className="rounded-card border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">
                Elige una conversación de la lista.
              </div>
            ) : (
              <div className="rounded-card border border-white/10 bg-surface p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-300 hover:text-ink lg:hidden"
                >
                  <ArrowLeft size={16} aria-hidden="true" /> Todas las conversaciones
                </button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-ink">{label(current)}</h2>
                    <p className="mt-0.5 truncate text-sm text-zinc-400">
                      {[current.username, current.email].filter(Boolean).join(" · ") || "Cuenta sin datos"}
                    </p>
                    {current.owned.some((o) => o.kind === "club") && (
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {current.owned
                          .filter((o) => o.kind === "club")
                          .map((o) => (
                            <Link key={o.id} href={`/clubs/${o.slug || createSlug(o.name)}`} className="inline-flex items-center gap-1 font-semibold text-brand-soft hover:underline">
                              Ver ficha{current.owned.length > 1 ? `: ${o.name}` : ""} <ExternalLink size={13} aria-hidden="true" />
                            </Link>
                          ))}
                      </p>
                    )}
                  </div>
                  {current.msgs.length > 0 && (
                    <button
                      type="button"
                      onClick={clearConversation}
                      className={`flex items-center gap-1.5 rounded-ctl px-3.5 py-2 text-sm font-semibold transition ${
                        confirmClear ? "bg-red-500 text-white" : "border border-red-500/30 text-red-300 hover:bg-red-500/10"
                      }`}
                    >
                      <Trash2 size={14} aria-hidden="true" /> {confirmClear ? "Pulsa otra vez para borrar" : "Borrar conversación"}
                    </button>
                  )}
                </div>

                <div
                  ref={threadRef}
                  role="log"
                  aria-live="polite"
                  className="mt-4 max-h-[28rem] min-h-[10rem] space-y-3 overflow-y-auto rounded-ctl border border-white/10 bg-night/60 p-3 sm:p-4"
                >
                  {current.msgs.length === 0 && (
                    <p className="py-6 text-center text-sm text-zinc-400">
                      Aún no habéis hablado. Puedes escribir tú primero: el dueño verá un aviso en la web.
                    </p>
                  )}
                  {current.msgs.map((m) => {
                    const mine = m.sender === "admin"
                    const about =
                      current.owned.length > 1
                        ? current.owned.find((o) => (o.kind === "club" ? o.id === m.club_id : o.id === m.event_id))?.name
                        : null
                    return (
                      <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[88%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-white/[0.08] text-ink"
                          }`}
                        >
                          {m.body}
                        </div>
                        <p className="mt-1 px-1 text-[11px] text-zinc-500">
                          {mine ? "Tú" : label(current)} · {stamp(m.created_at)}
                          {about ? ` · ${about}` : ""}
                          {mine && (m.read_at ? " · leído" : " · sin leer")}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <label htmlFor="buzon-reply" className="sr-only">
                  Respuesta
                </label>
                <textarea
                  id="buzon-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  rows={3}
                  placeholder="Escribe tu respuesta…"
                  className="mt-4 min-h-[88px] w-full rounded-ctl border border-white/15 bg-night px-4 py-3 text-base text-ink outline-none placeholder:text-zinc-500 focus:border-brand"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-500">Ctrl + Intro para enviar · máximo 2000 caracteres</p>
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || !reply.trim() || reply.length > 2000}
                    className="flex items-center gap-2 rounded-ctl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
                  >
                    <Send size={15} aria-hidden="true" /> {sending ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  )
}

// Nombre de la conversación: la(s) ficha(s) que gestiona; si no la hay (la desvincularon), su usuario o email.
function label(c: Convo): string {
  if (c.owned.length) return c.owned.map((o) => o.name).join(" · ")
  return c.username || c.email || "Cuenta sin ficha vinculada"
}
