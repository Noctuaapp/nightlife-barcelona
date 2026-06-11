"use client"

import { useRouter, usePathname } from "next/navigation"

export default function BackButton() {
  const router = useRouter()
  const pathname = usePathname()

  const hideOn = ["/", "/login", "/signup", "/map"]
  if (hideOn.includes(pathname)) return null

  return (
    <div className="sticky top-20 z-[9999] pointer-events-none">
      <div className="relative max-w-7xl mx-auto px-4">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto absolute top-3 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/10"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}