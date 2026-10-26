"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { awardXp, XP_AMOUNTS, currentIsoWeek, madridDateStr, dayBefore, checkLevelUp } from "../../lib/xp"
import { ADMIN_EMAIL } from "../../lib/admin"
import { logError } from "../../lib/log"
import LevelUpModal from "../mascot/LevelUpModal"
import { Bell, ChevronLeft, User, Map, Sparkles, Heart, MessageCircle, ShieldCheck, Globe, X, Check } from "lucide-react"

const cities = [
  { name: "Barcelona", slug: "barcelona", active: true, lat: 41.3851, lng: 2.1734 },
]

const weatherCodes: Record<number, string> = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫", 51: "🌦", 53: "🌦", 55: "🌧",
  61: "🌧", 63: "🌧", 65: "🌧", 71: "🌨", 73: "🌨",
  75: "🌨", 80: "🌦", 81: "🌧", 82: "⛈", 95: "⛈",
}

type WeatherHour = { label: string; icon: string; temp: number; code: number | null; wind?: number | null }

type NotificationRow = {
  id: number
  title: string
  body: string
  type: "reply" | "broadcast" | "favorite_reminder" | "admin_message" | "xp_streak" | "level_up"
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
  { code: "pt", flag: "https://flagcdn.com/w40/pt.png", name: "Português" },
]

// El Header se monta de nuevo en cada página: la racha semanal y los recordatorios solo hace falta
// comprobarlos una vez por pestaña, no en cada clic.
function oncePerSession(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false
    sessionStorage.setItem(key, "1")
    return true
  } catch {
    return true
  }
}

