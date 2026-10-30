"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MessageCircle, Send, Lock } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { logError } from "../../lib/log"
import { toast } from "../ui/Toast"

// Buzón de propietarios (30/10/2026), dentro de «Mi club» y «Mi festival»: una conversación
// privada entre quien gestiona la ficha y Noctua. Solo las cuentas vinculadas a un club o a un
// evento pueden usarla (lo garantiza la base de datos, supabase/59), y cada una solo ve la suya.
// Sin email: cuando Noctua responde, el dueño ve el número de mensajes nuevos en la propia página
// y una notificación en la campana de la web.
//
// - Los mensajes de Noctua se marcan como leídos cuando el buzón se ve en pantalla.
// - Se refresca solo cada 45 s mientras la pestaña está abierta.
// - `topics` = las fichas del dueño. Si tiene más de una (varios festivales), puede elegir sobre
//   cuál escribe; con una sola, el mensaje queda ligado a ella sin preguntar.

export type InboxTopic = { type: "club" | "event"; id: number; name: string }

type Msg = {
  id: number
  sender: "owner" | "admin"
  body: string
  club_id: number | null
  event_id: number | null
  created_at: string
  read_at: string | null
}

const MAX_CHARS = 2000
const POLL_MS = 45_000

export default function OwnerInbox({
  userId,
  topics,
  onUnreadChange,
}: {
  userId: string
  topics: InboxTopic[]
  onUnreadChange?: (unread: number) => void
}) {
  const { t, locale } = useLanguage()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [topicKey, setTopicKey] = useState(topics[0] ? `${topics[0].type}:${topics[0].id}` : "")
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const [visible, setVisible] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("owner_messages")
      .select("id,sender,body,club_id,event_id,created_at,read_at")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true })
      .limit(300)
    if (error) {
      logError("OWNER INBOX LOAD:", error)
      setLoadFailed(true)
      setLoaded(true)
      return
    }
    setLoadFailed(false)
    setMsgs((data || []) as Msg[])
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    load()
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  const unreadIds = msgs.filter((m) => m.sender === "admin" && !m.read_at).map((m) => m.id)
  const unread = unreadIds.length

  useEffect(() => {
    onUnreadChange?.(unread)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread])

  // ¿Se está viendo el buzón? Entonces lo que Noctua haya escrito cuenta como leído.
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || unreadIds.length === 0 || document.visibilityState !== "visible") return
    const ids = unreadIds
    const nowIso = new Date().toISOString()
    // Se marca tras un instante para que se vea el «nuevo» antes de desaparecer.
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from("owner_messages").update({ read_at: nowIso }).in("id", ids).is("read_at", null)
      if (error) {
        logError("OWNER INBOX READ:", error)
        return
      }
      setMsgs((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read_at: nowIso } : m)))
    }, 1800)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, unreadIds.join(",")])

  // Siempre al último mensaje, sin mover la página (solo el recuadro de la conversación).
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length, loaded])

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    if (body.length > MAX_CHARS) return
    setSending(true)
    const topic = topics.find((x) => `${x.type}:${x.id}` === topicKey) || topics[0]
    const { data, error } = await supabase
      .from("owner_messages")
      .insert({
        owner_user_id: userId,
        sender: "owner",
        body,
        club_id: topic?.type === "club" ? topic.id : null,
        event_id: topic?.type === "event" ? topic.id : null,
      })
      .select("id,sender,body,club_id,event_id,created_at,read_at")
      .single()
    setSending(false)
    if (error || !data) {
      logError("OWNER INBOX SEND:", error)
      toast(String(error?.message || "").includes("owner_msg_rate_limit") ? t("ownerInbox.errLimit") : t("ownerInbox.errSend"), 5000)
      return
    }
    setMsgs((prev) => [...prev, data as Msg])
    setText("")
    toast(t("ownerInbox.sent"))
  }

  const stamp = (iso: string) => {
    const d = new Date(iso)
    const sameDay = d.toDateString() === new Date().toDateString()
    return sameDay
      ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
  }

  const topicName = (m: Msg) => {
    if (topics.length < 2) return null
    const hit = topics.find((x) => (x.type === "club" ? x.id === m.club_id : x.id === m.event_id))
    return hit ? hit.name : null
  }

  const ideas = [t("ownerInbox.ideaMap"), t("ownerInbox.ideaVerified"), t("ownerInbox.ideaWrong"), t("ownerInbox.ideaDoubt")]
  const over = text.length > MAX_CHARS

  return (
    <div ref={rootRef} className="rounded-card border border-white/10 bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <MessageCircle size={18} className="shrink-0 text-brand-soft" aria-hidden="true" /> {t("ownerInbox.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{t("ownerInbox.subtitle")}</p>
        </div>
        {unread > 0 && (
          <span className="shrink-0 rounded-full bg-warn px-2.5 py-1 text-xs font-bold text-night" aria-live="polite">
            {t("ownerInbox.unread").replace("{n}", String(unread))}
          </span>
        )}
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label={t("ownerInbox.title")}
        className="mt-4 max-h-[26rem] min-h-[8rem] space-y-3 overflow-y-auto rounded-ctl border border-white/10 bg-night/60 p-3 sm:p-4"
      >
        {!loaded && <p className="py-6 text-center text-sm text-zinc-400">{t("ownerInbox.loading")}</p>}
        {loaded && loadFailed && <p className="py-6 text-center text-sm text-warn">{t("ownerInbox.errLoad")}</p>}
        {loaded && !loadFailed && msgs.length === 0 && (
          <div className="py-4 text-center">
            <p className="mx-auto max-w-sm text-sm text-zinc-300">{t("ownerInbox.empty")}</p>
            <p className="mt-4 text-xs font-semibold text-zinc-400">{t("ownerInbox.ideasTitle")}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => {
                    setText(`${idea}: `)
                    areaRef.current?.focus()
                  }}
                  className="rounded-full border border-white/15 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.sender === "owner"
          const isNew = !mine && !m.read_at
          const about = topicName(m)
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[88%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-white/[0.08] text-ink"
                } ${isNew ? "ring-1 ring-warn/70" : ""}`}
              >
                {m.body}
              </div>
              <p className="mt-1 px-1 text-[11px] text-zinc-500">
                {mine ? t("ownerInbox.you") : t("ownerInbox.noctua")} · {stamp(m.created_at)}
                {about ? ` · ${about}` : ""}
                {isNew && <span className="ml-1.5 font-bold text-warn">{t("ownerInbox.new")}</span>}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-4">
        {topics.length > 1 && (
          <div className="mb-3">
            <label htmlFor="inbox-topic" className="mb-1.5 block text-sm font-semibold text-zinc-300">
              {t("ownerInbox.about")}
            </label>
            <select
              id="inbox-topic"
              value={topicKey}
              onChange={(e) => setTopicKey(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3 text-base text-ink outline-none transition focus:border-brand"
            >
              {topics.map((x) => (
                <option key={`${x.type}:${x.id}`} value={`${x.type}:${x.id}`}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <label htmlFor="inbox-text" className="sr-only">
          {t("ownerInbox.placeholder")}
        </label>
        <textarea
          id="inbox-text"
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              send()
            }
          }}
          rows={3}
          placeholder={t("ownerInbox.placeholder")}
          className="min-h-[88px] w-full rounded-ctl border border-white/15 bg-night px-4 py-3 text-base text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Lock size={12} aria-hidden="true" /> {t("ownerInbox.private")}
            {text.length > MAX_CHARS - 300 && (
              <span className={`ml-2 tabular-nums ${over ? "font-semibold text-red-300" : ""}`}>
                {text.length}/{MAX_CHARS}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim() || over}
            className="flex items-center gap-2 rounded-ctl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
          >
            <Send size={15} aria-hidden="true" /> {sending ? t("ownerInbox.sending") : t("ownerInbox.send")}
          </button>
        </div>
      </div>
    </div>
  )
}
