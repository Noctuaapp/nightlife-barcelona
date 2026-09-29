"use client"

import Link from "next/link"
import FavoriteButton from "../favorites/FavoriteButton"
import AttendanceButton from "../gamification/AttendanceButton"
import ClubMap from "../map/ClubMap"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"

type Ticket = {
  id: number
  name: string
  description: string | null
  price: number | null
  currency: string | null
  external_url: string | null
}

type ClubEvent = {
  id: number
  title: string
  club_name: string | null
  image: string | null
  featured: boolean | null
  sold_out: boolean | null
  age_min: number | null
  music: string | null
  price: string | null
  description: string | null
  artist: string | null
  date: string | null
  start_time: string | null
  end_time: string | null
  ticket_url: string | null
  latitude: number | null
  longitude: number | null
}

type ClubEventPageContentProps = {
  clubEvent: ClubEvent
  tickets: Ticket[]
  clubSlug: string
}

export default function ClubEventPageContent({ clubEvent, tickets, clubSlug }: ClubEventPageContentProps) {
  const { t, locale } = useLanguage()

  return (
    <main className="min-h-screen bg-black pb-40 text-white">

      <section className="relative h-[75vh] overflow-hidden">
        <img
          src={clubEvent.image || "/clubs/razz.jpg"}
          alt={clubEvent.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />

        <div className="relative z-10 flex h-full items-end">
          <div className="mx-auto w-full max-w-7xl px-6 pb-16">
            <p className="text-sm uppercase tracking-[0.4em] text-zinc-300">
              {clubEvent.club_name || t("clubEvent.defaultClubName")}
            </p>
            <h1 className="mt-5 max-w-5xl text-6xl font-black tracking-tight text-white md:text-8xl">
              {clubEvent.title}
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              {clubEvent.featured && (
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300">
                  🔥 {t("clubEvent.featured")}
                </div>
              )}
              {clubEvent.sold_out && (
                <div className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300">
                  🚫 {t("club.sold_out")}
                </div>
              )}
              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white">
                🔞 +{clubEvent.age_min || 18}
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                🎧 {clubEvent.music || t("club.music")}
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                🎟 {clubEvent.price || t("clubEvent.tba")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-3">

          <div className="lg:col-span-2">
            <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("club.experience")}</p>
              <h2 className="mt-4 text-5xl font-black">{t("clubEvent.aboutThisNight")}</h2>
              <p className="mt-8 text-lg leading-relaxed text-zinc-300">
                {clubEvent.description || t("clubEvent.defaultDescription")}
              </p>
              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-sm text-zinc-500">{t("clubEvent.artist")}</p>
                  <p className="mt-3 text-2xl font-black">{clubEvent.artist || t("clubEvent.tba")}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-sm text-zinc-500">{t("clubEvent.club")}</p>
                  <p className="mt-3 text-2xl font-black">{clubEvent.club_name || t("clubEvent.defaultClubName")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("club.night_info")}</p>
            <h3 className="mt-4 text-4xl font-black">{t("club.details")}</h3>

            <div className="mt-10 space-y-6 text-zinc-300">
              <div>
                <p className="text-sm text-zinc-500">{t("clubEvent.date")}</p>
                <p className="mt-2 text-lg">
                  📅 {clubEvent.date
                    ? new Date(clubEvent.date).toLocaleDateString(toDateLocale(locale), {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : t("clubEvent.tba")}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("clubEvent.time")}</p>
                <p className="mt-2 text-lg">
                  🕒 {clubEvent.start_time || t("clubEvent.tba")} - {clubEvent.end_time || t("clubEvent.tba")}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("club.music")}</p>
                <p className="mt-2 text-lg">🎵 {clubEvent.music || t("clubEvent.tba")}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">{t("club.price")}</p>
                <p className="mt-2 text-lg">🎟 {clubEvent.price || t("clubEvent.tba")}</p>
              </div>
            </div>

            {tickets && tickets.length > 0 && (
              <div className="mt-10">
                <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">{t("clubEvent.tickets")}</p>
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-white">{ticket.name}</h4>
                          {ticket.description && (
                            <p className="mt-1 text-sm text-zinc-400">{ticket.description}</p>
                          )}
                        </div>
                        <p className="shrink-0 font-black text-white">
                          {ticket.price ? `${ticket.price} ${ticket.currency || "EUR"}` : t("clubEvent.tba")}
                        </p>
                      </div>
                      {ticket.external_url && !clubEvent.sold_out && (
                        <a
                          href={ticket.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 flex items-center justify-center rounded-xl bg-white px-4 py-3 font-bold text-black transition hover:scale-[1.02]"
                        >
                          {t("clubEvent.buyTicket")}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!tickets || tickets.length === 0) && clubEvent.ticket_url && !clubEvent.sold_out && (
              <a
                href={clubEvent.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 flex items-center justify-center rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
              >
                {t("clubEvent.getTickets")}
              </a>
            )}

            {clubEvent.sold_out && (
              <div className="mt-10 flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 font-bold text-red-300">
                {t("club.sold_out")}
              </div>
            )}

            {clubEvent.latitude && clubEvent.longitude && (
              <div className="mt-8">
                <p className="text-sm text-zinc-500 mb-3">{t("club.location")}</p>
                <ClubMap
                  latitude={clubEvent.latitude}
                  longitude={clubEvent.longitude}
                  name={clubEvent.title}
                />
              </div>
            )}

            <FavoriteButton itemType="club_event" itemId={clubEvent.id} />
            {!clubEvent.sold_out && <AttendanceButton itemType="club_event" itemId={clubEvent.id} />}

            <Link
              href={clubSlug ? `/clubs/${clubSlug}` : "/clubs"}
              className="mt-4 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10"
            >
              {t("clubEvent.backToClub")}
            </Link>
          </div>

        </div>
      </section>
    </main>
  )
}