// El tiempo se guarda 30 min por pestaña (antes se pedía a open-meteo en cada página).
const WEATHER_CACHE_KEY = "noctua_weather_v5" // v5: también el viento por hora
const WEATHER_TTL_MS = 30 * 60 * 1000

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  // Nivel al que se acaba de subir, para disparar el modal de celebración — null el resto del
  // tiempo. Ver checkNewLevel más abajo y supabase/9_niveles_y_moderacion.sql.
  const [newLevel, setNewLevel] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  // Barcelona es la única ciudad por ahora (se usa para el tiempo del menú).
  const [selectedCity] = useState(cities[0])
  // Barra de registro en el header: solo para quien no tiene sesión, y se puede cerrar (se
  // recuerda en localStorage, igual que las notificaciones leídas). Empieza en "true" (oculta)
  // para no hacerla parpadear un instante antes de comprobar localStorage tras montar.
  const [bannerDismissed, setBannerDismissed] = useState(true)
  const [weather, setWeather] = useState<{
    temp: number
    icon: string
    code: number
    nightHours: WeatherHour[]
  } | null>(null)
  // Aviso pequeño de "hace buen día para salir" / "coge paraguas o abrigo", una vez al día.
  const [weatherTipDismissed, setWeatherTipDismissed] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale, t } = useLanguage()

  const currentLang = languages.find((l) => l.code === locale) || languages[0]

  // Hora de Barcelona junto a la ciudad (en pantallas medianas y grandes). Se pinta en el cliente
  // para que el HTML del servidor y el del navegador coincidan.
  const [clock, setClock] = useState<string | null>(null)
  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date())
    setClock(fmt())
    const id = setInterval(() => setClock(fmt()), 30000)
    return () => clearInterval(id)
  }, [])


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
        .select("terms_accepted_at, birth_year")
        .eq("id", userId)
        .maybeSingle()
      // También sin año de nacimiento (26/10/2026): cuentas de antes de que se guardara la edad.
      if (!profile?.terms_accepted_at || !profile?.birth_year) {
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
          title: `🔥 ${t("header.streakTitle")}`,
          body: t("header.streakBody").replace("{xp}", String(XP_AMOUNTS.streak)),
          type: "xp_streak",
        })
      }
    }

    // Racha diaria de inicios de sesión: cada día (hora de Madrid) que se entra seguido del
    // anterior suma la racha y da un poco de XP; si se falla un día, la racha vuelve a 1. A
    // diferencia de la racha semanal (que exige 3 días de actividad en 7), esta premia
    // simplemente volver cada día, aunque sea un ratito — así que el XP por día es bajo (5,
    // menos que un check-in) para que no sea la forma más rentable de ganar XP.
    const checkDailyStreak = async (userId: string) => {
      if (!oncePerSession(`noctua_daily_streak_checked_${userId}`)) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("login_streak_days, last_login_date")
        .eq("id", userId)
        .maybeSingle()

      const today = madridDateStr()
      if (profile?.last_login_date === today) return // ya contado hoy

      const newStreak = profile?.last_login_date === dayBefore(today) ? (profile?.login_streak_days || 0) + 1 : 1

      const { error: streakError } = await supabase
        .from("profiles")
        .update({ login_streak_days: newStreak, last_login_date: today })
        .eq("id", userId)
      if (streakError) return

      const { awarded } = await awardXp(supabase, { userId, actionType: "daily_login", amount: XP_AMOUNTS.dailyLogin })
      if (awarded && newStreak > 1) {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: `🔥 ${t("header.dailyStreakTitle").replace("{days}", String(newStreak))}`,
          body: t("header.dailyStreakBody").replace("{xp}", String(XP_AMOUNTS.dailyLogin)),
          type: "xp_streak",
        })
      }
    }

    // Detecta si el XP y el tiempo transcurrido ya alcanzan para subir de nivel (recompute_level
    // en Postgres) y, si es así, dispara el modal de celebración + una notificación — igual que
    // las dos rachas, una sola comprobación por pestaña. Antes de ejecutar el SQL, checkLevelUp
    // devuelve null sin más (la función de Postgres aún no existe), así que no rompe nada.
    const checkNewLevel = async (userId: string) => {
      if (!oncePerSession(`noctua_level_checked_${userId}`)) return
      const leveledTo = await checkLevelUp(supabase, userId)
      if (!leveledTo) return
      setNewLevel(leveledTo)
      await supabase.from("notifications").insert({
        user_id: userId,
        title: `🎉 ${t("levels.levelUpTitle")}`,
        body: t("header.levelUpBody").replace("{level}", t(`levels.${leveledTo}`)),
        type: "level_up",
      })
    }

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
      setIsAdmin(data.session?.user.email === ADMIN_EMAIL)
      if (data.session) {
        checkBlocked(data.session.user.id)
        checkTermsAccepted(data.session.user.id)
        checkWeeklyStreak(data.session.user.id)
        checkDailyStreak(data.session.user.id)
        checkNewLevel(data.session.user.id)
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
    const fetchWeather = async () => {
      try {
        try {
          const cached = JSON.parse(sessionStorage.getItem(WEATHER_CACHE_KEY) || "null")
          if (cached && cached.city === selectedCity.slug && Date.now() - cached.at < WEATHER_TTL_MS) {
            setWeather(cached.weather)
            return
          }
        } catch {
          /* caché ilegible: se vuelve a pedir */
        }
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lng}&current=temperature_2m,weathercode&hourly=temperature_2m,weathercode,windspeed_10m&timezone=Europe/Madrid&forecast_days=2`
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
          const wind = idx !== -1 && data.hourly.windspeed_10m ? Math.round(data.hourly.windspeed_10m[idx]) : null
          const icon = code !== null ? (weatherCodes[code] || "🌡") : "🌡"
          const label = `${pad(hour)}:00`
          return { label, icon, temp: temp ?? 0, code, wind }
        })

        const fresh = { temp: currentTemp, icon: currentIcon, code: currentCode, nightHours }
        setWeather(fresh)
        try {
          sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ at: Date.now(), city: selectedCity.slug, weather: fresh }))
        } catch {
          /* sin almacenamiento: no pasa nada */
        }
      } catch {
        /* sin conexión con el servicio del tiempo: simplemente no se muestra */
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

        const when =
          daysUntil === 0 ? t("header.reminderToday") : daysUntil === 1 ? t("header.reminderTomorrow") : t("header.reminderInDays").replace("{n}", String(daysUntil))

        const { error: insertError } = await supabase.from("notifications").insert({
          user_id: userId,
          title: `⏰ ${t("header.reminderTitle")}`,
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
      setBannerDismissed(localStorage.getItem("noctua_auth_banner_dismissed") === "1")
    } catch (e) {
      logError("LOCALSTORAGE ERROR:", e)
    }
  }, [])

  const dismissBanner = () => {
    setBannerDismissed(true)
    try {
      localStorage.setItem("noctua_auth_banner_dismissed", "1")
    } catch (e) {
      logError("LOCALSTORAGE ERROR:", e)
    }
  }

  // Clave con la fecha de hoy: el aviso vuelve a poder salir al día siguiente aunque ayer se
  // cerrara (el tiempo de hoy no es el de ayer).
  const weatherTipKey = () => `noctua_weather_tip_dismissed_${new Date().toISOString().slice(0, 10)}`
  useEffect(() => {
    try {
      setWeatherTipDismissed(localStorage.getItem(weatherTipKey()) === "1")
    } catch (e) {
      logError("LOCALSTORAGE ERROR:", e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismissWeatherTip = () => {
    setWeatherTipDismissed(true)
    try {
      localStorage.setItem(weatherTipKey(), "1")
    } catch (e) {
      logError("LOCALSTORAGE ERROR:", e)
    }
  }

  // Lluvia o nieve: coger paraguas pesa más que el frío o que el buen tiempo. Antes "buena noche"
  // solo saltaba con cielo despejado/poco nuboso Y 18º o más: con un día nublado de 19-20º (muy
  // normal en Barcelona) no salía ningún aviso. Ahora casi siempre hay uno: frío, lluvia, buena
  // noche o, si no encaja en ninguno (p. ej. 13-16º sin lluvia), simplemente no se muestra nada.
  //
  // Antes se miraba el tiempo ACTUAL (weather.code/weather.temp): si a media tarde hacía sol pero
  // por la noche iba a llover, salía "buena noche para salir" aunque fuera a llover a la hora de
  // salir. Ahora se mira la previsión de las horas de la franja nocturna (23h-06h), que es la que
  // importa para decidir si salir.
  // Mensaje del tiempo de esta noche (25/10/2026: "¿tiene en cuenta la temperatura? ¿si refresca
  // o hará calor? que sea más divertido a la par que informativo"). Ahora mira la previsión de la
  // franja de salir (23h-06h): tormenta, lluvia (y a qué hora empieza), viento fuerte, calor,
  // noche perfecta, fresquito o frío — siempre con los grados de verdad (al salir y a la vuelta).
  // Cada tipo tiene varias frases y cada día sale una distinta, para que no sea siempre la misma.
  const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82, 95])
  const STORM_CODES = new Set([82, 95, 96, 99])
  const weatherTip: { icon: string; text: string } | null = (() => {
    if (!weather || weather.nightHours.length === 0) return null
    const hours = weather.nightHours
    const temps = hours.map((h) => h.temp)
    const first = temps[0]
    const min = Math.min(...temps)
    const max = Math.max(...temps)
    const winds = hours.map((h) => h.wind ?? 0)
    const maxWind = Math.max(...winds)
    const rainHour = hours.find((h) => h.code !== null && RAIN_CODES.has(h.code))
    const storm = hours.some((h) => h.code !== null && STORM_CODES.has(h.code))

    let kind: string
    let icon: string
    if (storm) { kind = "storm"; icon = "⛈️" }
    else if (rainHour) { kind = "rain"; icon = "☔️" }
    else if (maxWind >= 40) { kind = "wind"; icon = "💨" }
    else if (first >= 24) { kind = "hot"; icon = "🥵" }
    else if (min >= 16) { kind = "nice"; icon = "🌙" }
    else if (min >= 12) { kind = "fresh"; icon = "🧥" }
    else { kind = "cold"; icon = "🥶" }

    // Tres frases por tipo; cambia cada día (todo el mundo ve la misma ese día).
    const day = Math.floor(Date.now() / 86400000)
    const variant = (day % 3) + 1
    const text = t(`weatherTip.${kind}${variant}`)
      .replace("{first}", String(first))
      .replace("{min}", String(min))
      .replace("{max}", String(max))
      .replace("{hour}", rainHour ? rainHour.label : "")
      .replace("{wind}", String(maxWind))
      .replace("{firsth}", hours[0].label)
    return { icon, text }
  })()

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

  return (
    <>
      <LevelUpModal levelKey={newLevel} onDone={() => setNewLevel(null)} />
      {/* Header: la noche de Barcelona en azul tinta (no negro plano), el búho iluminado como un
          neón con un halo detrás y una línea de luz abajo, como la que se escapa bajo la puerta de
          un club. Los colores salen del propio logo (azul eléctrico y cian) y del violeta/magenta
          de los botones de la app. */}
      <header className="sticky top-0 z-50">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #0c1234 0%, #070814 100%)" }} />
          <div className="absolute -left-24 -top-28 h-56 w-80 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(168,85,247,0.24), transparent)" }} />
          <div className="absolute -right-20 -top-32 h-60 w-80 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(236,72,153,0.16), transparent)" }} />
          <div className="absolute left-1/2 top-1/2 h-40 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(29,107,255,0.42), rgba(108,242,242,0.12) 55%, transparent)" }} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(108,242,242,0.75) 18%, rgba(29,107,255,0.95) 42%, rgba(168,85,247,0.95) 66%, rgba(236,72,153,0.8) 84%, transparent)" }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] -bottom-1 h-2 opacity-60 blur-md" style={{ background: "linear-gradient(90deg, rgba(108,242,242,0.6), rgba(29,107,255,0.7), rgba(168,85,247,0.7), rgba(236,72,153,0.6))" }} />

        <div className="relative mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <div className="flex items-center gap-2">
            {showBack ? (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] py-2 pl-2.5 pr-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:border-cyan-300/40 hover:bg-white/[0.12]"
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span>{t("common.back")}</span>
              </button>
            ) : (
              // Ciudad + hora, solo informativo (sin desplegable mientras Barcelona sea la única ciudad).
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] py-1.5 pl-3 pr-3.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:py-2 sm:text-sm">
                <span aria-hidden="true" className="live-dot h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <span>{selectedCity.name}</span>
                {clock && <span className="hidden tabular-nums text-white/55 sm:inline">{clock}</span>}
              </div>
            )}
          </div>

          <Link href="/" aria-label="Noctua" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Image
              src="/noctua_logo.png"
              alt="Noctua"
              width={160}
              height={98}
              className="h-11 w-auto object-contain drop-shadow-[0_0_14px_rgba(56,140,255,0.55)] sm:h-[52px]"
              style={{ maxWidth: "160px" }}
              priority
            />
          </Link>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  aria-label={t("header.notifications")}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] outline-none transition hover:border-cyan-300/40 hover:bg-white/[0.12] hover:shadow-[0_0_22px_-4px_rgba(108,242,242,0.5)]"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <Bell size={19} strokeWidth={1.8} aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-[#0b1030]" style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    {/* Antes: "absolute right-0" tomaba como referencia el propio botón de la
                        campana, que no está pegado al borde derecho de la pantalla (a su derecha
                        sigue el botón del menú ☰), y un primer intento con
                        w-[min(20rem,calc(100vw-3rem))] seguía saliéndose por la izquierda en
                        móvil (min()+calc() anidados en un valor arbitrario de Tailwind no siempre
                        compilan bien). Ahora se fija con márgenes simples (left-4/right-4, sin
                        calc ni min): el panel siempre mide "todo el ancho menos 16px a cada
                        lado", tope de 22rem, nunca se sale de la pantalla. En pantallas grandes
                        (sm:) vuelve a anclarse bajo la campana con ancho fijo. */}
                    <div className="fixed left-4 right-4 top-[80px] z-50 mx-auto max-h-[70vh] max-w-[22rem] overflow-y-auto rounded-2xl border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.85)] sm:left-auto sm:right-6 sm:top-[88px] sm:w-80 sm:max-w-none" style={{ background: "linear-gradient(180deg, #10183f 0%, #0a0c1c 100%)" }}>
                      <div className="border-b border-white/10 px-4 py-3">
                        <p className="text-sm font-bold text-white">{t("header.notifications")}</p>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-zinc-500">{t("header.noNotifications")}</p>
                      ) : (
                        notifications.slice(0, 8).map((n) => {
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
                      {/* Antes se listaban TODAS las notificaciones sin límite — con muchas
                          acumuladas el desplegable se hacía interminable. Ahora se corta en 8 y,
                          si hay más, un enlace lleva al buzón completo del perfil. */}
                      {notifications.length > 8 && (
                        <Link
                          href="/profile#buzon"
                          onClick={() => setNotifOpen(false)}
                          className="block px-4 py-3 text-center text-sm font-bold text-purple-300 transition hover:bg-white/[0.06]"
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
              className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] outline-none transition hover:border-cyan-300/40 hover:bg-white/[0.12] hover:shadow-[0_0_22px_-4px_rgba(108,242,242,0.5)]"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span aria-hidden="true" className="flex w-[18px] flex-col items-end gap-[5px]">
                <span className="h-[2px] w-full rounded-full bg-white" />
                <span className="h-[2px] w-[13px] rounded-full bg-white transition-all group-hover:w-full" />
                <span className="h-[2px] w-[8px] rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 transition-all group-hover:w-full" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {!isLoggedIn && !bannerDismissed && (
        <div className="sticky top-[72px] z-40 border-b border-white/[0.06] backdrop-blur-2xl sm:top-20" style={{ background: "linear-gradient(90deg, #141034, #0a0c1e)" }}>
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <p className="min-w-0 flex-1 truncate text-xs text-zinc-300 sm:text-sm">
              <span className="text-white">{t("authGate.bannerText")}</span>
            </p>
            <Link
              href="/signup"
              className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 sm:text-sm"
              style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
            >
              {t("authGate.bannerCta")}
            </Link>
            <button
              onClick={dismissBanner}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {weatherTip && !weatherTipDismissed && (
        // Sin "sticky": si la barra de registro también está visible, esta simplemente va
        // justo debajo en el flujo normal, sin pelearse por la misma posición al hacer scroll.
        <div
          className="border-b border-white/[0.06]"
          style={{ background: "linear-gradient(90deg, #141034, #0a0c1e)" }}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-2 sm:px-6">
            <span aria-hidden="true" className="text-sm">{weatherTip.icon}</span>
            <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug text-zinc-300 sm:text-sm">{weatherTip.text}</p>
            <button
              onClick={dismissWeatherTip}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-[190] bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
      )}

      <div style={{
        position: "fixed", top: 0, right: 0, zIndex: 200, height: "100%", width: "288px",
        background: "linear-gradient(180deg, #0f1640 0%, #080a18 45%, #06070f 100%)", borderLeft: "1px solid rgba(255,255,255,0.1)",
        display: "flex", flexDirection: "column",
        transform: menuOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease-in-out",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.8)",
        overflowY: "auto",
      }}>
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <p className="text-sm uppercase tracking-widest text-zinc-500">{t("header.menu")}</p>
          <button onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10 transition outline-none" aria-label={t("header.menu")}>
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        {!isLoggedIn && (
          <div className="mx-4 mt-4 rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/15 to-pink-500/10 p-5">
            <p className="text-lg font-black leading-tight text-white">✨ {t("authGate.title")}</p>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-zinc-300">{t("authGate.benefit1")}</p>
              <p className="text-xs text-zinc-300">{t("authGate.benefit2")}</p>
              <p className="text-xs text-zinc-300">{t("authGate.benefit3")}</p>
              <p className="text-xs text-zinc-300">{t("authGate.benefit4")}</p>
            </div>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="mt-4 flex items-center justify-center rounded-xl py-3 text-sm font-black text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
            >
              {t("authGate.ctaSignup")}
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-1 px-4 py-4 flex-1">
          {isLoggedIn && (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
              <User size={19} strokeWidth={1.7} className="text-purple-300" aria-hidden="true" />{t("nav.profile")}
            </Link>
          )}
          <Link href="/map" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <Map size={19} strokeWidth={1.7} className="text-purple-300" aria-hidden="true" />{t("nav.map")}
          </Link>
          <Link href="/plan" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <Sparkles size={19} strokeWidth={1.7} className="text-purple-300" aria-hidden="true" />{t("nav.plan")}
          </Link>
          <Link href="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <Heart size={19} strokeWidth={1.7} className="text-purple-300" aria-hidden="true" />{t("nav.favorites")}
          </Link>
          {/* Antes no había ninguna forma de contactar con soporte desde el menú — solo se
              llegaba a /contact si alguien encontraba el enlace en el footer. */}
          <Link href="/contact" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <MessageCircle size={19} strokeWidth={1.7} className="text-purple-300" aria-hidden="true" />{t("nav.contact")}
          </Link>
          {isAdmin && (
            <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
              <ShieldCheck size={19} strokeWidth={1.7} className="text-purple-300" aria-hidden="true" />Admin
            </Link>
          )}
        </div>

        {/* Antes: título fijo en inglés ("Barcelona tonight", sin traducir), sin mostrar la
            temperatura/condición actual (se calculaban pero nunca se pintaban en pantalla), y una
            cuadrícula de columnas fijas que se apretujaba cuanto más horas se mostraban. Ahora:
            título traducido, la condición actual destacada arriba a la derecha, y la fila de
            horas en una tira con scroll horizontal propio que nunca se aprieta aunque haya 8. */}
        {weather !== null && weather.nightHours.length > 0 && (
          <div style={{
            margin: "0 16px 12px 16px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(255,255,255,0.04))",
            padding: "14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {t("weather.tonightTitle")}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px" }}>{weather.icon}</span>
                <span style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>{weather.temp}°</span>
              </div>
            </div>
            <div className="scroll-x-thin" style={{ display: "flex", gap: "14px", overflowX: "auto", marginTop: "12px", paddingBottom: "8px" }}>
              {weather.nightHours.map((h) => (
                <div key={h.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flexShrink: 0, minWidth: "32px" }}>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>{h.label}</p>
                  <span style={{ fontSize: "19px" }}>{h.icon}</span>
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
              <Globe size={16} strokeWidth={1.7} className="text-purple-300" aria-hidden="true" />
              <img src={currentLang.flag} alt={currentLang.name} style={{ width: "18px", height: "13px", objectFit: "cover", borderRadius: "2px" }} />
              <span>{currentLang.name}</span>
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
                  {locale === lang.code && <Check size={14} strokeWidth={2} className="ml-auto text-emerald-400" aria-hidden="true" />}
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
