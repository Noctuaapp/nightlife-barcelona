"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function BottomNav() {

  const pathname = usePathname()

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: "🏠",
    },
    {
      label: "Favorites",
      href: "/favorites",
      icon: "❤️",
    },
    {
      label: "Map",
      href: "/map",
      icon: "🗺️",
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/90 backdrop-blur">

      <div className="mx-auto flex max-w-lg items-center justify-around py-3">

        {navItems.map((item) => {

          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-xs font-medium transition ${
                active
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >

              <span className="text-xl">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>

            </Link>
          )
        })}

      </div>

    </nav>
  )
}