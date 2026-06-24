"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

export default function ContactPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [type, setType] = useState("user_support")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const typeParam = searchParams.get("type")
    const subjectParam = searchParams.get("subject")
    if (typeParam) setType(typeParam)
    if (subjectParam) setSubject(subjectParam)
  }, [searchParams])

  const sendMessage = async () => {
    setSuccess("")
    setError("")
    if (!message.trim()) { setError("Por favor escribe un mensaje."); return }
    setSending(true)
    const { error } = await supabase.from("contact_messages").insert({ name, email, type, subject, message })
    setSending(false)
    if (error) { setError(error.message); return }
    setSuccess("✅ Mensaje enviado. Noctua lo revisará pronto.")
    setName(""); setEmail(""); setType("user_support"); setSubject(""); setMessage("")
  }

  const contactTypes = [
    { value: "user_support", label: "🙋 Soporte de usuario", desc: "Ayuda con tu cuenta o la app" },
    { value: "report_issue", label: "⚑ Reportar información incorrecta", desc: "Horarios, precios o datos erróneos" },
    { value: "suggest_venue", label: "📍 Sugerir un local", desc: "¿Conoces un club o bar que falta?" },
    { value: "club_partnership", label: "🤝 Partnership con local", desc: "Colaboración para clubs y bares" },
    { value: "festival_partnership", label: "🎪 Partnership con festival", desc: "Colaboración para eventos y festivales" },
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">

        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-14 pb-16">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-5xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Contacto</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight">Habla con Noctua</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Soporte, reportes, sugerencias de locales o colaboraciones. Estamos aquí.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4">
          <div className="grid gap-8 lg:grid-cols-3">

            {/* Type selector */}
            <div className="lg:col-span-1">
              <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">Tipo de consulta</p>
              <div className="flex flex-col gap-3">
                {contactTypes.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setType(ct.value)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      type === ct.value
                        ? "border-purple-500/40 bg-purple-500/10"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                    }`}
                  >
                    <p className={`text-sm font-bold ${type === ct.value ? "text-purple-300" : "text-white"}`}>
                      {ct.label}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{ct.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
                <p className="mb-6 text-xs uppercase tracking-widest text-zinc-500">Tu mensaje</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Tu email"
                    className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
                  />
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Asunto"
                    className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition md:col-span-2"
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    rows={7}
                    className="resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition md:col-span-2"
                  />
                </div>

                {error && <p className="mt-4 text-sm font-bold text-red-400">{error}</p>}
                {success && <p className="mt-4 text-sm font-bold text-emerald-300">{success}</p>}

                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className="mt-6 rounded-2xl bg-white px-8 py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {sending ? "Enviando..." : "Enviar mensaje →"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}