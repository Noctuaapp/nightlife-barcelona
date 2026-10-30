"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import NocOwl from "../../components/mascot/NocOwl"
import { logError } from "../../lib/log"
import { renderWithLinks } from "../../lib/legalText"

// Tipos de consulta que acepta el formulario. El enlace puede traer ?type=...; si el valor no es
// uno de estos se ignora (antes cualquier texto de la dirección acababa guardado como "tipo").
const CONTACT_TYPES = ["user_support", "report_issue", "suggest_venue", "suggest_essential", "club_partnership", "festival_partnership", "owner_access"]
// Límites de longitud (30/10/2026): evitan mensajes gigantes por error o abuso.
const SUBJECT_MAX = 150
const MESSAGE_MAX = 4000
// Vía alternativa para quien no puede iniciar sesión (olvidó la contraseña, no recibe el correo de
// confirmación...) y para ejercer derechos de privacidad: el formulario exige cuenta.
const EMAIL_LINK = { email: { href: "mailto:info@noctuaapp.com", label: "info@noctuaapp.com" } }

function parseContactTypes(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, label, desc] = line.split("||")
      return { value: (value || "").trim(), label: (label || "").trim(), desc: (desc || "").trim() }
    })
}

export default function ContactPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [type, setType] = useState("user_support")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState("")
  // Qué tipo de mensaje se acaba de enviar, para el agradecimiento (un reporte de datos
  // incorrectos merece un "gracias" de verdad, no solo "mensaje enviado").
  const [sentType, setSentType] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  // Solo se puede escribir con sesión iniciada: antes cualquiera podía enviar un mensaje con un
  // email escrito a mano, y al admin le era imposible contestar dentro de la app (la respuesta
  // se entrega a la cuenta, y esa persona no tenía). Ahora el email sale siempre de la cuenta.
  const [authChecked, setAuthChecked] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setLoggedIn(true)
        setEmail(data.user.email || "")
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", data.user.id).single()
        if (profile?.username) setName(profile.username)
      }
      setAuthChecked(true)
    }
    loadUser()
  }, [])

  useEffect(() => {
    const typeParam = searchParams.get("type")
    const subjectParam = searchParams.get("subject")
    if (typeParam && CONTACT_TYPES.includes(typeParam)) setType(typeParam)
    if (subjectParam) setSubject(subjectParam.slice(0, SUBJECT_MAX))
  }, [searchParams])

  const sendMessage = async () => {
    setSuccess("")
    setError("")
    if (!message.trim()) { setError(t("contact.errorEmptyMessage")); return }
    setSending(true)

    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      setSending(false)
      setLoggedIn(false)
      setError(t("contact.loginRequired"))
      return
    }

    let finalName = name

    if (userData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userData.user.id)
        .single()

      if (profile?.username) {
        finalName = profile.username
      }
    }

    const { error: insertError } = await supabase.from("contact_messages").insert({
      name: finalName,
      email: userData.user.email || email,
      type,
      subject,
      message,
      user_id: userData.user.id,
    })

    setSending(false)
    if (insertError) {
      // El texto técnico del servidor (en inglés, con nombres de tablas) no le sirve a quien escribe: se
      // deja en la consola solo en desarrollo y a la persona se le enseña un aviso claro con el correo.
      logError("CONTACT INSERT ERROR:", insertError)
      // Tope diario (SQL 57): 5 mensajes por cuenta cada 24 h. Se avisa con un texto claro, no con el genérico.
      setError(String(insertError.message || "").includes("contact_rate_limit") ? t("contact.errorLimit") : t("contact.errorSend"))
      return
    }
    setSuccess(t("contact.successMessage"))
    setSentType(type)
    setType("user_support"); setSubject(""); setMessage("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const contactTypes = parseContactTypes(t("contact.types"))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-night pb-40 text-ink">

        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-14 pb-16">
          <div className="relative mx-auto max-w-5xl">
            <p className="text-sm text-zinc-400">{t("contact.eyebrow")}</p>
            <h1 className="font-display mt-4 text-4xl sm:text-6xl">{t("contact.title")}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              {t("contact.subtitle")}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* Type selector */}
            <div className="lg:col-span-1">
              <p className="mb-4 text-xs text-zinc-400">{t("contact.typeLabel")}</p>
              {/* Móvil: rejilla de 2 columnas solo con el nombre (antes eran 7 tarjetas apiladas y el formulario
                  quedaba muy abajo); la descripción del tipo elegido sale debajo. Escritorio: igual que antes. */}
              <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-3">
                {contactTypes.map((ct, i) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setType(ct.value)}
                    aria-pressed={type === ct.value}
                    className={`rounded-2xl border px-3 py-3 text-left transition lg:p-4 ${
                      i === contactTypes.length - 1 && contactTypes.length % 2 === 1 ? "col-span-2 lg:col-span-1" : ""
                    } ${
                      type === ct.value
                        ? "border-brand bg-brand/15"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                    }`}
                  >
                    <p className={`text-sm font-bold leading-snug ${type === ct.value ? "text-brand-soft" : "text-ink"}`}>
                      {ct.label}
                    </p>
                    <p className="mt-1 hidden text-xs text-zinc-400 lg:block">{ct.desc}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400 lg:hidden" aria-live="polite">
                {contactTypes.find((c) => c.value === type)?.desc}
              </p>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="rounded-card border border-white/10 bg-surface p-6 sm:p-8">
                <p className="mb-6 text-xs text-zinc-400">{t("contact.messageLabel")}</p>
                {authChecked && !loggedIn ? (
                  <div className="py-6 text-center">
                    <p className="text-xl font-semibold">{t("contact.loginTitle")}</p>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-300">{t("contact.loginBody")}</p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <a href={`/login?next=${encodeURIComponent("/contact" + (typeof window !== "undefined" ? window.location.search : ""))}`} className="rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong">
                        {t("nav.login")}
                      </a>
                      <a href={`/signup?next=${encodeURIComponent("/contact" + (typeof window !== "undefined" ? window.location.search : ""))}`} className="rounded-ctl border border-white/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/5">
                        {t("nav.signup")}
                      </a>
                    </div>
                  </div>
                ) : sentType ? (
                  <div className="py-6 text-center" role="status" aria-live="polite">
                    <div className="mx-auto w-fit"><NocOwl size={88} mood="party" /></div>
                    <p className="mt-5 font-display text-2xl text-ink">
                      {sentType === "report_issue" ? t("contact.thanksReportTitle") : t("contact.thanksTitle")}
                    </p>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-300">
                      {sentType === "report_issue" ? t("contact.thanksReportBody") : t("contact.thanksBody")}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = "/"))}
                        className="rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
                      >
                        {t("contact.back")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSentType(null); setSuccess("") }}
                        className="rounded-ctl border border-white/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"
                      >
                        {t("contact.sendAnother")}
                      </button>
                    </div>
                  </div>
                ) : !authChecked ? (
                  <div className="h-40" />
                ) : (
                <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("contact.namePlaceholder")}
                    aria-label={t("contact.namePlaceholder")}
                    maxLength={60}
                    className="rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none focus:border-brand transition"
                  />
                  <input
                    value={email}
                    readOnly
                    title={t("contact.emailHint")}
                    placeholder={t("contact.emailPlaceholder")}
                    aria-label={t("contact.emailPlaceholder")}
                    className="cursor-not-allowed rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink text-zinc-400 outline-none transition"
                  />
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t("contact.subjectPlaceholder")}
                    aria-label={t("contact.subjectPlaceholder")}
                    maxLength={SUBJECT_MAX}
                    className="rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none focus:border-brand transition md:col-span-2"
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("contact.messagePlaceholder")}
                    aria-label={t("contact.messageLabel")}
                    maxLength={MESSAGE_MAX}
                    rows={7}
                    className="resize-none rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none focus:border-brand transition md:col-span-2"
                  />
                </div>

                {error && <p className="mt-4 text-sm font-semibold text-red-300" role="alert">{error}</p>}
                {success && <p className="mt-4 text-sm font-bold text-emerald-300">{success}</p>}

                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className="mt-6 rounded-ctl bg-brand px-8 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
                >
                  {sending ? t("contact.sending") : t("contact.sendButton")}
                </button>
                </>
                )}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">{renderWithLinks(t("contact.emailFallback"), EMAIL_LINK)}</p>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
