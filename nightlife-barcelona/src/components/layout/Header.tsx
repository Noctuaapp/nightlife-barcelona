"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const showBack = !(["/", "/login", "/signup", "/map"].includes(pathname))
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

  if (hideHeader) return null

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="flex h-20 items-center justify-between px-6 relative">
        <div className="flex items-center gap-4">
            {showBack && (
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
            )}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <img
                src="/noctua_logo.png"
                alt="Noctua"
                className="h-12 w-auto object-contain"
                style={{ maxWidth: "160px" }}
              />
            </Link>
          </div>

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
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 50,
          height: "100%",
          width: "288px",
          background: "#000",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease-in-out",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.8)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <p className="text-sm uppercase tracking-widest text-zinc-500">Menu</p>
          <button
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10 transition text-lg outline-none"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1 px-4 py-6 flex-1">
          {isLoggedIn && (
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <span className="text-xl">👤</span>
              My Profile
            </Link>
          )}
          <Link
            href="/map"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <span className="text-xl">🗺️</span>
            Map
          </Link>
          <Link
            href="/plan"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 rounded-2xl px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <span className="text-xl">✨</span>
            Plan your night
          </Link>
        </div>

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
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-black transition hover:scale-[1.02]"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}