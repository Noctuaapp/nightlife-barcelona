"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "../ui/SafeImage" // <Image> que nunca deja una foto rota
import HeroImage from "../ui/HeroImage"
import FavoriteButton from "../favorites/FavoriteButton"
import AttendanceButton from "../gamification/AttendanceButton"
import ClubMap from "../map/ClubMap"
import RideButtons from "./club/RideButtons"
import Icon from "../ui/Icon"
import { toast } from "../ui/Toast"
import { track } from "../../lib/track"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { InlineEditText, InlineEditImage } from "../admin/InlineEdit"
import { useCanEdit } from "../admin/EditAccess"

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// Noche concreta de un club (las que publica el local desde /mi-club). Misma estructura que las
// fichas de club y evento. Antes: portada de 75 % de pantalla con un velo negro al 70 %, emojis en
// cada dato y "Por confirmar" en todo lo que faltaba; ahora solo se enseña lo que hay.

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
  age_min?: number | null
  music: string | null
  price: string | null
  description: string | null
  artist: string | null
  date: string | null
  start_time: string | null
  end_time: string | null
  ticket_url: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Club = Record<string, any> | null

function dateOnly(value: string): Date {
  return new Date(value.length <= 10 ? `${value}T12:00:00` : value)
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card border border-white/10 bg-surface p-6 sm:p-7">{children}</div>
}

