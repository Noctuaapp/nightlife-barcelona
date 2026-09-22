"use client"

import { useEffect, useState } from "react"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import { supabase } from "../../../lib/supabase"

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

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

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data } = await supabase
        .from("analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
      if (data) setAnalytics(data)
      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  const totalClicks = analytics.length
  const websiteClicks = analytics.filter(a => a.event_type === "website_click").length
  const favoriteClicks = analytics.filter(a => a.event_type === "favorite_click").length
  const directionsClicks = analytics.filter(a => a.event_type === "directions_click").length

  const topClubs = Object.entries(
    analytics.reduce((acc: any, a) => {
      if (!a.item_name) return acc
      acc[a.item_name] = (acc[a.item_name] || 0) + 1
      return acc
    }, {})
  ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10)

  if (checkingAdmin) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Cargando...</p>
    </main>
  )

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight">Analytics</h1>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { href: "/admin", label: "Clubs" },
                { href: "/admin/events", label: "Events" },
                { href: "/admin/users", label: "Users" },
                { href: "/admin/messages", label: "Messages" },
                { href: "/admin/analytics", label: "Analytics" },
              ].map((link) => (
                <a key={link.href} href={link.href}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    link.href === "/admin/analytics" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
                  }`}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-10">
            {[
              { label: "Total clicks", value: totalClicks, color: "text-white" },
              { label: "Web oficial", value: websiteClicks, color: "text-blue-400" },
              { label: "Favoritos", value: favoriteClicks, color: "text-pink-400" },
              { label: "Cómo llegar", value: directionsClicks, color: "text-emerald-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Top clubs */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 mb-10">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Top clubs más vistos</p>
            <div className="space-y-3">
              {topClubs.map(([name, count]: any, i) => (
                <div key={name} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-zinc-500 w-5">{i + 1}</span>
                    <span className="text-sm font-bold text-white">{name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 rounded-full bg-purple-500/30" style={{ width: `${(count / (topClubs[0][1] as number)) * 120}px` }}>
                      <div className="h-full rounded-full bg-purple-500" style={{ width: "100%" }} />
                    </div>
                    <span className="text-sm font-bold text-zinc-400 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {topClubs.length === 0 && <p className="text-zinc-500 text-sm">No hay datos todavía.</p>}
            </div>
          </div>

          {/* Recent clicks */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Últimos clicks</p>
            {loading ? (
              <p className="text-zinc-500 text-sm">Cargando...</p>
            ) : (
              <div className="space-y-3">
                {analytics.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {a.event_type === "website_click" ? "🌐" : a.event_type === "favorite_click" ? "❤️" : "🧭"}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{a.item_name}</p>
                        <p className="text-xs text-zinc-500">{a.event_type}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">{new Date(a.created_at).toLocaleDateString("es-ES")}</p>
                  </div>
                ))}
                {analytics.length === 0 && <p className="text-zinc-500 text-sm">No hay clicks registrados todavía.</p>}
              </div>
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}