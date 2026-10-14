"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { awardXp, XP_AMOUNTS, currentIsoWeek } from "../../lib/xp"
import Icon from "../ui/Icon"
import { Bell, Menu, X, User, Calendar, Compass, Sparkles, Heart, MessageCircle, Shield, Globe, ChevronDown, Check, Moon, Sun, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Thermometer } from "lucide-react"
import { ADMIN_EMAIL } from "../../lib/admin"
import { logError } from "../../lib/log"

// Barcelona es la única ciudad por ahora (antes había un selector de ciudad con una sola opción).
const CITY = { lat: 41.3851, lng: 2.1734 }

// Código de Open-Meteo → icono (antes eran emojis de sol, que de noche no tenían sentido).
const weatherCodes: Record<number, string> = {
  0: "clear", 1: "partly", 2: "partly", 3: "cloud",
  45: "fog", 48: "fog", 51: "drizzle", 53: "drizzle", 55: "rain",
  61: "rain", 63: "rain", 65: "rain", 71: "snow", 73: "snow",
  75: "snow", 80: "drizzle", 81: "rain", 82: "storm", 95: "storm",
}

function WeatherIcon({ name, night = true, size = 18 }: { name: string; night?: boolean; size?: number }) {
  const I =
    name === "clear" ? (night ? Moon : Sun)
    : name === "partly" ? CloudMoon
    : name === "cloud" ? Cloud
    : name === "fog" ? CloudFog
    : name === "drizzle" ? CloudDrizzle
    : name === "rain" ? CloudRain
    : name === "snow" ? CloudSnow
    : name === "storm" ? CloudLightning
    : Thermometer
  return <I size={size} className="text-brand-soft" aria-hidden="true" />
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

// Solo los idiomas que están completos. Francés, alemán, italiano y neerlandés se han quitado del
// selector hasta que estén traducidos del todo (un idioma a medias da peor imagen que no tenerlo).
const languages = [
  { code: "es", name: "Español" },
  { code: "en", name: "English" },
  { code: "ca", name: "Català" },
]

// El Header se monta de nuevo en cada página, así que todo lo que hace al montarse se repetía en
// cada clic: tiempo, recordatorios de favoritos, racha semanal... Estas tareas solo necesitan
// hacerse una vez por sesión de navegación (pestaña abierta).
function oncePerSession(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false
    sessionStorage.setItem(key, "1")
    return true
  } catch {
    return true
  }
}

