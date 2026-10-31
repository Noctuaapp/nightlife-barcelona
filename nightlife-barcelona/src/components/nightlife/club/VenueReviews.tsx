"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Icon from "../../ui/Icon"
import Stars from "./Stars"
import { toast } from "../../ui/Toast"
import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../context/LanguageContext"
import { useIsAdmin } from "../../../lib/useIsAdmin"
import { levelByKey } from "../../../lib/xp"

// Opiniones de Noctua (25/10/2026): las reseñas propias de los usuarios de Noctua, en la
// pestaña «Opiniones» de cada club (y al final de cada evento), por encima de las de Google.
// Una por persona y local, editable; hay que tener cuenta; el dueño no puede opinar de su local;
// se pueden denunciar (con 3 denuncias se ocultan solas) y el admin las puede borrar desde aquí.
// Reglas y avisos al admin: supabase/39_opiniones_noctua_y_neo_caja_negra.sql.

type Review = {
  id: number
  user_id: string
  rating: number
  body: string | null
  author_name: string | null
  author_level: string | null
  hidden: boolean
  created_at: string
  updated_at: string
  thanks_count?: number
}

// Respuesta del local a una opinión (supabase/60): la escribe el dueño vinculado del club o del
// evento, una por opinión.
type Reply = {
  id: number
  review_id: number
  body: string
  hidden: boolean
  created_at: string
  updated_at: string
}
const REPLY_COLS = "id, review_id, body, hidden, created_at, updated_at"
const REPLY_MAX = 600

const MAX_LEN = 800

