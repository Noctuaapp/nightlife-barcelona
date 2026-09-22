"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"

import { supabase } from "../../../lib/supabase"

type ContactMessage = {
  id: number
  name: string | null
  email: string | null
  type: string
  subject: string | null
  message: string
  status: "new" | "reviewed" | "closed"
  created_at: string | null
  admin_reply: string | null
  replied_at: string | null
  user_id: string | null
}

export default function AdminMessagesPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [filter, setFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [sendOk, setSendOk] = useState(false)

  const [broadcastText, setBroadcastText] = useState("")
  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastOk, setBroadcastOk] = useState(false)
  const [broadcastError, setBroadcastError] = useState("")

  useEffect(() => {
    const checkAdmin = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error || data.session?.user.email !== "info@noctuaapp.com") {
        window.location.href = "/login"
        return
      }

      setCheckingAdmin(false)
    }

    checkAdmin()
  }, [])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.log("MESSAGES ERROR:", error)
      return
    }

    setMessages(data || [])
  }

  useEffect(() => {
    if (!checkingAdmin) {
      fetchMessages()
    }
  }, [checkingAdmin])

  const updateStatus = async (id: number, status: "new" | "reviewed" | "closed") => {
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id)

    if (error) {
      console.log("UPDATE MESSAGE ERROR:", error)
      return
    }

    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, status } : message)))
  }

  const openMessage = (message: ContactMessage) => {
    setSelectedId(message.id)
    setReplyText(message.admin_reply || "")
    setSendError("")
    setSendOk(false)

    if (message.status === "new") {
      updateStatus(message.id, "reviewed")
    }
  }

  const selectedMessage = messages.find((message) => message.id === selectedId) || null

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return

    setSending(true)
    setSendError("")
    setSendOk(false)

    const { error } = await supabase
      .from("contact_messages")
      .update({ admin_reply: replyText, replied_at: new Date().toISOString(), status: "closed" })
      .eq("id", selectedMessage.id)

    if (error) {
      console.log("SAVE REPLY ERROR:", error)
      setSendError("No se pudo guardar la respuesta")
      setSending(false)
      return
    }

    if (selectedMessage.user_id) {
      const { error: notifError } = await supabase.from("notifications").insert([
        {
          user_id: selectedMessage.user_id,
          title: "Respuesta de Noctua",
          body: replyText,
          type: "reply",
          related_message_id: selectedMessage.id,
        },
      ])

      if (notifError) {
        console.log("NOTIFICATION INSERT ERROR:", notifError)
      }
    }

    setSendOk(true)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === selectedMessage.id
          ? { ...m, admin_reply: replyText, replied_at: new Date().toISOString(), status: "closed" }
          : m
      )
    )
    setSending(false)
  }

  const sendBroadcast = async () => {
    if (!broadcastText.trim()) return

    setBroadcastSending(true)
    setBroadcastError("")
    setBroadcastOk(false)

    const { error } = await supabase.from("notifications").insert([
      {
        user_id: null,
        title: broadcastTitle.trim() || "Aviso de Noctua",
        body: broadcastText,
        type: "broadcast",
      },
    ])

    setBroadcastSending(false)

    if (error) {
      console.log("BROADCAST ERROR:", error)
      setBroadcastError("No se pudo enviar el aviso")
      return
    }

    setBroadcastOk(true)
    setBroadcastTitle("")
    setBroadcastText("")
  }

  const filteredMessages = filter === "all" ? messages : messages.filter((message) => message.status === filter)

  const stats = {
    all: messages.length,
    new: messages.filter((message) => message.status === "new").length,
    reviewed: messages.filter((message) => message.status === "reviewed").length,
    closed: messages.filter((message) => message.status === "closed").length,
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading messages...</p>
      </main>
    )
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin messages</p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">Contact inbox</h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Review user support, reports, venue suggestions and partnership requests.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <AdminLink href="/admin/dashboard">Dashboard</AdminLink>
              <AdminLink href="/admin">Clubs</AdminLink>
              <AdminLink href="/admin/events">Events</AdminLink>
              <AdminLink href="/admin/club-events">Club nights</AdminLink>
              <AdminLink href="/admin/tickets">Tickets</AdminLink>
              <AdminLink href="/admin/messages" active>
                Messages
              </AdminLink>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterCard label="All" value={stats.all} active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterCard label="New" value={stats.new} active={filter === "new"} onClick={() => setFilter("new")} />
            <FilterCard
              label="Reviewed"
              value={stats.reviewed}
              active={filter === "reviewed"}
              onClick={() => setFilter("reviewed")}
            />
            <FilterCard
              label="Closed"
              value={stats.closed}
              active={filter === "closed"}
              onClick={() => setFilter("closed")}
            />
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-[32px] border border-purple-500/20 bg-purple-500/5 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-purple-300">Aviso general a todos los usuarios</p>

            <input
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="Título (opcional, ej: Mantenimiento programado)"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white placeholder-zinc-600 outline-none focus:border-purple-500/50"
            />

            <textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              rows={3}
              placeholder="Escribe el aviso que verán todos los usuarios logueados..."
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white placeholder-zinc-600 outline-none focus:border-purple-500/50"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={sendBroadcast}
                disabled={broadcastSending || !broadcastText.trim()}
                className="rounded-2xl bg-purple-500 px-6 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:opacity-40"
              >
                {broadcastSending ? "Enviando..." : "Enviar a todos"}
              </button>
              {broadcastOk && <span className="text-sm font-bold text-emerald-400">Enviado ✓</span>}
              {broadcastError && <span className="text-sm font-bold text-red-400">{broadcastError}</span>}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-[32px] border border-white/10 bg-white/[0.03] p-4">
              {filteredMessages.length === 0 ? (
                <p className="p-6 text-center text-zinc-400">No hay mensajes en este filtro.</p>
              ) : (
                filteredMessages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => openMessage(message)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedId === message.id
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-white/[0.03] text-white hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{message.name || message.email || "Anónimo"}</span>
                      <span
                        className={`shrink-0 rounded-xl px-2 py-1 text-[10px] font-bold uppercase ${
                          selectedId === message.id ? "bg-black/10 text-black" : statusClass(message.status)
                        }`}
                      >
                        {message.status}
                      </span>
                    </div>

                    <p className={`mt-1 truncate text-sm font-semibold ${selectedId === message.id ? "text-black" : "text-zinc-200"}`}>
                      {message.subject || formatType(message.type)}
                    </p>

                    <p className={`mt-1 line-clamp-2 text-xs ${selectedId === message.id ? "text-black/70" : "text-zinc-500"}`}>
                      {message.message}
                    </p>

                    {message.created_at && (
                      <p className={`mt-2 text-[11px] ${selectedId === message.id ? "text-black/60" : "text-zinc-600"}`}>
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
              {!selectedMessage ? (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                  <h2 className="text-3xl font-black">Selecciona un mensaje</h2>
                  <p className="mt-3 max-w-sm text-zinc-400">
                    Elige un mensaje de la lista de la izquierda para leerlo completo y responder.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm">{formatType(selectedMessage.type)}</span>
                    <span className={`rounded-2xl px-4 py-2 text-sm font-bold ${statusClass(selectedMessage.status)}`}>
                      {selectedMessage.status}
                    </span>
                    {selectedMessage.created_at && (
                      <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm text-zinc-300">
                        {new Date(selectedMessage.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-5 text-3xl font-black">{selectedMessage.subject || "Sin asunto"}</h2>

                  <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-zinc-200">{selectedMessage.message}</p>

                  <div className="mt-6 grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
                    <p>
                      <span className="text-zinc-500">Nombre:</span> {selectedMessage.name || "No proporcionado"}
                    </p>
                    <p>
                      <span className="text-zinc-500">Email:</span> {selectedMessage.email || "No proporcionado"}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => updateStatus(selectedMessage.id, "new")}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                    >
                      Marcar nuevo
                    </button>
                    <button
                      onClick={() => updateStatus(selectedMessage.id, "reviewed")}
                      className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500 hover:text-black"
                    >
                      Revisado
                    </button>
                    <button
                      onClick={() => updateStatus(selectedMessage.id, "closed")}
                      className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-black"
                    >
                      Cerrado
                    </button>
                  </div>

                  {selectedMessage.admin_reply && (
                    <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Tu respuesta enviada</p>
                      <p className="mt-2 whitespace-pre-wrap text-zinc-200">{selectedMessage.admin_reply}</p>
                      {selectedMessage.replied_at && (
                        <p className="mt-2 text-xs text-zinc-500">{new Date(selectedMessage.replied_at).toLocaleString()}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-8 border-t border-white/10 pt-6">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Responder</p>

                    {!selectedMessage.user_id && (
                      <p className="mt-2 text-sm text-amber-400">
                        Este mensaje se envió sin sesión iniciada — se guardará como nota, pero no podemos entregarle una notificación dentro de la app.
                      </p>
                    )}

                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={5}
                      placeholder="Escribe tu respuesta (queda guardada como nota interna)..."
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white placeholder-zinc-600 outline-none focus:border-white/30"
                    />

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        onClick={sendReply}
                        disabled={sending || !replyText.trim()}
                        className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black transition hover:scale-[1.02] disabled:opacity-40"
                      >
                        {sending ? "Guardando..." : "Guardar respuesta"}
                      </button>

                      {sendOk && <span className="text-sm font-bold text-emerald-400">Guardado ✓</span>}
                      {sendError && <span className="text-sm font-bold text-red-400">{sendError}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </>
  )
}

function AdminLink({ href, active = false, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
        active ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
      }`}
    >
      {children}
    </Link>
  )
}

function FilterCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[24px] border p-5 text-left transition hover:scale-[1.02] ${
        active ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.03] text-white"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.25em] opacity-70">{label}</p>
      <h2 className="mt-2 text-4xl font-black">{value}</h2>
    </button>
  )
}

function formatType(type: string) {
  const labels: Record<string, string> = {
    user_support: "User support",
    report_issue: "Report issue",
    suggest_venue: "Suggest venue",
    club_partnership: "Club partnership",
    festival_partnership: "Festival partnership",
  }

  return labels[type] || type
}

function statusClass(status: string) {
  if (status === "new") {
    return "border border-blue-500/20 bg-blue-500/10 text-blue-300"
  }

  if (status === "reviewed") {
    return "border border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
  }

  return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
}