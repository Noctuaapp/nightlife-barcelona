"use client"

import { useEffect, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any[]>([])
  const [neighborhoodByClubId, setNeighborhoodByClubId] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [clubListSearch, setClubListSearch] = useState("")
  const [eventListSearch, setEventListSearch] = useState("")

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
      // Antes esto se cortaba en las últimas 200 filas, lo que hacía que "top clubs", franjas
      // horarias, etc. solo reflejaran un puñado de horas de actividad reciente en vez de una
      // foto representativa. Con más usuarios habrá que mover esto a una vista/RPC agregada en
      // Supabase en vez de traer filas sueltas, pero de momento esto ya da una foto mucho más real.
      const { data } = await supabase
        .from("analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000)
      if (data) setAnalytics(data)

      const { data: clubRows } = await supabase.from("clubs").select("id, neighborhood")
      if (clubRows) {
        const map: Record<number, string> = {}
        clubRows.forEach((c: any) => { if (c.neighborhood) map[c.id] = c.neighborhood })
        setNeighborhoodByClubId(map)
      }

      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  const totalClicks = analytics.length
  const websiteClicks = analytics.filter(a => a.event_type === "website_click").length
  const favoriteClicks = analytics.filter(a => a.event_type === "favorite_click").length
  const directionsClicks = analytics.filter(a => a.event_type === "directions_click").length
  const clubClicks = analytics.filter(a => a.item_type === "club").length
  const eventClicks = analytics.filter(a => a.item_type === "event").length

  const topByType = (type: string) =>
    Object.entries(
      analytics.reduce((acc: any, a) => {
        if (!a.item_name || a.item_type !== type) return acc
        acc[a.item_name] = (acc[a.item_name] || 0) + 1
        return acc
      }, {})
    ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10)

  const topClubs = topByType("club")
  const topEvents = topByType("event")

  // Listado completo (no solo el top 10) de clicks por club y por evento, para poder ver
  // también los que tienen poca actividad, no solo los más vistos.
  const allByType = (type: string) =>
    Object.entries(
      analytics.reduce((acc: any, a) => {
        if (!a.item_name || a.item_type !== type) return acc
        acc[a.item_name] = (acc[a.item_name] || 0) + 1
        return acc
      }, {})
    ).sort((a: any, b: any) => b[1] - a[1])

  const allClubs = allByType("club")
  const allEvents = allByType("event")

  // Franjas horarias con más actividad (hora local del navegador de quien mira el admin;
  // como toda la app es de Barcelona esto es una aproximación suficiente).
  const hourCounts = Array.from({ length: 24 }, () => 0)
  analytics.forEach((a) => {
    if (!a.created_at) return
    hourCounts[new Date(a.created_at).getHours()]++
  })
  const maxHourCount = Math.max(1, ...hourCounts)

  // Qué día de la semana tiene más tráfico.
  const dayCounts = Array.from({ length: 7 }, () => 0)
  analytics.forEach((a) => {
    if (!a.created_at) return
    dayCounts[new Date(a.created_at).getDay()]++
  })
  const maxDayCount = Math.max(1, ...dayCounts)

  // Zonas (barrios) con más tráfico — solo lo podemos saber para clicks sobre clubs, cruzando
  // item_id con el barrio del club en la tabla clubs.
  const zoneCounts = analytics.reduce((acc: Record<string, number>, a) => {
    if (a.item_type !== "club" || !a.item_id) return acc
    const zone = neighborhoodByClubId[a.item_id]
    if (!zone) return acc
    acc[zone] = (acc[zone] || 0) + 1
    return acc
  }, {})
  const topZones = Object.entries(zoneCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8)
  const maxZoneCount = Math.max(1, ...topZones.map(([, c]) => c as number))

  // Retención / usuarios recurrentes: de los usuarios logueados que generaron algún evento,
  // cuántos tienen actividad en más de un día distinto (proxy razonable de "vuelve a usar la
  // app" sin necesitar una tabla de sesiones aparte).
  const activeDaysByUser: Record<string, Set<string>> = {}
  analytics.forEach((a) => {
    if (!a.user_id || !a.created_at) return
    const day = a.created_at.slice(0, 10)
    if (!activeDaysByUser[a.user_id]) activeDaysByUser[a.user_id] = new Set()
    activeDaysByUser[a.user_id].add(day)
  })
  const loggedInUserIds = Object.keys(activeDaysByUser)
  const recurringUsers = loggedInUserIds.filter((id) => activeDaysByUser[id].size > 1).length
  const recurringRate = loggedInUserIds.length > 0 ? Math.round((recurringUsers / loggedInUserIds.length) * 100) : 0

  // Búsquedas en el mapa y filtros usados en "Planifica tu noche" — instrumentado nuevo esta
  // ronda (event_type "search" desde /map, "filter_used" desde /plan). Con la ventana de 5000
  // filas puede tardar unos días en acumular datos representativos.
  const topSearches = Object.entries(
    analytics.reduce((acc: Record<string, number>, a) => {
      if (a.event_type !== "search" || !a.item_name) return acc
      const key = a.item_name.toLowerCase()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10)

  const topFilters = Object.entries(
    analytics.reduce((acc: Record<string, number>, a) => {
      if (a.event_type !== "filter_used" || !a.item_name) return acc
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
    <AdminShell title="Analytics" subtitle="Clicks, favoritos y actividad en Noctua.">
      <>
        <section className="mx-auto max-w-7xl">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            {[
              { label: "Total clicks", value: totalClicks, color: "text-white" },
              { label: "Clicks en clubs", value: clubClicks, color: "text-purple-400" },
              { label: "Clicks en eventos", value: eventClicks, color: "text-amber-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
                <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            {[
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

          {/* Retención */}
          <div className="grid gap-4 md:grid-cols-3 mb-10">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-4xl font-black text-white">{loggedInUserIds.length}</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">Usuarios activos (con sesión)</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-4xl font-black text-emerald-400">{recurringUsers}</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">Vuelven en más de un día</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-4xl font-black text-emerald-400">{recurringRate}%</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">Tasa de recurrencia</p>
            </div>
          </div>

          {/* Franja horaria y día de la semana */}
          <div className="grid gap-4 md:grid-cols-2 mb-10">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Actividad por hora del día</p>
              <div className="flex items-end gap-1 h-32">
                {hourCounts.map((count, h) => (
                  <div key={h} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${h}:00 — ${count}`}>
                    <div
                      className="w-full rounded-t bg-purple-500/70"
                      style={{ height: `${Math.max(2, (count / maxHourCount) * 100)}%` }}
                    />
                    {h % 3 === 0 && <span className="text-[9px] text-zinc-600">{h}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Actividad por día de la semana</p>
              <div className="flex items-end gap-2 h-32">
                {dayCounts.map((count, d) => (
                  <div key={d} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div
                      className="w-full rounded-t bg-amber-500/70"
                      style={{ height: `${Math.max(2, (count / maxDayCount) * 100)}%` }}
                    />
                    <span className="text-[10px] text-zinc-500">{DAY_LABELS[d]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Zonas */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 mb-10">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Barrios con más tráfico (clicks en clubs)</p>
            <div className="space-y-3">
              {topZones.map(([zone, count]: any, i) => (
                <div key={zone} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-zinc-500 w-5">{i + 1}</span>
                    <span className="text-sm font-bold text-white">{zone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 rounded-full bg-emerald-500/30" style={{ width: `${(count / maxZoneCount) * 120}px` }}>
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: "100%" }} />
                    </div>
                    <span className="text-sm font-bold text-zinc-400 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {topZones.length === 0 && <p className="text-zinc-500 text-sm">No hay datos todavía.</p>}
            </div>
          </div>

          {/* Top clubs y top eventos, por separado */}
          <div className="grid gap-4 md:grid-cols-2 mb-10">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
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

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Top eventos más vistos</p>
              <div className="space-y-3">
                {topEvents.map(([name, count]: any, i) => (
                  <div key={name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-zinc-500 w-5">{i + 1}</span>
                      <span className="text-sm font-bold text-white">{name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 rounded-full bg-amber-500/30" style={{ width: `${(count / (topEvents[0][1] as number)) * 120}px` }}>
                        <div className="h-full rounded-full bg-amber-500" style={{ width: "100%" }} />
                      </div>
                      <span className="text-sm font-bold text-zinc-400 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
                {topEvents.length === 0 && <p className="text-zinc-500 text-sm">No hay datos todavía.</p>}
              </div>
            </div>
          </div>

          {/* Búsquedas y filtros */}
          <div className="grid gap-4 md:grid-cols-2 mb-10">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Búsquedas más frecuentes (mapa)</p>
              <div className="space-y-3">
                {topSearches.map(([term, count]: any, i) => (
                  <div key={term} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-zinc-500 w-5">{i + 1}</span>
                      <span className="text-sm font-bold text-white">{term}</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-400">{count}</span>
                  </div>
                ))}
                {topSearches.length === 0 && (
                  <p className="text-zinc-500 text-sm">Todavía sin datos — esto se empieza a registrar a partir de ahora.</p>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Filtros usados en "Planifica tu noche"</p>
              <div className="space-y-3">
                {topFilters.map(([combo, count]: any, i) => (
                  <div key={combo} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-zinc-500 w-5">{i + 1}</span>
                      <span className="text-sm font-bold text-white">{combo}</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-400">{count}</span>
                  </div>
                ))}
                {topFilters.length === 0 && (
                  <p className="text-zinc-500 text-sm">Todavía sin datos — esto se empieza a registrar a partir de ahora.</p>
                )}
              </div>
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
                        {a.event_type === "website_click" ? "🌐" : a.event_type === "favorite_click" ? "❤️" : a.event_type === "search" ? "🔎" : a.event_type === "filter_used" ? "🎚" : "🧭"}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {a.item_type === "club" ? "🪩" : a.item_type === "event" ? "🎫" : ""} {a.item_name}
                        </p>
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
      </>
    </AdminShell>
  )
}
