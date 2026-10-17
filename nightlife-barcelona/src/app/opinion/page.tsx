"use client"

import { useEffect, useState } from "react"
import Header from "../../components/layout/Header"
import Footer from "../../components/layout/Footer"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { Star } from "lucide-react"

// Encuesta corta de valoración de la web, enlazada desde el footer. A propósito no exige
// sesión (se capta a quien tenga cuenta y a quien no), y es de una sola pantalla: una
// valoración de 1 a 5 estrellas más un comentario opcional.
export default function OpinionPage() {
  const { t } = useLanguage()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [alreadyRated, setAlreadyRated] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem("noctua_feedback_sent")) setAlreadyRated(true)
    } catch {}
  }, [])

  const submit = async () => {
    if (rating === 0) {
      setError(t("opinion.errorNoRating"))
      return
    }
    setError("")
    setSending(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from("site_feedback").insert({
      user_id: userData.user?.id ?? null,
      rating,
      comment: comment.trim().slice(0, 500) || null,
      page: typeof document !== "undefined" ? document.referrer || null : null,
    })
    setSending(false)
    if (insertError) {
      setError(t("opinion.errorSend"))
      return
    }
    try { localStorage.setItem("noctua_feedback_sent", "1") } catch {}
    setSent(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-night text-ink">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-14 sm:pt-20">
        <h1 className="font-display text-3xl sm:text-4xl">{t("opinion.title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t("opinion.subtitle")}</p>

        {sent || alreadyRated ? (
          <div className="mt-8 rounded-card border border-open/25 bg-open/[0.06] p-6 text-center">
            <p className="text-2xl">🦉</p>
            <p className="mt-2 text-sm font-semibold text-ink">{t("opinion.thanks")}</p>
          </div>
        ) : (
          <div className="mt-8 rounded-card border border-white/10 bg-surface p-6">
            <p className="text-sm font-semibold text-zinc-300">{t("opinion.ratingLabel")}</p>
            <div className="mt-3 flex justify-center gap-2" role="radiogroup" aria-label={t("opinion.ratingLabel")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={String(n)}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition active:scale-90"
                >
                  <Star
                    size={36}
                    className={(hoverRating || rating) >= n ? "fill-amber-400 text-amber-400" : "text-zinc-600"}
                  />
                </button>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold text-zinc-300">{t("opinion.commentLabel")}</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder={t("opinion.commentPlaceholder")}
              className="mt-2 w-full resize-none rounded-ctl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink outline-none focus:border-purple-500/50"
            />

            {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}

            <button
              onClick={submit}
              disabled={sending}
              className="mt-5 w-full rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-95 disabled:opacity-50"
            >
              {sending ? t("opinion.sending") : t("opinion.submit")}
            </button>
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
