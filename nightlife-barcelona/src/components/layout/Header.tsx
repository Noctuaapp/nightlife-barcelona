"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "../../lib/supabase"

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

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState(cities[0])
  const [weather, setWeather] = useState<{
    temp: number
    icon: string
    nightHours: WeatherHour[]
  } | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const showBack = !(["/", "/login", "/signup", "/map", "/events", "/clubs", "/essentials", "/favorites", "/profile", "/plan", "/admin"].includes(pathname)) && !pathname.startsWith("/event/") && !pathname.startsWith("/essentials/") && !pathname.startsWith("/club-event/")
  const hideHeader = pathname === "/map"

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })
    return () => { subscription.unsubscribe() }
  }, [])

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
        const allNightHours = ["T23:00", "T00:00", "T01:00", "T02:00", "T03:00", "T05:00", "T06:00"]

        const nightHours: WeatherHour[] = allNightHours
          .filter((h) => {
            const hour = parseInt(h.replace("T", "").replace(":00", ""))
            if (hour >= 23) return currentHour <= hour
            if (currentHour >= 7) return true
            return true
          })
          .slice(0, 4)
          .map((h) => {
            const idx = data.hourly.time.findIndex((t: string) => t.includes(h))
            const temp = idx !== -1 ? Math.round(data.hourly.temperature_2m[idx]) : null
            const code = idx !== -1 ? data.hourly.weathercode[idx] : null
            const icon = code !== null ? (weatherCodes[code] || "🌡") : "🌡"
            const label = h.replace("T", "").replace(":00", "") + ":00"
            return { label, icon, temp: temp ?? 0 }
          })

        setWeather({ temp: currentTemp, icon: currentIcon, nightHours })
      } catch (e) {
        console.log("Weather error:", e)
      }
    }
    fetchWeather()
  }, [selectedCity])

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
                <span>Back</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setCityOpen(!cityOpen)}
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span>📍</span>
                  <span>{selectedCity.name}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
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
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
      )}

      <div style={{
        position: "fixed", top: 0, right: 0, zIndex: 50, height: "100%", width: "288px",
        background: "#000", borderLeft: "1px solid rgba(255,255,255,0.1)",
        display: "flex", flexDirection: "column",
        transform: menuOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease-in-out",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.8)",
      }}>
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <p className="text-sm uppercase tracking-widest text-zinc-500">Menu</p>
          <button onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10 transition text-lg outline-none">✕</button>
        </div>

        <div className="flex flex-col gap-1 px-4 py-6 flex-1">
          {isLoggedIn && (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
              <span className="text-xl">👤</span>My Profile
            </Link>
          )}
          <Link href="/map" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <span className="text-xl">🗺️</span>Map
          </Link>
          <Link href="/plan" onClick={() => setMenuOpen(false)} className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <span className="text-xl">✨</span>Plan your night
          </Link>
        </div>

        {weather !== null && weather.nightHours.length > 0 && (
          <div style={{
            margin: "0 16px 16px 16px",
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

        <div className="px-4 py-6 border-t border-white/10">
          {isLoggedIn ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setMenuOpen(false)
                window.location.href = "/login"
              }}
              className="w-full flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Log out
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">Login</Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} className="flex items-center justify-center rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-black transition hover:scale-[1.02]">Create account</Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}