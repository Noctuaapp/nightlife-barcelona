"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"

// Categorías fijas de essentials — mismas que usa /admin/essentials, así el desglose siempre
// muestra las 11 aunque alguna tenga 0 elementos.
const ESSENTIAL_CATEGORIES = ["Pharmacy", "ATM", "Food", "Transport", "Metro", "Nitbus", "Taxi", "Supermarket", "Hotel", "Casino", "Other"]

export default function AdminDashboardPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [stats, setStats] = useState({
    clubs: 0, events: 0, essentials: 0, clubEvents: 0, soldOutClubEvents: 0,
    trendingClubs: 0, soldOutClubs: 0, featuredEvents: 0, soldOutEvents: 0,
    users: 0, favorites: 0, favoriteClubs: 0, favoriteEvents: 0, favoriteClubEvents: 0,
  })

  // Info "de un vistazo" para el admin: qué necesita atención ahora mismo.
  const [alerts, setAlerts] = useState({
    newMessages: 0,
    recentSignups: 0,
    blockedUsers: 0,
    clubsWithoutOwner: 0,
    festivalsWithoutOwner: 0,
  })

  const [essentialsByCategory, setEssentialsByCategory] = useState<Record<string, number>>({})

  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [loadingMaintenance, setLoadingMaintenance] = useState(true)
  const [savingMaintenance, setSavingMaintenance] = useState(false)

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
        { data: messagesData },
        { data: usersData },
        { data: profilesData },
      ] = await Promise.all([
        supabase.from("clubs").select("id, trending, sold_out, owner_user_id"),
        supabase.from("events").select("id, featured, sold_out, owner_user_id"),
        supabase.from("club_events").select("id, sold_out"),
        supabase.from("essentials").select("id, category"),
        supabase.rpc("get_admin_stats"),
        supabase.from("contact_messages").select("id, status"),
        supabase.rpc("admin_list_users"),
        supabase.from("profiles").select("id, is_blocked"),
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

      const byCategory: Record<string, number> = {}
      for (const cat of ESSENTIAL_CATEGORIES) byCategory[cat] = 0
      for (const item of essentialsData || []) {
        byCategory[item.category] = (byCategory[item.category] || 0) + 1
      }
      setEssentialsByCategory(byCategory)

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      setAlerts({
        newMessages: (messagesData || []).filter((m) => m.status === "new").length,
        recentSignups: ((usersData || []) as any[]).filter((u: any) => u.created_at && new Date(u.created_at) >= sevenDaysAgo).length,
        blockedUsers: (profilesData || []).filter((p) => p.is_blocked).length,
        clubsWithoutOwner: (clubsData || []).filter((c) => !c.owner_user_id).length,
        festivalsWithoutOwner: (eventsData || []).filter((e) => !e.owner_user_id).length,
      })
    }
    fetchStats()
  }, [checkingAdmin])

  useEffect(() => {
    if (checkingAdmin) return
    const loadMaintenance = async () => {
      const { data } = await supabase.from("app_settings").select("maintenance_mode").eq("id", true).maybeSingle()
      setMaintenanceMode(!!data?.maintenance_mode)
      setLoadingMaintenance(false)
    }
    loadMaintenance()
  }, [checkingAdmin])

  const toggleMaintenance = async () => {
    const next = !maintenanceMode
    if (
      next &&
      !window.confirm("¿Activar el modo mantenimiento? Nadie excepto tú podrá usar la app hasta que lo desactives.")
    ) {
      return
    }
    setSavingMaintenance(true)
    const { error } = await supabase.from("app_settings").update({ maintenance_mode: next }).eq("id", true)
    setSavingMaintenance(false)
    if (error) { window.alert("No se pudo actualizar el modo mantenimiento: " + error.message); return }
    setMaintenanceMode(next)
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading dashboard...</p>
      </main>
    )
  }

  return (
    <AdminShell title="Dashboard" subtitle="Overview of Noctua activity, users, favorites and nightlife content.">
      <div className="grid gap-8">

        <div
          className={`rounded-[36px] border p-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${
            maintenanceMode ? "border-red-500/30 bg-red-500/[0.06]" : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">🛠️</span>
            <div>
              <p className="font-bold text-white">Modo mantenimiento</p>
              <p className="text-sm text-zinc-400">
                {maintenanceMode
                  ? "Activo: solo tú puedes usar la app ahora mismo."
                  : "Apagado: la app funciona con normalidad para todos."}
              </p>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={loadingMaintenance || savingMaintenance}
            className={`rounded-xl px-6 py-3 text-sm font-bold transition disabled:opacity-40 ${
              maintenanceMode
                ? "bg-white text-black hover:scale-[1.02]"
                : "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
            }`}
          >
            {savingMaintenance ? "..." : maintenanceMode ? "Desactivar" : "Activar mantenimiento"}
          </button>
        </div>

        <StatsGroup title="Atención" icon="🔔" color="#f59e0b">
          <StatCard title="Mensajes nuevos" value={alerts.newMessages} subtitle="Sin responder" href="/admin/messages" icon="💬" color="#f59e0b" />
          <StatCard title="Altas (7 días)" value={alerts.recentSignups} subtitle="Usuarios nuevos" href="/admin/users" icon="🆕" color="#3b82f6" />
          <StatCard title="Usuarios bloqueados" value={alerts.blockedUsers} subtitle="Cuentas suspendidas" href="/admin/users" icon="🚫" color="#ef4444" />
          <StatCard title="Clubs sin dueño" value={alerts.clubsWithoutOwner} subtitle="Sin acceso vinculado" href="/admin/users" icon="🏛️" color="#a855f7" />
          <StatCard title="Festivales sin dueño" value={alerts.festivalsWithoutOwner} subtitle="Sin acceso vinculado" href="/admin/users" icon="🎉" color="#ec4899" />
        </StatsGroup>

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

        <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-500">Essentials por categoría</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {ESSENTIAL_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href="/admin/essentials"
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm transition hover:bg-white/[0.08]"
              >
                <span className="font-bold text-white">{essentialsByCategory[cat] ?? 0}</span>
                <span className="text-zinc-400">{cat}</span>
              </Link>
            ))}
          </div>
        </div>

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
    </AdminShell>
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
