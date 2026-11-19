"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, Building2, Flame, Repeat } from "lucide-react"
import AdminShell from "../../../components/admin/AdminShell"
import { Segmented, StatTile } from "../../../components/admin/ui"
import NightsPanel from "../../../components/admin/programming/NightsPanel"
import SessionsPanel from "../../../components/admin/programming/SessionsPanel"
import type { Club, ClubEvent, ClubSession } from "../../../components/admin/programming/types"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { fetchAllPages } from "../../../lib/fetchAll"
import { madridToday } from "../../../lib/madridDay"
import { useAdminCity } from "../../../components/admin/AdminCity"
import { clubIdsOfCity, rowsOfCity, rowsOfCityByClub } from "../../../lib/adminCity"
import { cityOfClub } from "../../../lib/cities"

// Programación de clubs (19/11/2026). Antes eran dos pantallas casi iguales en el menú: «Sesiones semanales» (club_sessions: lo que se
// repite cada semana, p. ej. «viernes techno») y «Noches de club» (club_events: una noche concreta con fecha). Servían para lo
// mismo —decir qué pasa en cada club— así que ahora son una sola, con dos pestañas y el mismo filtro por club. Las tablas y lo que
// ve la web pública no cambian.
//   /admin/programacion?tab=semana | fecha      (?edit=ID abre esa noche, como hacía /admin/club-events)
type Tab = "semana" | "fecha"

