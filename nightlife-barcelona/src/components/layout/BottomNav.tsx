"use client"

import Link from "next/link"

import {
  Home,
  Calendar,
  Heart,
  Sparkles,
  Shield,
  User,
} from "lucide-react"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
export default function BottomNav() {

  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getUser()
  
      if (
        data.user?.email === "info@noctuaapp.com"
      ) {
        setIsAdmin(true)
      }
    }
  
    checkAdmin()
  }, [])
  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
    },
    {
      label: "Events",
      href: "/events",
      icon: Calendar,
    },
    {
      label: "Plan",
      href: "/plan",
      icon: Sparkles,
    },
    {
      label: "Favorites",
      href: "/favorites",
      icon: Heart,
    },
    {
      label: "Profile",
      href: "/profile",
      icon: User,
    },
  
    ...(isAdmin
      ? [
          {
            label: "Admin",
            href: "/admin",
            icon: Shield,
          },
        ]
      : []),
  ]

  return (

    <div className="fixed bottom-4 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-around rounded-2xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-2xl">

      {navItems.map((item) => {

        const Icon = item.icon

        const active =
          pathname === item.href

        return (

          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
              active
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >

            <Icon size={18} />

            <span>
              {item.label}
            </span>

          </Link>

        )
      })}

    </div>
  )
}