"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { usePathname } from "next/navigation"

import { supabase } from "../../lib/supabase"

export default function Header() {
  const pathname = usePathname()

  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      setIsLoggedIn(!!data.session)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const navItems = [
    {
      label: "Clubs",
      href: "/clubs",
    },
    {
      label: "Events",
      href: "/events",
    },
    {
      label: "Essentials",
      href: "/essentials",
    },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-black shadow-2xl transition hover:scale-105">
            N
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Barcelona
            </p>

            <h1 className="text-lg font-black tracking-tight text-white">
              Nightlife
            </h1>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              href="/profile"
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-105"
            >
              My Profile
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="hidden rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08] sm:inline-flex"
              >
                Create account
              </Link>

              <Link
                href="/login"
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-105"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}