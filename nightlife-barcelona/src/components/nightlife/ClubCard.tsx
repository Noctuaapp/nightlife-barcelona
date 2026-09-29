"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createSlug } from "../../lib/slug"
import { useLanguage } from "../../context/LanguageContext"

interface ClubCardProps {
  id: number
  name: string
  music: string
  area: string
  price: string
  hours: string
  image: string
  rating: number
  people: number
  badges?: string[]
  terrace?: boolean
  vip?: boolean
  smokingArea?: boolean
  tableBooking?: boolean
  dresscode?: string
  lgtbi_friendly?: boolean
  verified?: boolean
  hasFoosball?: boolean
  discountInfo?: string
  freeEntryInfo?: string
}

export default function ClubCard({
  id, name, music, area, price, hours, image, rating, people, badges = [], vip, lgtbi_friendly, verified,
  hasFoosball, discountInfo, freeEntryInfo,
}: ClubCardProps) {
  const [liveBadges, setLiveBadges] = useState(badges)
  const router = useRouter()
  const slug = createSlug(name)
  const { t } = useLanguage()

  return (
    <Link href={`/clubs/${slug}`} className="group block overflow-hidden rounded-[30px] border border-white/10 bg-black transition duration-500 hover:-translate-y-2 hover:border-white/20">
      <div className="relative h-[420px] overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-110"
          />
        ) : (
          // Antes esto caía en un fallback fijo "/clubs/razz.jpg" (un archivo que ni siquiera
          // existe en el repo, así que daba 404) y hacía que cualquier club sin foto propia
          // mostrase la misma imagen de otro club. Ahora, sin foto, mostramos un degradado con
          // el emoji de música en vez de una imagen fija de otro local.
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/60 via-black to-black">
            <span className="text-6xl opacity-30">🎵</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          {liveBadges?.slice(0, 2).map((badge, index) => (
            <button key={badge} onClick={(e) => {
              e.preventDefault()
              const updated = [...liveBadges]
              // Se compara solo por el emoji (no por el texto completo) para que el toggle
              // funcione igual aunque el texto mostrado esté traducido a otro idioma.
              const isTrending = badge.includes("🔥")
              updated[index] = isTrending ? `🟢 ${t("clubCard.liveNow")}` : `🔥 ${t("clubCard.trending")}`
              setLiveBadges(updated)
            }} className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl transition hover:scale-105 hover:bg-white/20">
              {badge}
            </button>
          ))}
          {lgtbi_friendly && (
            <div className="rounded-full border border-pink-500/30 bg-pink-500/20 px-3 py-2 text-xs font-semibold text-pink-300 backdrop-blur-xl">
              🏳️‍🌈 LGTBI+
            </div>
          )}
          {vip && (
            <div className="rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300 backdrop-blur-xl">
              🛋️ {t("clubCard.vipTable")}
            </div>
          )}
          {verified && (
            <div className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-300 backdrop-blur-xl">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-white font-black text-[10px]">N</span>
              {t("clubCard.verified")}
            </div>
          )}
          {freeEntryInfo && (
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 backdrop-blur-xl">
              🎫 {t("clubCard.freeEntry")}
            </div>
          )}
          {discountInfo && (
            <div className="rounded-full border border-orange-500/30 bg-orange-500/20 px-3 py-2 text-xs font-semibold text-orange-300 backdrop-blur-xl">
              💸 {t("clubCard.promoToday")}
            </div>
          )}
          {hasFoosball && (
            <div className="rounded-full border border-sky-500/30 bg-sky-500/20 px-3 py-2 text-xs font-semibold text-sky-300 backdrop-blur-xl">
              🎱 {t("clubCard.foosballBilliards")}
            </div>
          )}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.push(`/map?type=clubs&id=${id}`)
            }}
            className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl transition hover:scale-105 hover:bg-white/20"
          >
            🗺️ {t("clubCard.viewOnMap")}
          </button>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6">
          <p className="text-sm uppercase tracking-wide text-zinc-400">{music}</p>
          <h3 className="mt-2 text-4xl font-black tracking-tight text-white">{name}</h3>
          <div className="mt-5 flex items-center justify-between text-sm text-zinc-300">
            <span>📍 {area}</span>
            <span>⭐ {rating}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">🔥 {people}+ {t("clubCard.tonight")}</div>
            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">🎟 {price}</div>
            <div className="max-w-full whitespace-normal break-words leading-snug rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">🕒 {hours}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}