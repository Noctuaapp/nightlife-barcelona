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
}

export default function AdminMessagesPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [filter, setFilter] = useState("all")

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

  const updateStatus = async (
    id: number,
    status: "new" | "reviewed" | "closed"
  ) => {
    const { error } = await supabase
      .from("contact_messages")
      .update({ status })
      .eq("id", id)

    if (error) {
      console.log("UPDATE MESSAGE ERROR:", error)
      return
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, status } : message
      )
    )
  }

  const filteredMessages =
    filter === "all"
      ? messages
      : messages.filter((message) => message.status === filter)

  const stats = {
    all: messages.length,
    new: messages.filter((message) => message.status === "new").length,
    reviewed: messages.filter((message) => message.status === "reviewed").length,
    closed: messages.filter((message) => message.status === "closed").length,
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Loading messages...
        </p>
      </main>
    )
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Admin messages
            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              Contact inbox
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Review user support, reports, venue suggestions and partnership requests.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <AdminLink href="/admin/dashboard">
                Dashboard
              </AdminLink>

              <AdminLink href="/admin">
                Clubs
              </AdminLink>

              <AdminLink href="/admin/events">
                Events
              </AdminLink>

              <AdminLink href="/admin/club-events">
                Club nights
              </AdminLink>

              <AdminLink href="/admin/tickets">
                Tickets
              </AdminLink>

              <AdminLink href="/admin/messages" active>
                Messages
              </AdminLink>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterCard
              label="All"
              value={stats.all}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />

            <FilterCard
              label="New"
              value={stats.new}
              active={filter === "new"}
              onClick={() => setFilter("new")}
            />

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
          {filteredMessages.length === 0 ? (
            <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-12 text-center">
              <h2 className="text-4xl font-black">
                No messages
              </h2>

              <p className="mt-4 text-zinc-400">
                Messages sent from the contact page will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap gap-3">
                        <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm">
                          {formatType(message.type)}
                        </span>

                        <span className={`rounded-2xl px-4 py-2 text-sm font-bold ${statusClass(message.status)}`}>
                          {message.status}
                        </span>

                        {message.created_at && (
                          <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm text-zinc-300">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-5 text-3xl font-black">
                        {message.subject || "No subject"}
                      </h2>

                      <p className="mt-4 whitespace-pre-wrap text-zinc-300">
                        {message.message}
                      </p>

                      <div className="mt-6 grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
                        <p>
                          <span className="text-zinc-500">Name:</span>{" "}
                          {message.name || "Not provided"}
                        </p>

                        <p>
                          <span className="text-zinc-500">Email:</span>{" "}
                          {message.email || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:max-w-sm lg:justify-end">
                      <button
                        onClick={() => updateStatus(message.id, "new")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                      >
                        Mark new
                      </button>

                      <button
                        onClick={() => updateStatus(message.id, "reviewed")}
                        className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500 hover:text-black"
                      >
                        Reviewed
                      </button>

                      <button
                        onClick={() => updateStatus(message.id, "closed")}
                        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-black"
                      >
                        Closed
                      </button>

                      {message.email && (
                        <a
                          href={`mailto:${message.email}`}
                          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
                        >
                          Reply email
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </>
  )
}

function AdminLink({
  href,
  active = false,
  children,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
        active
          ? "bg-white text-black"
          : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
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
          active
            ? "border-white bg-white text-black"
            : "border-white/10 bg-white/[0.03] text-white"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.25em] opacity-70">
          {label}
        </p>
  
        <h2 className="mt-2 text-4xl font-black">
          {value}
        </h2>
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