export default function ClubEventPageContent({
  clubEvent,
  club,
  clubName,
  tickets,
  clubSlug,
}: {
  clubEvent: ClubEvent
  club: Club
  clubName: string | null
  tickets: Ticket[]
  clubSlug: string
}) {
  const { t, locale } = useLanguage()
  const isAdmin = useCanEdit() // admin, o el dueño de esta ficha (ver admin/EditAccess)
  const [past, setPast] = useState(false)
  useEffect(() => {
    if (!clubEvent.date) return
    const end = dateOnly(clubEvent.date)
    end.setHours(23, 59, 59, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setPast(end < today)
  }, [clubEvent.date])

  const trackClick = (eventType: string, meta?: Record<string, unknown>) =>
    track(eventType, { itemType: "club_event", itemId: clubEvent.id, itemName: clubEvent.title, meta })
  useEffect(() => {
    trackClick("page_view")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubEvent.id])

  const lat = club?.latitude ? Number(club.latitude) : null
  const lng = club?.longitude ? Number(club.longitude) : null
  const hasCoords = !!lat && !!lng
  const firstTicket = tickets.find((tk) => tk.external_url)
  const ticketUrl = !past && !clubEvent.sold_out ? firstTicket?.external_url || clubEvent.ticket_url || null : null
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : club?.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${club.address} ${club.name}`)}`
    : null
  const image = clubEvent.image || club?.image || null
  const clubHref = clubSlug ? `/clubs/${clubSlug}` : null

  const dateLabel = clubEvent.date
    ? cap(dateOnly(clubEvent.date).toLocaleDateString(toDateLocale(locale), { weekday: "long", day: "numeric", month: "long" }))
    : null
  const timeLabel = clubEvent.start_time ? `${clubEvent.start_time}${clubEvent.end_time ? ` – ${clubEvent.end_time}` : ""}` : null

  const share = async () => {
    trackClick("share_click")
    const url = window.location.href
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ title: clubEvent.title, text: t("clubPage.shareText").replace("{name}", clubEvent.title), url })
      } catch {
        /* cancelado */
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      toast(t("clubPage.linkCopied"))
    }
  }

  const facts = [
    dateLabel && { key: "date", field: null, icon: "calendar", label: t("event.date"), value: past ? t("event.finishedValue") : dateLabel },
    timeLabel && { key: "time", field: null, icon: "clock", label: t("event.schedule"), value: timeLabel },
    clubEvent.price && { key: "price", field: "price", icon: "ticket", label: t("event.price"), value: clubEvent.price },
    clubEvent.music && { key: "music", field: "music", icon: "music", label: t("club.music"), value: clubEvent.music },
  ].filter(Boolean) as { key: string; field: string | null; icon: string; label: string; value: string }[]

  const primaryBtn = "flex items-center justify-center gap-2 rounded-ctl bg-brand px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
  const secondaryBtn = "flex items-center justify-center gap-2 rounded-ctl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/10"

  return (
    <main className="relative min-h-screen bg-night pb-40 text-ink lg:pb-16">
      <section className="relative">
        <div className="relative h-[40vh] max-h-[480px] min-h-[280px] w-full overflow-hidden">
          <HeroImage src={image} alt={clubEvent.title} fallback={FALLBACK_IMAGE} />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" />
          <InlineEditImage table="club_events" id={clubEvent.id} field="image" bucket="event-images" label="Cambiar foto" />
        </div>

        <div className="relative -mt-24 px-4 sm:-mt-32 sm:px-6">
          <div className="mx-auto max-w-6xl">
            {(past || clubEvent.featured || clubEvent.sold_out || clubEvent.age_min) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {past && <span className="rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-xs font-semibold text-zinc-300">{t("event.finished")}</span>}
                {clubEvent.featured && !past && (
                  <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-xs font-semibold text-ink">
                    <Icon name="star" className="h-3.5 w-3.5 text-warn" /> {t("event.featured")}
                  </span>
                )}
                {clubEvent.sold_out && (
                  <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/15 px-3 py-1.5 text-xs font-semibold text-red-200">
                    <Icon name="ban" className="h-3.5 w-3.5" /> {t("event.soldOut")}
                  </span>
                )}
                {clubEvent.age_min ? (
                  <span className="rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-xs font-semibold text-ink">+{clubEvent.age_min}</span>
                ) : null}
              </div>
            )}

            <p className="text-sm font-semibold text-brand-soft empty:hidden">
              <InlineEditText table="club_events" id={clubEvent.id} field="music" value={clubEvent.music} emptyLabel="añadir estilo musical" />
            </p>
            <h1 className="font-display mt-1 break-words text-[2.1rem] leading-[1.05] text-ink sm:text-6xl">
              <InlineEditText table="club_events" id={clubEvent.id} field="title" value={clubEvent.title} />
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
              {dateLabel && (
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" className="h-4 w-4 text-muted" /> {dateLabel}
                </span>
              )}
              {timeLabel && (
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" className="h-4 w-4 text-muted" /> {timeLabel}
                </span>
              )}
              {clubName && (
                <span className="flex items-center gap-1.5">
                  <Icon name="map" className="h-4 w-4 text-muted" />
                  {clubHref ? (
                    <Link href={clubHref} className="font-semibold text-ink underline decoration-white/30 underline-offset-4 hover:decoration-white">
                      {clubName}
                    </Link>
                  ) : (
                    clubName
                  )}
                  {club?.neighborhood ? <span className="text-zinc-400">· {club.neighborhood}</span> : null}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {ticketUrl ? (
                <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={primaryBtn}>
                  <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.tickets")}
                </a>
              ) : directionsUrl ? (
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={primaryBtn}>
                  <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
                </a>
              ) : null}
              {clubHref && (
                <Link href={clubHref} className={secondaryBtn}>
                  {t("clubEvent.seeClub")}
                </Link>
              )}
              <button onClick={share} className={`${secondaryBtn} px-4`} aria-label={t("clubPage.share")}>
                <Icon name="share" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {facts.length > 0 && (
        <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-white/10 bg-white/10 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.key} className="flex items-start gap-3 bg-surface p-4">
                <Icon name={f.icon} className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                <div className="min-w-0">
                  <dt className="text-xs text-zinc-400">{f.label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold leading-snug text-ink">
                    {f.field ? <InlineEditText table="club_events" id={clubEvent.id} field={f.field} value={f.value} /> : f.value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="order-last min-w-0 space-y-6 lg:order-none lg:col-span-2">
            {(clubEvent.description || clubEvent.artist || isAdmin) && (
              <Panel>
                <h2 className="mb-4 text-lg font-semibold text-ink">{t("clubEvent.aboutThisNight")}</h2>
                <p className="whitespace-pre-line text-base leading-relaxed text-zinc-200 empty:hidden">
                  <InlineEditText table="club_events" id={clubEvent.id} field="description" value={clubEvent.description} multiline emptyLabel="añadir descripción" />
                </p>
                {clubEvent.artist && (
                  <div className="mt-5 flex items-center gap-3 rounded-ctl border border-white/10 p-4">
                    <Icon name="headphones" className="h-5 w-5 shrink-0 text-brand-soft" />
                    <div>
                      <p className="text-xs text-zinc-400">{t("clubEvent.artist")}</p>
                      <p className="text-sm font-semibold text-ink">{clubEvent.artist}</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {(hasCoords || club?.address) && (
              <Panel>
                <h2 className="mb-4 text-lg font-semibold text-ink">{t("clubPage.getThereBack")}</h2>
                {hasCoords && (
                  <div className="overflow-hidden rounded-ctl">
                    <ClubMap latitude={lat as number} longitude={lng as number} name={clubName || clubEvent.title} />
                  </div>
                )}
                {club?.address && <p className="mt-4 text-sm text-zinc-300">{club.address}</p>}
                {directionsUrl && (
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={`${primaryBtn} mt-4 w-full`}>
                    <Icon name="map" className="h-4 w-4" /> {t("clubPage.openRoute")}
                  </a>
                )}
                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-ink">{t("clubPage.taxi")}</p>
                  <RideButtons
                    name={clubName || clubEvent.title}
                    address={club?.address}
                    lat={lat}
                    lng={lng}
                    onRideClick={(provider) => trackClick("ride_click", { provider })}
                  />
                </div>
              </Panel>
            )}
          </div>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border border-white/10 bg-surface p-5">
              {(dateLabel || timeLabel || clubEvent.price) && (
                <dl className="space-y-2.5 border-b border-white/10 pb-4 text-sm">
                  {dateLabel && (
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-zinc-400">{t("event.date")}</dt>
                      <dd className="text-right font-semibold text-ink">{dateLabel}</dd>
                    </div>
                  )}
                  {timeLabel && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-zinc-400">{t("event.time")}</dt>
                      <dd className="font-semibold text-ink">{timeLabel}</dd>
                    </div>
                  )}
                  {clubEvent.price && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-zinc-400">{t("event.price")}</dt>
                      <dd className="font-semibold text-ink">{clubEvent.price}</dd>
                    </div>
                  )}
                </dl>
              )}

              <div className="mt-4 space-y-3">
                {tickets.length > 0
                  ? tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-ctl border border-white/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{ticket.name}</p>
                            {ticket.description && <p className="mt-1 text-xs text-zinc-400">{ticket.description}</p>}
                          </div>
                          {ticket.price ? <p className="shrink-0 text-sm font-semibold text-ink">{`${ticket.price} ${ticket.currency || "EUR"}`}</p> : null}
                        </div>
                        {ticket.external_url && !clubEvent.sold_out && !past && (
                          <a href={ticket.external_url} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={`${primaryBtn} mt-3 w-full py-3`}>
                            <Icon name="ticket" className="h-4 w-4" /> {t("clubEvent.buyTicket")}
                          </a>
                        )}
                      </div>
                    ))
                  : ticketUrl && (
                      <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={`${primaryBtn} hidden w-full lg:flex`}>
                        <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.tickets")}
                      </a>
                    )}
                {clubEvent.sold_out && (
                  <p className="flex items-center justify-center gap-2 rounded-ctl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
                    <Icon name="ban" className="h-4 w-4" /> {t("event.soldOut")}
                  </p>
                )}

                <FavoriteButton itemType="club_event" itemId={clubEvent.id} />
                {!past && !clubEvent.sold_out && <AttendanceButton itemType="club_event" itemId={clubEvent.id} />}

                <a
                  href={"/contact?type=report_issue&subject=" + encodeURIComponent(`${t("event.reportSubjectPrefix")} ${clubEvent.title}`)}
                  className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-zinc-400 transition hover:text-ink"
                >
                  <Icon name="flag" className="h-3.5 w-3.5" /> {t("clubPage.report")}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {ticketUrl ? (
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={`${primaryBtn} flex-1 py-3`}>
              <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.tickets")}
            </a>
          ) : directionsUrl ? (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={`${primaryBtn} flex-1 py-3`}>
              <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
            </a>
          ) : clubHref ? (
            <Link href={clubHref} className={`${primaryBtn} flex-1 py-3`}>
              {t("clubEvent.seeClub")}
            </Link>
          ) : null}
          <button onClick={share} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl border border-white/15 bg-white/5 text-ink transition hover:bg-white/10" aria-label={t("clubPage.share")}>
            <Icon name="share" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  )
}
