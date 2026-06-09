"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import { supabase } from "../../../lib/supabase"

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Clubs" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/club-events", label: "Club nights" },
  { href: "/admin/essentials", label: "Essentials" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/messages", label: "Messages" },
]

export default function AdminDashboardPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [stats, setStats] = useState({
    clubs: 0, events: 0, essentials: 0, clubEvents: 0, soldOutClubEvents: 0,
    trendingClubs: 0, soldOutClubs: 0, featuredEvents: 0, soldOutEvents: 0,
    users: 0, favorites: 0, favoriteClubs: 0, favoriteEvents: 0, favoriteClubEvents: 0,
  })

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

  useEffect(() => {
    if (checkingAdmin) return
    const fetchStats = async () => {
      const [
        { data: clubsData },
        { data: eventsData },
        { data: clubEventsData },
        { data: essentialsData },
        { data: adminStatsData },
      ] = await Promise.all([
        supabase.from("clubs").select("id, trending, sold_out"),
        supabase.from("events").select("id, featured, sold_out"),
        supabase.from("club_events").select("id, sold_out"),
        supabase.from("essentials").select("id"),
        supabase.rpc("get_admin_stats"),
      ])
      const adminStats = Array.isArray(adminStatsData) ? adminStatsData[0] : adminStatsData
      setStats({
        clubs: clubsData?.length || 0,
        events: eventsData?.length || 0,
        essentials: essentialsData?.length || 0,
        clubEvents: clubEventsData?.length || 0,
        soldOutClubEvents: clubEventsData?.filter((e) => e.sold_out).length || 0,
        trendingClubs: clubsData?.filter((c) => c.trending).length || 0,
        soldOutClubs: clubsData?.filter((c) => c.sold_out).length || 0,
        featuredEvents: eventsData?.filter((e) => e.featured).length || 0,
        soldOutEvents: eventsData?.filter((e) => e.sold_out).length || 0,
        users: adminStats?.users || 0,
        favorites: adminStats?.favorites || 0,
        favoriteClubs: adminStats?.favorite_clubs || 0,
        favoriteEvents: adminStats?.favorite_events || 0,
        favoriteClubEvents: adminStats?.favorite_club_events || 0,
      })
    }
    fetchStats()
  }, [checkingAdmin])

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading dashboard...</p>
      </main>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">Dashboard</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Overview of Noctua activity, users, favorites and nightlife content.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    link.href === "/admin/dashboard"
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="grid gap-8">

            <StatsGroup title="Clubs" icon="🎵" color="#a855f7">
              <StatCard title="Total clubs" value={stats.clubs} subtitle="Active venues" href="/admin" icon="🏛️" color="#a855f7" />
              <StatCard title="Trending" value={stats.trendingClubs} subtitle="Live demand" href="/admin" icon="🔥" color="#10b981" />
              <StatCard title="Sold out" value={stats.soldOutClubs} subtitle="Capacity alerts" href="/admin" icon="🚫" color="#ef4444" />
              <StatCard title="Club nights" value={stats.clubEvents} subtitle="Scheduled nights" href="/admin/club-events" icon="🎧" color="#06b6d4" />
            </StatsGroup>

            <StatsGroup title="Events" icon="🎉" color="#ec4899">
              <StatCard title="Total events" value={stats.events} subtitle="Listed events" href="/admin/events" icon="📅" color="#ec4899" />
              <StatCard title="Featured" value={stats.featuredEvents} subtitle="Promoted events" href="/admin/events" icon="⭐" color="#f97316" />
              <StatCard title="Sold out" value={stats.soldOutEvents} subtitle="Ticket pressure" href="/admin/events" icon="🎟️" color="#ef4444" />
            </StatsGroup>

            <StatsGroup title="Essentials" icon="🗺️" color="#10b981">
              <StatCard title="Total essentials" value={stats.essentials} subtitle="Listed services" href="/admin/essentials" icon="📍" color="#10b981" />
            </StatsGroup>

            <StatsGroup title="Users" icon="👤" color="#3b82f6">
              <StatCard title="Registered users" value={stats.users} subtitle="Noctua accounts" href="/admin/dashboard" icon="👥" color="#3b82f6" />
            </StatsGroup>

            <StatsGroup title="Favorites" icon="❤️" color="#f43f5e">
              <StatCard title="Total favorites" value={stats.favorites} subtitle="Saved items" href="/admin/dashboard" icon="❤️" color="#f43f5e" />
              <StatCard title="Fav clubs" value={stats.favoriteClubs} subtitle="Saved venues" href="/admin" icon="🏛️" color="#d946ef" />
              <StatCard title="Fav events" value={stats.favoriteEvents} subtitle="Saved events" href="/admin/events" icon="📅" color="#8b5cf6" />
              <StatCard title="Fav club nights" value={stats.favoriteClubEvents} subtitle="Saved nights" href="/admin/club-events" icon="🎧" color="#6366f1" />
            </StatsGroup>

          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}

function StatsGroup({ title, icon, color, children }: {
  title: string
  icon: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[36px] border p-8"
      style={{
        borderColor: `${color}30`,
        background: `linear-gradient(135deg, ${color}10 0%, rgba(255,255,255,0.01) 100%)`,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <p className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color }}>{title}</p>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  )
}

function StatCard({ title, value, subtitle, href, icon, color }: {
  title: string
  value: number
  subtitle: string
  href: string
  icon: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="rounded-[24px] border p-6 transition hover:scale-[1.02]"
      style={{
        borderColor: `${color}25`,
        background: `${color}12`,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <h2 className="mt-4 text-5xl font-black text-white">{value}</h2>
      <p className="mt-2 text-xs text-zinc-500">{subtitle}</p>
    </Link>
  )
}