"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"

import { supabase } from "../../../lib/supabase"

export default function AdminDashboardPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const [stats, setStats] = useState({
    clubs: 0,
    events: 0,
    clubEvents: 0,
    soldOutClubEvents: 0,
    trendingClubs: 0,
    soldOutClubs: 0,
    featuredEvents: 0,
    soldOutEvents: 0,
    users: 0,
    favorites: 0,
    favoriteClubs: 0,
    favoriteEvents: 0,
    favoriteClubEvents: 0,
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
    const fetchDashboardStats = async () => {
      const { data: clubsData } = await supabase
        .from("clubs")
        .select("id, trending, sold_out")

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, featured, sold_out")

      const { data: clubEventsData } = await supabase
        .from("club_events")
        .select("id, sold_out")

      const { data: adminStatsData } = await supabase.rpc("get_admin_stats")
      const adminStats = Array.isArray(adminStatsData)
        ? adminStatsData[0]
        : adminStatsData

      setStats({
        clubs: clubsData?.length || 0,
        events: eventsData?.length || 0,
        clubEvents: clubEventsData?.length || 0,
        soldOutClubEvents:
          clubEventsData?.filter((event) => event.sold_out).length || 0,
        trendingClubs:
          clubsData?.filter((club) => club.trending).length || 0,
        soldOutClubs:
          clubsData?.filter((club) => club.sold_out).length || 0,
        featuredEvents:
          eventsData?.filter((event) => event.featured).length || 0,
        soldOutEvents:
          eventsData?.filter((event) => event.sold_out).length || 0,
        users: adminStats?.users || 0,
        favorites: adminStats?.favorites || 0,
        favoriteClubs: adminStats?.favorite_clubs || 0,
        favoriteEvents: adminStats?.favorite_events || 0,
        favoriteClubEvents: adminStats?.favorite_club_events || 0,
      })
    }

    if (!checkingAdmin) {
      fetchDashboardStats()
    }
  }, [checkingAdmin])

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Loading dashboard...
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
              Admin dashboard
            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              Control center
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Overview of Noctua activity, users, favorites and nightlife content.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <AdminLink href="/admin/dashboard" active>
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

              <AdminLink href="/admin/messages">
                Messages
              </AdminLink>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="grid gap-8">
            <StatsGroup title="Clubs">
              <StatCard
                title="Total clubs"
                value={stats.clubs}
                subtitle="Active venues"
                href="/admin"
                color="from-purple-500/20"
              />

              <StatCard
                title="Trending clubs"
                value={stats.trendingClubs}
                subtitle="Live demand"
                href="/admin"
                color="from-emerald-500/20"
              />

              <StatCard
                title="Sold out clubs"
                value={stats.soldOutClubs}
                subtitle="Capacity alerts"
                href="/admin"
                color="from-red-500/20"
              />

              <StatCard
                title="Club nights"
                value={stats.clubEvents}
                subtitle="Scheduled club nights"
                href="/admin/club-events"
                color="from-cyan-500/20"
              />

              <StatCard
                title="Sold out club nights"
                value={stats.soldOutClubEvents}
                subtitle="Club night pressure"
                href="/admin/club-events"
                color="from-orange-500/20"
              />
            </StatsGroup>

            <StatsGroup title="Events">
              <StatCard
                title="Total events"
                value={stats.events}
                subtitle="Listed events"
                href="/admin/events"
                color="from-cyan-500/20"
              />

              <StatCard
                title="Featured events"
                value={stats.featuredEvents}
                subtitle="Promoted events"
                href="/admin/events"
                color="from-pink-500/20"
              />

              <StatCard
                title="Sold out events"
                value={stats.soldOutEvents}
                subtitle="Ticket pressure"
                href="/admin/events"
                color="from-orange-500/20"
              />
            </StatsGroup>

            <StatsGroup title="Users">
              <StatCard
                title="Registered users"
                value={stats.users}
                subtitle="Noctua accounts"
                href="/admin/dashboard"
                color="from-blue-500/20"
              />
            </StatsGroup>

            <StatsGroup title="Favorites">
              <StatCard
                title="Total favorites"
                value={stats.favorites}
                subtitle="Saved items"
                href="/admin/dashboard"
                color="from-rose-500/20"
              />

              <StatCard
                title="Favorite clubs"
                value={stats.favoriteClubs}
                subtitle="Saved venues"
                href="/admin"
                color="from-fuchsia-500/20"
              />

              <StatCard
                title="Favorite events"
                value={stats.favoriteEvents}
                subtitle="Saved events"
                href="/admin/events"
                color="from-violet-500/20"
              />

              <StatCard
                title="Favorite club nights"
                value={stats.favoriteClubEvents}
                subtitle="Saved club nights"
                href="/admin/club-events"
                color="from-indigo-500/20"
              />
            </StatsGroup>
          </div>
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
      className={`rounded-full px-5 py-3 text-sm font-bold transition ${
        active
          ? "bg-white text-black"
          : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
      }`}
    >
      {children}
    </Link>
  )
}

function StatsGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8">
      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
        {title}
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  href,
  color,
}: {
  title: string
  value: number | string
  subtitle: string
  href: string
  color: string
}) {
  return (
    <Link
      href={href}
      className={`rounded-[28px] border border-white/10 bg-gradient-to-br ${color} to-white/[0.02] p-6 transition hover:scale-[1.02] hover:border-white/20`}
    >
      <p className="text-sm uppercase tracking-wide text-zinc-400">
        {title}
      </p>

      <h2 className="mt-4 text-5xl font-black">
        {value}
      </h2>

      <p className="mt-3 text-sm text-zinc-400">
        {subtitle}
      </p>
    </Link>
  )
}