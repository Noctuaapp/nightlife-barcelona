"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { awardXp, XP_AMOUNTS, currentIsoWeek } from "../../lib/xp"

const cities = [
  { name: "Barcelona", slug: "barcelona", active: true, lat: 41.3851, lng: 2.1734 },
]

const weatherCodes: Record<number, string> = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫", 51: "🌦", 53: "🌦", 55: "🌧",
  61: "🌧", 63: "🌧", 65: "🌧", 71: "🌨", 73: "🌨",
  75: "🌨", 80: "🌦", 81: "🌧", 82: "⛈", 95: "⛈",
}

type WeatherHour = { label: string; icon: string; temp: number }

type NotificationRow = {
  id: number
  title: string
  body: string
  type: "reply" | "broadcast" | "favorite_reminder" | "admin_message" | "xp_streak"
  read: boolean
  created_at: string | null
  related_message_id: number | null
}

const languages = [
  { code: "es", flag: "https://flagcdn.com/w40/es.png", name: "Español" },
  { code: "en", flag: "https://flagcdn.com/w40/gb.png", name: "English" },
  { code: "ca", flag: "/flags/catalunya.png", name: "Català" },
  { code: "fr", flag: "https://flagcdn.com/w40/fr.png", name: "Français" },
  { code: "de", flag: "https://flagcdn.com/w40/de.png", name: "Deutsch" },
  { code: "it", flag: "https://flagcdn.com/w40/it.png", name: "Italiano" },
  { code: "nl", flag: "https://flagcdn.com/w40/nl.png", name: "Nederlands" },
]

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState(cities[0])
  const [weather, setWeather] = useState<{
    temp: number
    icon: string
    nightHours: WeatherHour[]
  } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale, t } = useLanguage()

  const currentLang = languages.find((l) => l.code === locale) || languages[0]

  const showBack = !(["/", "/login", "/signup", "/map", "/events", "/clubs", "/essentials", "/favorites", "/profile", "/plan", "/admin", "/admin/events", "/admin/club-events", "/admin/essentials", "/admin/tickets", "/admin/messages", "/admin/dashboard"].includes(pathname)) && !pathname.startsWith("/admin/")
  const hideHeader = pathname === "/map"

  useEffect(() => {
    // Comprueba que el usuario logueado haya confirmado términos + edad. Esto cubre tanto
    // el alta por Google (que no pasa por el formulario de registro con sus checkboxes) como
    // cualquier cuenta creada antes de que existiera esta confirmación.
    const checkTermsAccepted = async (userId: string) => {
      if (window.location.pathname === "/confirm-age" || window.location.pathname === "/blocked") return
      const { data: profile } = await supabase
        .from("profiles")
        .select("terms_accepted_at")
        .eq("id", userId)
        .maybeSingle()
      if (!profile?.terms_accepted_at) {
        router.push("/confirm-age")
      }
    }

    // Cuenta bloqueada desde el admin: si el usuario está marcado como is_blocked en su perfil,
    // se le manda a /blocked (que a su vez le ofrece cerrar sesión o contactar con soporte).
    const checkBlocked = async (userId: string) => {
      if (window.location.pathname === "/blocked") return
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked")
        .eq("id", userId)
        .maybeSingle()
      if (profile?.is_blocked) {
        router.push("/blocked")
      }
    }

    // Racha semanal del sistema de XP: si en los últimos 7 días hay actividad en al menos 3
    // días distintos (usando las visitas a fichas de club/evento que ya se registraban en
    // "analytics"), se da la recompensa una vez por semana ISO y se avisa por notificación.
    const checkWeeklyStreak = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("streak_week")
        .eq("id", userId)
        .maybeSingle()

      const thisWeek = currentIsoWeek()
      if (profile?.streak_week === thisWeek) return

      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const { data: events } = await supabase
        .from("analytics")
        .select("created_at")
        .eq("user_id", userId)
        .eq("event_type", "page_view")
        .gte("created_at", sevenDaysAgo)

      const distinctDays = new Set((events || []).map((e: any) => String(e.created_at).slice(0, 10)))
      if (distinctDays.size < 3) return

      const { error: streakError } = await supabase.from("profiles").update({ streak_week: thisWeek }).eq("id", userId)
      if (streakError) return

      const { awarded } = await awardXp(supabase, { userId, actionType: "streak", amount: XP_AMOUNTS.streak })
      if (awarded) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "🔥 Racha semanal",
          body: `Has ganado +${XP_AMOUNTS.streak} XP por usar Noctua varios días esta semana.`,
          type: "xp_streak",
        })
      }
    }

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
      setIsAdmin(data.session?.user.email === "info@noctuaapp.com")
      if (data.session) {
        checkBlocked(data.session.user.id)
        checkTermsAccepted(data.session.user.id)
        checkWeeklyStreak(data.session.user.id)
      }
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      setIsAdmin(session?.user.email === "info@noctuaapp.com")
      if (session) {
        checkBlocked(session.user.id)
        checkTermsAccepted(session.user.id)
        checkWeeklyStreak(session.user.id)
      }
    })
    return () => { subscription.unsubscribe() }
  }, [router])

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lng}&current=temperature_2m,weathercode&hourly=temperature_2m,weathercode&timezone=Europe/Madrid&forecast_days=2`
        )
        const data = await res.json()
        const currentTemp = Math.round(data.current.temperature_2m)
        const currentCode = data.current.weathercode
        const currentIcon = weatherCodes[currentCode] || "🌡"

        const now = new Date()
        const currentHour = now.getHours()
        const pad = (n: number) => String(n).padStart(2, "0")

        const nightHourValues = [23, 0, 1, 2, 3, 4, 5, 6]

        const buildDateFor = (hour: number) => {
          const d = new Date(now)
          d.setMinutes(0, 0, 0)
          if (hour === 23) {
            d.setHours(23)
            if (currentHour >= 0 && currentHour <= 6) {
              d.setDate(d.getDate() - 1)
            }
          } else {
            if (!(currentHour >= 0 && currentHour <= 6)) {
              d.setDate(d.getDate() + 1)
            }
            d.setHours(hour)
          }
          return d
        }

        const upcoming = nightHourValues
          .map((hour) => ({ hour, date: buildDateFor(hour) }))
          .filter(({ date }) => date.getTime() >= now.getTime() - 30 * 60 * 1000)
          .slice(0, 4)

        const nightHours: WeatherHour[] = upcoming.map(({ hour, date }) => {
          const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00`
          const idx = data.hourly.time.indexOf(iso)
          const temp = idx !== -1 ? Math.round(data.hourly.temperature_2m[idx]) : null
          const code = idx !== -1 ? data.hourly.weathercode[idx] : null
          const icon = code !== null ? (weatherCodes[code] || "🌡") : "🌡"
          const label = `${pad(hour)}:00`
          return { label, icon, temp: temp ?? 0 }
        })

        setWeather({ temp: currentTemp, icon: currentIcon, nightHours })
      } catch (e) {
        console.log("Weather error:", e)
      }
    }

    fetchWeather()
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedCity])

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [readBroadcastIds, setReadBroadcastIds] = useState<number[]>([])

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([])
      return
    }

    const checkFavoriteReminders = async (userId: string) => {
      const { data: favs } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId)
        .in("item_type", ["event", "club_event"])

      if (!favs || favs.length === 0) return

      const eventIds = favs.filter((f) => f.item_type === "event").map((f) => f.item_id)
      const clubEventIds = favs.filter((f) => f.item_type === "club_event").map((f) => f.item_id)

      const [eventsRes, clubEventsRes] = await Promise.all([
        eventIds.length > 0
          ? supabase.from("events").select("id, title, date, start_time").in("id", eventIds)
          : Promise.resolve({ data: [] as any[] }),
        clubEventIds.length > 0
          ? supabase.from("club_events").select("id, title, date, start_time").in("id", clubEventIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const items = [
        ...(eventsRes.data || []).map((e: any) => ({ ...e, kind: "event" })),
        ...(clubEventsRes.data || []).map((e: any) => ({ ...e, kind: "club_event" })),
      ]

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const item of items) {
        if (!item.date) continue

        const fav = favs.find((f) => f.item_type === item.kind && f.item_id === item.id)
        const daysBefore = fav?.reminder_days_before ?? 0

        const eventDate = new Date(item.date)
        eventDate.setHours(0, 0, 0, 0)
        const daysUntil = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil !== daysBefore) continue

        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("related_event_id", item.id)
          .eq("related_event_type", item.kind)

        if (existing && existing.length > 0) continue

        const when = daysUntil === 0 ? "es hoy" : daysUntil === 1 ? "es mañana" : `es en ${daysUntil} días`

        const { error: insertError } = await supabase.from("notifications").insert({
          user_id: userId,
          title: "⏰ Recordatorio",
          body: `${item.title || "Tu evento guardado"} ${when}${item.start_time ? ` a las ${item.start_time}` : ""}.`,
          type: "favorite_reminder",
          related_event_id: item.id,
          related_event_type: item.kind,
        })
        if (insertError) console.log("FAVORITE REMINDER INSERT ERROR:", insertError)
      }
    }

    const fetchNotifications = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      await checkFavoriteReminders(userData.user.id)

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${userData.user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(30)

      if (error) {
        console.log("NOTIFICATIONS ERROR:", error)
        return
      }

      let readBroadcasts: number[] = []
      try {
        const stored = localStorage.getItem("noctua_read_broadcasts")
        if (stored) readBroadcasts = JSON.parse(stored)
      } catch (e) {
        console.log("LOCALSTORAGE ERROR:", e)
      }

      setReadBroadcastIds(readBroadcasts)

      const unread = (data || []).filter((n) => {
        if (n.type === "favorite_reminder") return true
        if (n.type === "broadcast") return !readBroadcasts.includes(n.id)
        return !n.read
      })
      setNotifications(unread)
    }

    fetchNotifications()
    // Antes solo se cargaban una vez al iniciar sesión: si llegaba un aviso nuevo (broadcast del
    // admin, o un recordatorio) mientras la persona ya tenía la app abierta, no aparecía hasta
    // recargar la página. Con este intervalo se refresca solo, igual que el tiempo del header.
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

  const isUnread = (n: NotificationRow) =>
    n.type === "broadcast" ? !readBroadcastIds.includes(n.id) : !n.read

  const unreadCount = notifications.filter(isUnread).length

  const toggleNotifications = async () => {
    const opening = !notifOpen
    setNotifOpen(opening)
    if (!opening) return

    const personalUnread = notifications.filter((n) => n.type !== "broadcast" && !n.read)
    if (personalUnread.length > 0) {
      await supabase.from("notifications").update({ read: true }).in("id", personalUnread.map((n) => n.id))
    }

    const broadcastIds = notifications.filter((n) => n.type === "broadcast").map((n) => n.id)
    const merged = Array.from(new Set([...readBroadcastIds, ...broadcastIds]))
    if (broadcastIds.length > 0) {
      setReadBroadcastIds(merged)
      try {
        localStorage.setItem("noctua_read_broadcasts", JSON.stringify(merged))
      } catch (e) {
        console.log("LOCALSTORAGE ERROR:", e)
      }
    }

    setNotifications((prev) =>
      prev
        .map((n) => (personalUnread.some((p) => p.id === n.id) ? { ...n, read: true } : n))
        .filter((n) => {
          if (n.type === "favorite_reminder") return true
          if (n.type === "broadcast") return !merged.includes(n.id)
          return !n.read
        })
    )
  }

  if (hideHeader) return null

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="flex h-20 items-center justify-between px-6 relative">
          <div className="flex items-center gap-2">
            {showBack ? (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white transition hover:scale-105"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{t("common.back")}</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setCityOpen(!cityOpen)}
                  className="flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span className="text-xs sm:text-sm">📍</span>
                  <span>{selectedCity.name}</span>
                  <svg width="8" height="5" viewBox="0 0 10 6" fill="none" className="sm:w-[10px] sm:h-[6px]">
                    <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {cityOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCityOpen(false)} />
                    <div className="absolute left-0 top-12 z-50 w-52 rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#111" }}>
                      {cities.map((city) => (
                        <button key={city.slug} onClick={() => { setSelectedCity(city); setCityOpen(false) }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition">
                          <span>{city.name}</span>
                          <span className="text-emerald-400 text-xs">✓</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <img src="/noctua_logo.png" alt="Noctua" className="h-12 w-auto object-contain" style={{ maxWidth: "160px" }} />
          </Link>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20 outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <span className="text-lg">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    {/* w-[min(20rem,calc(100vw-2rem))] en vez de w-80 fijo: en móviles estrechos
                        (320-360px) un ancho fijo de 320px se salía de la pantalla por la izquierda. */}
                    <div className="absolute right-0 top-12 z-50 max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl" style={{ background: "#111" }}>
                      <div className="border-b border-white/10 px-4 py-3">
                        <p className="text-sm font-bold text-white">Notificaciones</p>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-zinc-500">No tienes notificaciones</p>
                      ) : (
                        notifications.map((n) => {
                          const content = (
                            <>
                              <p className="text-sm font-bold text-white">{n.title}</p>
                              <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-400">{n.body}</p>
                              {n.created_at && (
                                <p className="mt-1 text-[10px] text-zinc-600">{new Date(n.created_at).toLocaleString()}</p>
                              )}
                            </>
                          )

                          if (isAdmin && n.related_message_id) {
                            return (
                              <Link
                                key={n.id}
                                href="/admin/messages"
                                onClick={() => setNotifOpen(false)}
                                className={`block border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.08] ${isUnread(n) ? "bg-white/[0.04]" : ""}`}
                              >
                                {content}
                              </Link>
                            )
                          }

                          return (
                            <div key={n.id} className={`border-b border-white/5 px-4 py-3 ${isUnread(n) ? "bg-white/[0.04]" : ""}`}>
                              {content}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20 outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                <rect y="0" width="20" height="2" rx="1" fill="white" />
                <rect y="6" width="20" height="2" rx="1" fill="white" />
                <rect y="12" width="20" height="2" rx="1" fill="white" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
      )}

      <div style={{
        position: "fixed", top: 0, right: 0, zIndex: 200, height: "100%", width: "288px",
        background: "#000", borderLeft: "1px solid rgba(255,255,255,0.1)",
        display: "flex", flexDirection: "column",
        transform: menuOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease-in-out",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.8)",
        overflowY: "auto",
      }}>
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <p className="text-sm uppercase tracking-widest text-zinc-500">Menu</p>
          <button onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10 transition text-lg outline-none">✕</button>
        </div>

        <div className="flex flex-col gap-1 px-4 py-4 flex-1">
          {isLoggedIn && (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
              <span className="text-xl">👤</span>{t("nav.profile")}
            </Link>
          )}
          <Link href="/map" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <span className="text-xl">🗺️</span>{t("nav.map")}
          </Link>
          <Link href="/plan" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <span className="text-xl">✨</span>{t("nav.plan")}
          </Link>
          <Link href="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <span className="text-xl">❤️</span>{t("nav.favorites")}
          </Link>
        </div>

        {weather !== null && weather.nightHours.length > 0 && (
          <div style={{
            margin: "0 16px 12px 16px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.05)",
            padding: "12px",
          }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Barcelona tonight</p>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${weather.nightHours.length}, 1fr)`, gap: "4px" }}>
              {weather.nightHours.map((h) => (
                <div key={h.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{h.label}</p>
                  <span style={{ fontSize: "18px" }}>{h.icon}</span>
                  <p style={{ fontSize: "13px", fontWeight: 900, color: "#fff" }}>{h.temp}°</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-3">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="w-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2">
              <img src={currentLang.flag} alt={currentLang.name} style={{ width: "18px", height: "13px", objectFit: "cover", borderRadius: "2px" }} />
              <span>🌐 {currentLang.name}</span>
            </div>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: langOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {langOpen && (
            <div className="mt-1 rounded-2xl border border-white/10 bg-black overflow-hidden">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLocale(lang.code as any); setLangOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 ${locale === lang.code ? "text-white bg-white/10" : "text-zinc-400"}`}
                >
                  <img src={lang.flag} alt={lang.name} style={{ width: "18px", height: "13px", objectFit: "cover", borderRadius: "2px" }} />
                  <span>{lang.name}</span>
                  {locale === lang.code && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-4 border-t border-white/10">
          {isLoggedIn ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setMenuOpen(false)
                window.location.href = "/login"
              }}
              className="w-full flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              {t("nav.logout")}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">{t("nav.login")}</Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} className="flex items-center justify-center rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-black transition hover:scale-[1.02]">{t("nav.signup")}</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}