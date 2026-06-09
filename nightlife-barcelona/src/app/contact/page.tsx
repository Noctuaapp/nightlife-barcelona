"use client"

import { useState } from "react"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { supabase } from "../../lib/supabase"

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [type, setType] = useState("user_support")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  const sendMessage = async () => {
    setSuccess("")
    setError("")

    if (!message.trim()) {
      setError("Please write a message.")
      return
    }

    setSending(true)

    const { error } = await supabase
      .from("contact_messages")
      .insert({
        name,
        email,
        type,
        subject,
        message,
      })

    setSending(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess("Message sent. Noctua will review it soon.")
    setName("")
    setEmail("")
    setType("user_support")
    setSubject("")
    setMessage("")
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="mx-auto max-w-5xl px-4 pt-14">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Contact
          </p>

          <h1 className="mt-4 text-6xl font-black tracking-tight">
            Talk to Noctua
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Contact us for user support, reports, venue suggestions, club partnerships or festival collaborations.
          </p>

          <div className="mt-10 rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none md:col-span-2"
              >
                <option value="user_support">
                  User support
                </option>
                <option value="report_issue">
                  Report wrong information
                </option>
                <option value="suggest_venue">
                  Suggest a venue
                </option>
                <option value="club_partnership">
                  Club / bar partnership
                </option>
                <option value="festival_partnership">
                  Festival / event partnership
                </option>
              </select>

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none md:col-span-2"
              />

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message..."
                rows={7}
                className="resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none md:col-span-2"
              />
            </div>

            {error && (
              <p className="mt-5 text-sm font-bold text-red-400">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-5 text-sm font-bold text-emerald-300">
                {success}
              </p>
            )}

            <button
              onClick={sendMessage}
              disabled={sending}
              className="mt-6 rounded-2xl bg-white px-8 py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send message"}
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </>
  )
}