const WEATHER_CACHE_KEY = "noctua_weather_v2"
const WEATHER_TTL_MS = 30 * 60 * 1000

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  // Barra "Regístrate gratis": solo para quien no tiene sesión, a partir de la segunda página vista
  // en la visita (antes aparecía fija desde la primera pantalla en todas las páginas) y se puede
  // cerrar para siempre. Empieza oculta para no parpadear antes de leer el almacenamiento.
  const [bannerDismissed, setBannerDismissed] = useState(true)
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
      if (!oncePerSession(`noctua_streak_checked_${userId}`)) return
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
          title: t("header.streakTitle"),
          body: t("header.streakBody").replace("{xp}", String(XP_AMOUNTS.streak)),
          type: "xp_streak",
        })
      }
    }

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
      setIsAdmin(data.session?.user.email === ADMIN_EMAIL)
      if (data.session) {
        checkBlocked(data.session.user.id)
        checkTermsAccepted(data.session.user.id)
        checkWeeklyStreak(data.session.user.id)
      }
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      setIsAdmin(session?.user.email === ADMIN_EMAIL)
      if (session) {
        checkBlocked(session.user.id)
        checkTermsAccepted(session.user.id)
        checkWeeklyStreak(session.user.id)
      }
    })
    return () => { subscription.unsubscribe() }
  }, [router])

  useEffect(() => {
    // El tiempo solo se muestra en el menú: se pide al abrirlo, no en cada página.
    if (!menuOpen) return
    const fetchWeather = async () => {
      try {
        // Caché de 30 min por pestaña: antes se pedía el tiempo a open-meteo en cada página.
        try {
          const cached = JSON.parse(sessionStorage.getItem(WEATHER_CACHE_KEY) || "null")
          if (cached && Date.now() - cached.at < WEATHER_TTL_MS) {
            setWeather(cached.weather)
            return
          }
        } catch {
          /* caché ilegible: se vuelve a pedir */
        }
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lng}&current=temperature_2m,weathercode&hourly=temperature_2m,weathercode&timezone=Europe/Madrid&forecast_days=2`
        )
        const data = await res.json()
        const currentTemp = Math.round(data.current.temperature_2m)
        const currentCode = data.current.weathercode
        const currentIcon = weatherCodes[currentCode] || "unknown"

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

        // Antes se cortaba a las primeras 4 horas próximas con ".slice(0, 4)" — si eran, por
        // ejemplo, las 20:00, solo se mostraban 23h-02h y ya no aparecían ni las 04h, 05h ni 06h.
        // Ahora se muestran todas las horas de la franja nocturna (23h a 06h) que aún quedan por
        // venir, hasta 8 en total.
        const upcoming = nightHourValues
          .map((hour) => ({ hour, date: buildDateFor(hour) }))
          .filter(({ date }) => date.getTime() >= now.getTime() - 30 * 60 * 1000)

        const nightHours: WeatherHour[] = upcoming.map(({ hour, date }) => {
          const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00`
          const idx = data.hourly.time.indexOf(iso)
          const temp = idx !== -1 ? Math.round(data.hourly.temperature_2m[idx]) : null
          const code = idx !== -1 ? data.hourly.weathercode[idx] : null
          const icon = code !== null ? weatherCodes[code] || "unknown" : "unknown"
          const label = `${pad(hour)}:00`
          return { label, icon, temp: temp ?? 0 }
        })

        const fresh = { temp: currentTemp, icon: currentIcon, nightHours }
        setWeather(fresh)
        try {
          sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ at: Date.now(), weather: fresh }))
        } catch {
          /* sin almacenamiento: no pasa nada */
        }
      } catch {
        /* sin conexión con el servicio del tiempo: no se muestra */
      }
    }

    fetchWeather()
  }, [menuOpen])

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

        const when =
          daysUntil === 0 ? t("header.reminderToday") : daysUntil === 1 ? t("header.reminderTomorrow") : t("header.reminderInDays").replace("{n}", String(daysUntil))

        const { error: insertError } = await supabase.from("notifications").insert({
          user_id: userId,
          title: t("header.reminderTitle"),
          body: `${item.title || t("header.reminderFallback")} ${when}${item.start_time ? ` · ${item.start_time}` : ""}.`,
          type: "favorite_reminder",
          related_event_id: item.id,
          related_event_type: item.kind,
        })
        if (insertError) logError("FAVORITE REMINDER INSERT ERROR:", insertError)
      }
    }

    const fetchNotifications = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      if (oncePerSession(`noctua_reminders_checked_${userData.user.id}`)) {
        await checkFavoriteReminders(userData.user.id)
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${userData.user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(30)

      if (error) {
        logError("NOTIFICATIONS ERROR:", error)
        return
      }

      let readBroadcasts: number[] = []
      try {
        const stored = localStorage.getItem("noctua_read_broadcasts")
        if (stored) readBroadcasts = JSON.parse(stored)
      } catch (e) {
        logError("LOCALSTORAGE ERROR:", e)
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

  useEffect(() => {
    try {
      const views = Number(sessionStorage.getItem("noctua_pages_seen") || "0") + 1
      sessionStorage.setItem("noctua_pages_seen", String(views))
      const dismissed = localStorage.getItem("noctua_auth_banner_dismissed") === "1"
      setBannerDismissed(dismissed || views < 2)
    } catch {
      /* sin almacenamiento: no se muestra */
    }
  }, [pathname])

  const dismissBanner = () => {
    setBannerDismissed(true)
    try {
      localStorage.setItem("noctua_auth_banner_dismissed", "1")
    } catch {
      /* sin almacenamiento */
    }
  }

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
        logError("LOCALSTORAGE ERROR:", e)
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

  const menuLink = "flex items-center gap-3 rounded-ctl px-4 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/5"

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-night/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {showBack && (
              <button
                onClick={() => router.back()}
                aria-label={t("common.back")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-ink transition hover:bg-white/10"
              >
                <Icon name="back" className="h-4 w-4" />
              </button>
            )}
            <Link href="/" aria-label="Noctua" className="flex items-center">
              <Image src="/noctua_logo.png" alt="Noctua" width={160} height={98} className="h-9 w-auto object-contain" priority />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  aria-label={t("header.notifications")}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-ink transition hover:bg-white/10"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="fixed left-4 right-4 top-[72px] z-50 mx-auto max-h-[70vh] max-w-[22rem] overflow-y-auto rounded-card border border-white/10 bg-surface shadow-2xl sm:left-auto sm:right-6 sm:w-80 sm:max-w-none">
                      <div className="border-b border-white/10 px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{t("header.notifications")}</p>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-zinc-400">{t("header.noNotifications")}</p>
                      ) : (
                        notifications.slice(0, 8).map((n) => {
                          const content = (
                            <>
                              <p className="text-sm font-semibold text-ink">{n.title}</p>
                              <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-300">{n.body}</p>
                              {n.created_at && <p className="mt-1 text-xs text-zinc-400">{new Date(n.created_at).toLocaleString(locale)}</p>}
                            </>
                          )
                          if (isAdmin && n.related_message_id) {
                            return (
                              <Link
                                key={n.id}
                                href="/admin/messages"
                                onClick={() => setNotifOpen(false)}
                                className={`block border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.06] ${isUnread(n) ? "bg-white/[0.04]" : ""}`}
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
                      {notifications.length > 8 && (
                        <Link
                          href="/profile#buzon"
                          onClick={() => setNotifOpen(false)}
                          className="block px-4 py-3 text-center text-sm font-semibold text-brand-soft transition hover:bg-white/[0.06]"
                        >
                          {t("header.seeMore").replace("{n}", String(notifications.length - 8))}
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              aria-label={t("header.openMenu")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-ink transition hover:bg-white/10"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {!isLoggedIn && !bannerDismissed && pathname !== "/login" && pathname !== "/signup" && (
        <div className="border-b border-white/5 bg-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <p className="min-w-0 flex-1 truncate text-sm text-ink">{t("authGate.bannerText")}</p>
            <Link href="/signup" className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-strong">
              {t("authGate.bannerCta")}
            </Link>
            <button
              onClick={dismissBanner}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:text-ink"
              aria-label={t("clubPage.close")}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-[190] bg-black/60" onClick={() => setMenuOpen(false)} />}

      <nav
        aria-label={t("header.menu")}
        className={`fixed right-0 top-0 z-[200] flex h-full w-[300px] max-w-[85vw] flex-col overflow-y-auto border-l border-white/10 bg-night shadow-2xl transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-300">{t("header.menu")}</p>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label={t("clubPage.close")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-ink transition hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {!isLoggedIn && (
          <div className="mx-4 mt-4 rounded-card border border-brand/30 bg-brand/10 p-5">
            <p className="text-base font-semibold leading-tight text-ink">{t("authGate.title")}</p>
            <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
              <li>{t("authGate.benefit1")}</li>
              <li>{t("authGate.benefit2")}</li>
              <li>{t("authGate.benefit3")}</li>
              <li>{t("authGate.benefit4")}</li>
            </ul>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="mt-4 flex items-center justify-center rounded-ctl bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
            >
              {t("authGate.ctaSignup")}
            </Link>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1 px-3 py-4">
          {isLoggedIn && (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className={menuLink}>
              <User size={18} className="text-muted" />
              {t("nav.profile")}
            </Link>
          )}
          <Link href="/events" onClick={() => setMenuOpen(false)} className={menuLink}>
            <Calendar size={18} className="text-muted" />
            {t("nav.events")}
          </Link>
          <Link href="/essentials" onClick={() => setMenuOpen(false)} className={menuLink}>
            <Compass size={18} className="text-muted" />
            {t("nav.essentials")}
          </Link>
          <Link href="/plan" onClick={() => setMenuOpen(false)} className={menuLink}>
            <Sparkles size={18} className="text-muted" />
            {t("nav.plan")}
          </Link>
          <Link href="/favorites" onClick={() => setMenuOpen(false)} className={menuLink}>
            <Heart size={18} className="text-muted" />
            {t("nav.favorites")}
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)} className={menuLink}>
            <MessageCircle size={18} className="text-muted" />
            {t("nav.contact")}
          </Link>
          {isAdmin && (
            <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)} className={menuLink}>
              <Shield size={18} className="text-muted" />
              Admin
            </Link>
          )}
        </div>

        {weather !== null && weather.nightHours.length > 0 && (
          <div className="mx-4 mb-3 rounded-card border border-white/10 bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400">{t("weather.tonightTitle")}</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <WeatherIcon name={weather.icon} night={new Date().getHours() >= 20 || new Date().getHours() < 7} /> {weather.temp}°
              </p>
            </div>
            <div className="scrollbar-none mt-3 flex gap-4 overflow-x-auto">
              {weather.nightHours.map((h) => (
                <div key={h.label} className="flex min-w-[34px] shrink-0 flex-col items-center gap-1">
                  <p className="text-xs text-zinc-400">{h.label}</p>
                  <WeatherIcon name={h.icon} />
                  <p className="text-sm font-semibold text-ink">{h.temp}°</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-3">
          <button
            onClick={() => setLangOpen(!langOpen)}
            aria-expanded={langOpen}
            className="flex w-full items-center justify-between rounded-ctl border border-white/10 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"
          >
            <span className="flex items-center gap-2">
              <Globe size={16} className="text-muted" /> {currentLang.name}
            </span>
            <ChevronDown size={16} className={`text-muted transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>
          {langOpen && (
            <div className="mt-1 overflow-hidden rounded-ctl border border-white/10">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLocale(lang.code as "es" | "en" | "ca")
                    setLangOpen(false)
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition hover:bg-white/5 ${
                    locale === lang.code ? "text-ink" : "text-zinc-400"
                  }`}
                >
                  {lang.name}
                  {locale === lang.code && <Check size={14} className="text-open" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          {isLoggedIn ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setMenuOpen(false)
                window.location.href = "/login"
              }}
              className="flex w-full items-center justify-center rounded-ctl border border-white/10 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"
            >
              {t("nav.logout")}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center justify-center rounded-ctl border border-white/10 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/5">
                {t("nav.login")}
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} className="flex items-center justify-center rounded-ctl bg-ink px-4 py-3 text-sm font-semibold text-night transition hover:bg-white">
                {t("nav.signup")}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
