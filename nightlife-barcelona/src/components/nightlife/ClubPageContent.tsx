"use client"

import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import FavoriteButton from "../favorites/FavoriteButton"
import ClubMap from "../map/ClubMap"
import ClubNightsCalendar from "../nightlife/ClubNightsCalendar"
import TransportButtons from "../ui/TransportButtons"

export default function ClubPageContent({ club, clubEvents }: { club: any; clubEvents: any[] }) {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-black pb-40 text-white">
      <section className="relative h-[75vh] overflow-hidden">
        <img
          src={club.image || "/clubs/razz.jpg"}
          alt={club.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />
        <div className="relative z-10 flex h-full items-end">
          <div className="mx-auto w-full max-w-7xl px-6 pb-16">
            <p className="text-sm uppercase tracking-[0.4em] text-zinc-300">
              {club.music || "Barcelona nightlife"}
            </p>
            <h1 className="mt-5 text-6xl font-black tracking-tight text-white md:text-8xl">
              {club.name}
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              {club.trending && (
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300">
                  🔥 {t("club.trending")}
                </div>
              )}
              {club.sold_out && (
                <div className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300">
                  🚫 {t("club.sold_out")}
                </div>
              )}
              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                📍 {club.neighborhood || "Barcelona"}
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                ⏳ {club.queue || t("club.no_queue")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("club.experience")}</p>
              <h2 className="mt-4 text-5xl font-black">{t("club.about")}</h2>
              <p className="mt-8 text-lg leading-relaxed text-zinc-300">
                {club.description || `${club.name} is one of Barcelona's nightlife venues, known for its ${club.music ? ` ${club.music.toLowerCase()} ` : " "}${t("club.atmosphere")}, live energy and late-night crowd.`}
              </p>
              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-sm text-zinc-500">{t("club.music")}</p>
                  <p className="mt-3 text-2xl font-black">🎵 {club.music || "TBA"}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-sm text-zinc-500">{t("club.area")}</p>
                  <p className="mt-3 text-2xl font-black">📍 {club.neighborhood || "Barcelona"}</p>
                </div>
              </div>
            </div>

            {clubEvents && clubEvents.length > 0 && (
              <ClubNightsCalendar clubEvents={clubEvents} clubName={club.name} />
            )}
          </div>

          <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("club.night_info")}</p>
            <h3 className="mt-4 text-4xl font-black">{t("club.details")}</h3>
            <div className="mt-10 space-y-6 text-zinc-300">
              <div>
                <p className="text-sm text-zinc-500">{t("club.hours")}</p>
                <p className="mt-2 text-lg">🕒 {club.hours || "TBA"}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("club.price")}</p>
                <p className="mt-2 text-lg">🎟 {club.price || "TBA"}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("club.live_status")}</p>
                <p className="mt-2 text-lg">🔥 {club.live_status || "Normal"}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("club.queue")}</p>
                <p className="mt-2 text-lg">⏳ {club.queue || t("club.no_queue")}</p>
              </div>
              {club.metro_lines && (
                <div>
                  <p className="text-sm text-zinc-500">{t("club.metro")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {club.metro_lines.split(",").map((line: string) => (
                      <span key={line.trim()} className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-sm font-bold text-red-300">
                        🚇 {line.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {club.night_buses && (
                <div>
                  <p className="text-sm text-zinc-500">{t("club.night_buses")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {club.night_buses.split(",").map((bus: string) => (
                      <span key={bus.trim()} className="rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-sm font-bold text-blue-300">
                        🚌 {bus.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {club.latitude && club.longitude && (
              <div className="mt-8">
                <p className="text-sm text-zinc-500 mb-3">{t("club.location")}</p>
                <ClubMap latitude={club.latitude} longitude={club.longitude} name={club.name} />
                {club.address && (
                  <p className="mt-3 text-sm text-zinc-400">📍 {club.address}</p>
                )}
              </div>
            )}

            <TransportButtons
              name={club.name}
              address={club.address}
              lat={club.latitude}
              lng={club.longitude}
            />

            <FavoriteButton itemType="club" itemId={club.id} />

            <Link
              href="/"
              className="mt-4 flex items-center justify-center rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
            >
              {t("club.back_home")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}