export default function VenueReviews({
  venueType,
  venueId,
  isOwner = false,
}: {
  venueType: "club" | "event"
  venueId: number
  isOwner?: boolean
}) {
  const { t, locale } = useLanguage()
  const isAdmin = useIsAdmin()
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [reported, setReported] = useState<Set<number>>(new Set())
  // «Gracias» (supabase/41): las opiniones a las que ya he dado las gracias.
  const [thanked, setThanked] = useState<Set<number>>(new Set())
  const [thanksReady, setThanksReady] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftRating, setDraftRating] = useState(0)
  const [draftBody, setDraftBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [showAll, setShowAll] = useState(false)
  // Respuestas del local (supabase/60). Si la tabla aún no existe, simplemente no se ofrecen.
  const [replies, setReplies] = useState<Record<number, Reply>>({})
  const [repliesReady, setRepliesReady] = useState(false)
  const [replyingId, setReplyingId] = useState<number | null>(null)
  const [replyDraft, setReplyDraft] = useState("")
  const [savingReply, setSavingReply] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      const uid = s.session?.user.id ?? null
      const base = "id, user_id, rating, body, author_name, author_level, hidden, created_at, updated_at"
      const query = (cols: string) =>
        supabase.from("venue_reviews").select(cols).eq("venue_type", venueType).eq("venue_id", venueId).order("created_at", { ascending: false }).limit(200)
      // Con el SQL 41 ya ejecutado viene también el recuento de «Gracias»; si no, sin él.
      let res = await query(`${base}, thanks_count`)
      const withThanks = !res.error
      if (res.error) res = await query(base)
      const { data, error } = res
      if (!alive) return
      setUserId(uid)
      if (error) {
        setMissing(true)
        setReviews([])
        return
      }
      setReviews((data || []) as unknown as Review[])
      if (alive) setThanksReady(withThanks)
      if (data && data.length) {
        const { data: rp, error: rpErr } = await supabase
          .from("venue_review_replies")
          .select(REPLY_COLS)
          .eq("venue_type", venueType)
          .eq("venue_id", venueId)
        if (alive && !rpErr) {
          setRepliesReady(true)
          const map: Record<number, Reply> = {}
          for (const x of (rp || []) as unknown as Reply[]) map[x.review_id] = x
          setReplies(map)
        }
      }
      if (uid && data && data.length) {
        const { data: reps } = await supabase.from("venue_review_reports").select("review_id").eq("reporter_id", uid)
        if (alive && reps) setReported(new Set(reps.map((r: { review_id: number }) => r.review_id)))
        if (withThanks) {
          const { data: th } = await supabase.from("venue_review_thanks").select("review_id").eq("user_id", uid)
          if (alive && th) setThanked(new Set(th.map((r: { review_id: number }) => r.review_id)))
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [venueType, venueId])

  const mine = useMemo(() => (reviews || []).find((r) => r.user_id === userId) || null, [reviews, userId])
  const visible = useMemo(() => (reviews || []).filter((r) => !r.hidden || r.user_id === userId || isAdmin), [reviews, userId, isAdmin])
  const publicOnes = (reviews || []).filter((r) => !r.hidden)
  const avg = publicOnes.length ? publicOnes.reduce((a, r) => a + r.rating, 0) / publicOnes.length : null
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: publicOnes.filter((r) => r.rating === n).length }))

  if (missing || reviews === null) return null

  const startEdit = () => {
    setDraftRating(mine?.rating || 0)
    setDraftBody(mine?.body || "")
    setEditing(true)
  }

  const save = async () => {
    if (!userId || draftRating < 1) return
    setSaving(true)
    const body = draftBody.trim() || null
    const res = mine
      ? await supabase.from("venue_reviews").update({ rating: draftRating, body }).eq("id", mine.id).select().single()
      : await supabase.from("venue_reviews").insert({ venue_type: venueType, venue_id: venueId, rating: draftRating, body }).select().single()
    setSaving(false)
    if (res.error || !res.data) {
      const msg = res.error?.message || ""
      toast(/propio local|own/i.test(msg) ? t("reviews.errorOwner") : /máximo|limit/i.test(msg) ? t("reviews.errorLimit") : t("reviews.errorSave"))
      return
    }
    const saved = res.data as Review
    setReviews((prev) => [saved, ...(prev || []).filter((r) => r.id !== saved.id)])
    setEditing(false)
    toast(mine ? t("reviews.updated") : t("reviews.thanks"))
  }

  const remove = async (r: Review) => {
    if (!window.confirm(r.user_id === userId ? t("reviews.deleteMineConfirm") : t("reviews.deleteAdminConfirm"))) return
    const { error } = await supabase.from("venue_reviews").delete().eq("id", r.id)
    if (error) {
      toast(t("reviews.errorSave"))
      return
    }
    setReviews((prev) => (prev || []).filter((x) => x.id !== r.id))
    if (r.user_id === userId) setEditing(false)
  }

  const toggleHidden = async (r: Review) => {
    const { error } = await supabase.from("venue_reviews").update({ hidden: !r.hidden }).eq("id", r.id)
    if (!error) setReviews((prev) => (prev || []).map((x) => (x.id === r.id ? { ...x, hidden: !r.hidden } : x)))
  }

  const startReply = (r: Review) => {
    setReplyingId(r.id)
    setReplyDraft(replies[r.id]?.body || "")
  }

  const saveReply = async (r: Review) => {
    const body = replyDraft.trim()
    if (!body || savingReply) return
    setSavingReply(true)
    const existing = replies[r.id]
    const res = existing
      ? await supabase.from("venue_review_replies").update({ body }).eq("id", existing.id).select(REPLY_COLS).single()
      : await supabase.from("venue_review_replies").insert({ review_id: r.id, venue_type: venueType, venue_id: venueId, body }).select(REPLY_COLS).single()
    setSavingReply(false)
    if (res.error || !res.data) {
      toast(t("reviews.replyError"))
      return
    }
    setReplies((prev) => ({ ...prev, [r.id]: res.data as unknown as Reply }))
    setReplyingId(null)
    toast(t("reviews.replyPosted"))
  }

  const removeReply = async (r: Review) => {
    const existing = replies[r.id]
    if (!existing) return
    if (!window.confirm(t("reviews.replyDeleteConfirm"))) return
    const { error } = await supabase.from("venue_review_replies").delete().eq("id", existing.id)
    if (error) {
      toast(t("reviews.replyError"))
      return
    }
    setReplies((prev) => {
      const next = { ...prev }
      delete next[r.id]
      return next
    })
  }

  const toggleReplyHidden = async (r: Review) => {
    const existing = replies[r.id]
    if (!existing) return
    const { error } = await supabase.from("venue_review_replies").update({ hidden: !existing.hidden }).eq("id", existing.id)
    if (!error) setReplies((prev) => ({ ...prev, [r.id]: { ...existing, hidden: !existing.hidden } }))
  }

  const toggleThanks = async (r: Review) => {
    if (!userId) {
      toast(t("reviews.loginToThank"))
      return
    }
    const had = thanked.has(r.id)
    const bump = (d: number) =>
      setReviews((prev) => (prev || []).map((x) => (x.id === r.id ? { ...x, thanks_count: Math.max(0, (x.thanks_count || 0) + d) } : x)))
    setThanked((prev) => {
      const next = new Set(prev)
      if (had) next.delete(r.id)
      else next.add(r.id)
      return next
    })
    bump(had ? -1 : 1)
    const { error } = had
      ? await supabase.from("venue_review_thanks").delete().eq("review_id", r.id).eq("user_id", userId)
      : await supabase.from("venue_review_thanks").insert({ review_id: r.id })
    if (error) {
      setThanked((prev) => {
        const next = new Set(prev)
        if (had) next.add(r.id)
        else next.delete(r.id)
        return next
      })
      bump(had ? 1 : -1)
    }
  }

  const report = async (r: Review) => {
    if (!userId) {
      toast(t("reviews.loginToReport"))
      return
    }
    if (!window.confirm(t("reviews.reportConfirm"))) return
    setReported((prev) => new Set(prev).add(r.id))
    await supabase.from("venue_review_reports").insert({ review_id: r.id })
    toast(t("reviews.reported"))
  }

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : `${locale}-ES`, { month: "long", year: "numeric" })

  const loginHref = typeof window !== "undefined" ? `/login?next=${encodeURIComponent(window.location.pathname + "?tab=reviews")}` : "/login"
  const shown = showAll ? visible : visible.slice(0, 6)

  return (
    <section aria-labelledby={`noctua-reviews-${venueType}-${venueId}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id={`noctua-reviews-${venueType}-${venueId}`} className="text-lg font-semibold text-ink">
            {t("reviews.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{t("reviews.subtitle")}</p>
        </div>
        {avg !== null && (
          <div className="flex items-center gap-3">
            <p className="font-display text-4xl leading-none text-ink">{avg.toFixed(1)}</p>
            <div>
              <Stars rating={avg} size="h-4 w-4" />
              <p className="mt-1 text-xs text-zinc-400">
                {publicOnes.length} {publicOnes.length === 1 ? t("reviews.one") : t("reviews.many")}
              </p>
            </div>
          </div>
        )}
      </div>

      {publicOnes.length >= 3 && (
        <ul className="mt-4 max-w-sm space-y-1" aria-label={t("reviews.distribution")}>
          {dist.map((d) => (
            <li key={d.n} className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-3 tabular-nums">{d.n}</span>
              <Icon name="star" className="h-3 w-3 text-warn" />
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-warn" style={{ width: `${(d.c / publicOnes.length) * 100}%` }} />
              </span>
              <span className="w-6 text-right tabular-nums">{d.c}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Escribir / editar la mía */}
      <div className="mt-5">
        {!userId ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-white/15 bg-white/[0.02] p-4">
            <p className="text-sm text-zinc-300">{t("reviews.loginPrompt")}</p>
            <Link href={loginHref} className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-night">
              {t("reviews.loginCta")}
            </Link>
          </div>
        ) : isOwner && !isAdmin ? (
          <p className="rounded-card border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">{t("reviews.ownerNote")}</p>
        ) : editing || !mine ? (
          <div className="rounded-card border border-white/10 bg-surface p-4 sm:p-5">
            <p className="text-sm font-semibold text-ink">{mine ? t("reviews.editTitle") : t("reviews.writeTitle")}</p>
            <div className="mt-3 flex gap-1" role="radiogroup" aria-label={t("reviews.yourRating")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={draftRating === n}
                  aria-label={`${n}`}
                  onClick={() => {
                    setDraftRating(n)
                    if (!editing) setEditing(true)
                  }}
                  className="rounded-md p-1 transition active:scale-90"
                >
                  <Icon name="star" className={`h-8 w-8 text-warn transition ${n <= draftRating ? "" : "opacity-25"}`} />
                </button>
              ))}
            </div>
            {(editing || draftRating > 0) && (
              <>
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value.slice(0, MAX_LEN))}
                  rows={3}
                  placeholder={t("reviews.placeholder")}
                  className="mt-3 w-full resize-y rounded-ctl border border-white/10 bg-night px-3 py-2.5 text-sm text-ink placeholder:text-zinc-500 focus:border-brand focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] tabular-nums text-zinc-500">
                    {draftBody.length}/{MAX_LEN}
                  </span>
                  <div className="flex gap-2">
                    {mine && (
                      <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5">
                        {t("reviews.cancel")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving || draftRating < 1}
                      className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-night transition disabled:opacity-40"
                    >
                      {saving ? t("reviews.saving") : mine ? t("reviews.saveChanges") : t("reviews.publish")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        userId && !isOwner ? null : <p className="mt-5 text-sm text-zinc-500">{t("reviews.empty")}</p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((r) => {
            const lvl = r.author_level ? levelByKey(r.author_level) : null
            const isMine = r.user_id === userId
            const rp = replies[r.id]
            const canReply = isOwner && repliesReady && !r.hidden
            return (
              <li key={r.id} className={`rounded-card border bg-surface p-4 ${isMine ? "border-brand/40" : "border-white/10"} ${r.hidden ? "opacity-60" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-night"
                    style={{ background: lvl?.color || "#a1a1aa" }}
                  >
                    {(r.author_name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {r.author_name || t("reviews.anon")}
                      {isMine && <span className="ml-1.5 text-xs font-normal text-brand-soft">· {t("reviews.you")}</span>}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {lvl && (
                        <span style={{ color: lvl.color }}>
                          {lvl.icon} {lvl.name} ·{" "}
                        </span>
                      )}
                      {dateFmt(r.created_at)}
                      {r.updated_at && new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60000 && ` · ${t("reviews.edited")}`}
                    </p>
                  </div>
                  <Stars rating={r.rating} size="h-3.5 w-3.5" />
                </div>
                {r.body && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">{r.body}</p>}
                {r.hidden && <p className="mt-2 text-xs font-semibold text-warn">{t("reviews.hiddenNote")}</p>}
                {/* Respuesta del local */}
                {rp && (!rp.hidden || isAdmin) && replyingId !== r.id && (
                  <div className={`mt-3 rounded-ctl border border-brand/30 bg-brand/[0.07] p-3 ${rp.hidden ? "opacity-60" : ""}`}>
                    <p className="text-xs font-bold text-brand-soft">
                      {t("reviews.replyTitle")} <span className="font-normal text-zinc-500">· {dateFmt(rp.created_at)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-200">{rp.body}</p>
                    {rp.hidden && <p className="mt-1 text-xs font-semibold text-warn">{t("reviews.replyHiddenNote")}</p>}
                  </div>
                )}
                {replyingId === r.id && (
                  <div className="mt-3">
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value.slice(0, REPLY_MAX))}
                      rows={3}
                      autoFocus
                      aria-label={t("reviews.replyTitle")}
                      placeholder={t("reviews.replyPlaceholder")}
                      className="w-full resize-y rounded-ctl border border-white/10 bg-night px-3 py-2.5 text-sm text-ink placeholder:text-zinc-500 focus:border-brand focus:outline-none"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[11px] tabular-nums text-zinc-500">
                        {replyDraft.length}/{REPLY_MAX}
                      </span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setReplyingId(null)} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5">
                          {t("reviews.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => saveReply(r)}
                          disabled={savingReply || !replyDraft.trim()}
                          className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-night transition disabled:opacity-40"
                        >
                          {savingReply ? t("reviews.saving") : t("reviews.replyPublish")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {thanksReady && !r.hidden && (
                  isMine ? (
                    (r.thanks_count || 0) > 0 && (
                      <p className="mt-3 text-xs font-semibold text-brand-soft">
                        🙏 {(r.thanks_count || 0) === 1 ? t("reviews.thankedYouOne") : t("reviews.thankedYouMany").replace("{n}", String(r.thanks_count))}
                      </p>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleThanks(r)}
                      aria-pressed={thanked.has(r.id)}
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                        thanked.has(r.id) ? "border-brand/60 bg-brand/20 text-ink" : "border-white/15 text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <span aria-hidden="true">🙏</span> {thanked.has(r.id) ? t("reviews.thanked") : t("reviews.thank")}
                      {(r.thanks_count || 0) > 0 && <span className="tabular-nums text-zinc-400">· {r.thanks_count}</span>}
                    </button>
                  )
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                  {canReply && !rp && replyingId !== r.id && (
                    <button type="button" onClick={() => startReply(r)} className="text-brand-soft hover:text-ink">
                      {t("reviews.reply")}
                    </button>
                  )}
                  {isOwner && rp && replyingId !== r.id && (
                    <>
                      <button type="button" onClick={() => startReply(r)} className="text-zinc-300 hover:text-ink">
                        {t("reviews.replyEdit")}
                      </button>
                      <button type="button" onClick={() => removeReply(r)} className="text-zinc-400 hover:text-red-300">
                        {t("reviews.replyDelete")}
                      </button>
                    </>
                  )}
                  {isAdmin && rp && (
                    <>
                      <button type="button" onClick={() => toggleReplyHidden(r)} className="text-zinc-400 hover:text-ink">
                        {rp.hidden ? t("reviews.replyUnhide") : t("reviews.replyHide")}
                      </button>
                      {!isOwner && (
                        <button type="button" onClick={() => removeReply(r)} className="text-zinc-400 hover:text-red-300">
                          {t("reviews.replyDelete")}
                        </button>
                      )}
                    </>
                  )}
                  {isMine && !editing && (
                    <button type="button" onClick={startEdit} className="text-zinc-300 hover:text-ink">
                      {t("reviews.edit")}
                    </button>
                  )}
                  {(isMine || isAdmin) && (
                    <button type="button" onClick={() => remove(r)} className="text-zinc-400 hover:text-red-300">
                      {t("reviews.delete")}
                    </button>
                  )}
                  {isAdmin && !isMine && (
                    <button type="button" onClick={() => toggleHidden(r)} className="text-zinc-400 hover:text-ink">
                      {r.hidden ? t("reviews.unhide") : t("reviews.hide")}
                    </button>
                  )}
                  {!isMine && !isAdmin && (
                    reported.has(r.id) ? (
                      <span className="text-zinc-500">{t("reviews.reportedShort")}</span>
                    ) : (
                      <button type="button" onClick={() => report(r)} className="text-zinc-500 hover:text-zinc-300">
                        {t("reviews.report")}
                      </button>
                    )
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {visible.length > 6 && !showAll && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-4 text-sm font-semibold text-brand-soft hover:underline">
          {t("reviews.showAll")} ({visible.length})
        </button>
      )}
    </section>
  )
}