export default function AdminProgramacionPage() {
  const [city, setCity] = useAdminCity()
  const [allClubs, setClubs] = useState<Club[]>([])
  const [allSessions, setSessions] = useState<ClubSession[]>([])
  const [allNights, setNights] = useState<ClubEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [tab, setTab] = useState<Tab>("semana")
  const [clubFilter, setClubFilter] = useState("")
  const [focusId, setFocusId] = useState<number | null>(null)

  const clubs = useMemo(() => rowsOfCity(allClubs, city), [allClubs, city])
  const sessions = useMemo(
    () => rowsOfCityByClub(allSessions, clubIdsOfCity(allClubs, city), new Set(allClubs.map((c) => c.id)), city),
    [allSessions, allClubs, city]
  )
  const nights = useMemo(
    () => rowsOfCityByClub(allNights, clubIdsOfCity(allClubs, city), new Set(allClubs.map((c) => c.id)), city),
    [allNights, allClubs, city]
  )

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [clubsData, sessionsRes, nightsRes] = await Promise.all([
        fetchAllPages<Club>((from, to) => supabase.from("clubs").select("id, name, city, latitude, longitude").order("name").order("id").range(from, to)),
        supabase.from("club_sessions").select("*").order("sort_order", { ascending: true }),
        supabase.from("club_events").select("*").order("date", { ascending: true }),
      ])
      if (!alive) return
      if (clubsData.length) setClubs(clubsData)
      if (sessionsRes.data) setSessions(sessionsRes.data)
      if (nightsRes.data) setNights(nightsRes.data)
      setLoading(false)
    }
    void load()
    return () => {
      alive = false
    }
  }, [])

  // Pestaña inicial desde la dirección. Se lee en el cliente (no en el servidor) para no complicar la página estática.
  const urlRead = useRef(false)
  useEffect(() => {
    if (urlRead.current) return
    urlRead.current = true
    const params = new URLSearchParams(window.location.search)
    const t = params.get("tab")
    if (t === "fecha" || t === "semana") setTab(t)
    if (params.get("edit")) setTab("fecha")
  }, [])

  // Llegando desde «Editar» en una ficha pública (?edit=ID): se espera a tener las noches y los locales (la ciudad de una noche sale
  // de su local), se busca entre todas —el botón puede ser de la otra ciudad, y entonces se cambia a ella— y el panel la abre.
  const editDone = useRef(false)
  useEffect(() => {
    if (editDone.current || allNights.length === 0 || allClubs.length === 0) return
    const wanted = new URLSearchParams(window.location.search).get("edit")
    editDone.current = true
    if (!wanted) return
    const found = allNights.find((n) => String(n.id) === wanted)
    if (!found) return
    const owner = allClubs.find((c) => c.id === found.club_id)
    if (owner) setCity(cityOfClub(owner))
    setTab("fecha")
    setFocusId(found.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNights, allClubs])

  const changeTab = (t: Tab) => {
    setTab(t)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", t)
      url.searchParams.delete("edit")
      window.history.replaceState(null, "", url.toString())
    } catch {
      // Sin historial (entorno raro): la pestaña sigue cambiando, solo no se refleja en la dirección.
    }
  }

  // Al cambiar de ciudad se quita el filtro por club (era de la otra ciudad). Los paneles llevan la ciudad en su clave, así que se
  // vuelven a montar y cierran la ficha abierta.
  const prevCity = useRef(city)
  useEffect(() => {
    if (prevCity.current === city) return
    prevCity.current = city
    setClubFilter("")
  }, [city])

  const today = madridToday()
  const stats = useMemo(() => {
    const upcoming = nights.filter((n) => !n.date || n.date.slice(0, 10) >= today)
    const clubsWith = new Set<number>()
    for (const s of sessions) clubsWith.add(s.club_id)
    for (const n of nights) if (n.club_id != null) clubsWith.add(n.club_id)
    return {
      sessions: sessions.length,
      upcoming: upcoming.length,
      featured: upcoming.filter((n) => n.featured).length,
      clubs: clubsWith.size,
    }
  }, [sessions, nights, today])

  // Clubs del filtro: solo los que tienen algo programado en la ciudad (un desplegable con cientos de locales no sirve para filtrar).
  const filterClubs = useMemo(() => {
    const ids = new Set<number>()
    for (const s of sessions) ids.add(s.club_id)
    for (const n of nights) if (n.club_id != null) ids.add(n.club_id)
    return clubs.filter((c) => ids.has(c.id))
  }, [clubs, sessions, nights])

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">Verificando acceso…</p>
      </main>
    )
  }

  return (
    <AdminShell title="Programación de clubs" subtitle="Qué pasa en cada club: lo que se repite cada semana y las noches con fecha.">
      <>
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile accent="violet" icon={Repeat} label="Sesiones semanales" value={stats.sessions} active={tab === "semana"} onClick={() => changeTab("semana")} />
          <StatTile accent="pink" icon={CalendarDays} label="Noches próximas" value={stats.upcoming} active={tab === "fecha"} onClick={() => changeTab("fecha")} />
          <StatTile accent="coral" icon={Flame} label="Destacadas" value={stats.featured} note="entre las próximas" />
          <StatTile accent="cyan" icon={Building2} label="Clubs con programación" value={stats.clubs} />
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Segmented<Tab>
            label="Tipo de programación"
            value={tab}
            onChange={changeTab}
            options={[
              { value: "semana", label: "Cada semana", count: stats.sessions },
              { value: "fecha", label: "Con fecha", count: stats.upcoming },
            ]}
          />
          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            aria-label="Filtrar por club"
            className="ui-input ui-input-flat !min-h-[40px] sm:!w-auto sm:min-w-[220px]"
          >
            <option value="">Todos los clubs</option>
            {filterClubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="py-20 text-center text-sm text-zinc-300">Cargando programación…</p>
        ) : tab === "semana" ? (
          <SessionsPanel key={`s-${city}`} clubs={clubs} sessions={sessions} setSessions={setSessions} clubFilter={clubFilter} />
        ) : (
          <NightsPanel key={`n-${city}`} clubs={clubs} nights={nights} setNights={setNights} clubFilter={clubFilter} focusId={focusId} onFocusHandled={() => setFocusId(null)} />
        )}
      </>
    </AdminShell>
  )
}
