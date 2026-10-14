"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { track } from "../../lib/track"
import FavoriteButton from "../favorites/FavoriteButton"
import AttendanceButton from "../gamification/AttendanceButton"
import NearbyVenuesSheet from "../nightlife/NearbyVenuesSheet"
import ClubMap from "../map/ClubMap"
import EventSessionsCalendar from "../nightlife/EventSessionsCalendar"
import ClubGallery from "./club/ClubGallery"
import ClubReviews from "./club/ClubReviews"
import RideButtons from "./club/RideButtons"
import Stars from "./club/Stars"
import Icon from "../ui/Icon"
import { toast } from "../ui/Toast"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"

// Ficha de evento, con la misma estructura que la de club (ver ClubPageContent): arriba fecha,
// lugar y dos botones; después los datos prácticos, entradas, ubicación, fotos y reseñas.
// Se han quitado la cuenta atrás gigante, el paralaje, el foco que seguía al ratón, el color
// aleatorio por evento y el bloque "Asegura tu entrada / se agotan rápido" que salía siempre.

function dateOnly(value: string): Date {
  // "2026-11-14" se interpreta a mediodía para que ninguna zona horaria lo cambie de día.
  return new Date(value.length <= 10 ? `${value}T12:00:00` : value)
}

const isEventPast = (date: string, dateEnd?: string | null): boolean => {
  if (!date) return false
  const end = dateOnly(dateEnd || date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 0)
  return end < today
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-card border border-white/10 bg-surface p-6 sm:p-7 ${className}`}>{children}</div>
}

export default function EventPageContent({ event, tickets, sessions }: { event: any; tickets: any[]; sessions: any[] }) {
  const { t, locale } = useLanguage()
  // La fecha depende del día en que se mira: se calcula tras montar (HTML de servidor y navegador iguales).
  const [past, setPast] = useState(false)
  useEffect(() => setPast(isEventPast(event.date, event.date_end)), [event.date, event.date_end])

  const firstOpenTicket = (tickets || []).find((tk) => tk.external_url)
  const ticketUrl: string | null = !past && !event.sold_out ? firstOpenTicket?.external_url || event.ticket_url || null : null
  const displayRating: number | null = event.google_rating || null
  const reviewCount: number | null = event.google_review_count || null
  const venue = event.club_name || event.address || "Barcelona"
  const hasCoords = !!event.latitude && !!event.longitude

  const trackClick = (eventType: string) => track(eventType, { itemType: "event", itemId: event.id, itemName: event.title })

  useEffect(() => {
    trackClick("page_view")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  const shareEvent = async () => {
    trackClick("share_click")
    const url = window.location.href
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ title: event.title, text: t("clubPage.shareText").replace("{name}", event.title), url })
      } catch {
        /* cancelado */
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      toast(t("clubPage.linkCopied"))
    }
  }

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`
    : event.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${event.address} ${event.title}`)}`
    : null

  const fmt = (d: string, long = true) =>
    dateOnly(d).toLocaleDateString(toDateLocale(locale), long ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" })
  const dateLabel = event.date ? fmt(event.date) : t("eventPage.dateTbc")
  const dateEndLabel = event.date_end && event.date_end !== event.date ? fmt(event.date_end) : null
  const fullDateLabel = dateEndLabel ? `${dateLabel} – ${dateEndLabel}` : dateLabel
  const shortDate = event.date ? (event.date_end && event.date_end !== event.date ? `${fmt(event.date, false)} – ${fmt(event.date_end, false)}` : fmt(event.date, false)) : null

  const priceTiers: { label: string; price: string }[] = Array.isArray(event.price_tiers) ? event.price_tiers : []
  const galleryImages: string[] = (Array.isArray(event.gallery) ? event.gallery : []).filter(
    (src: unknown): src is string => typeof src === "string" && src.length > 0
  )
  const allImages = [event.image, ...galleryImages].filter(Boolean) as string[]

  const quickFacts = [
    shortDate && { key: "date", icon: "calendar", label: t("event.date"), value: past ? t("event.finishedValue") : shortDate },
    event.start_time && { key: "time", icon: "clock", label: t("event.schedule"), value: `${event.start_time}${event.end_time ? ` – ${event.end_time}` : ""}` },
    event.price && { key: "price", icon: "ticket", label: t("event.price"), value: event.price },
    event.music && { key: "music", icon: "music", label: t("club.music"), value: event.music },
  ].filter(Boolean) as { key: string; icon: string; label: string; value: string }[]

  const secondaryBtn =
    "flex items-center justify-center gap-2 rounded-ctl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/10"
  const primaryBtn =
    "flex items-center justify-center gap-2 rounded-ctl bg-brand px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-strong"

  return (
    <main className="relative min-h-screen bg-night pb-40 text-ink lg:pb-16">
      <section className="relative">
        <div className="relative h-[46vh] max-h-[560px] min-h-[320px] w-full overflow-hidden">
          <Image src={event.image || FALLBACK_IMAGE} alt={event.title} fill priority sizes="100vw" unoptimized={!event.image} className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" />
        </div>

        <div className="relative -mt-28 px-4 sm:-mt-36 sm:px-6">
          <div className="mx-auto max-w-6xl">
            {(past || event.featured || event.sold_out || event.vip_tables) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {past && (
                  <span className="rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-xs font-semibold text-zinc-300">{t("event.finished")}</span>
                )}
                {event.featured && !past && (
                  <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-xs font-semibold text-ink">
                    <Icon name="star" className="h-3.5 w-3.5 text-warn" /> {t("event.featured")}
                  </span>
                )}
                {event.sold_out && (
                  <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/15 px-3 py-1.5 text-xs font-semibold text-red-200">
                    <Icon name="ban" className="h-3.5 w-3.5" /> {t("event.soldOut")}
                  </span>
                )}
                {event.vip_tables && !past && (
                  <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-xs font-semibold text-ink">
                    <Icon name="sofa" className="h-3.5 w-3.5 text-brand-soft" /> {t("event.vipTable")}
                  </span>
                )}
              </div>
            )}

            {event.music && <p className="text-sm font-semibold text-brand-soft">{event.music}</p>}
            <h1 className="font-display mt-1 break-words text-[2.2rem] leading-[1.04] text-ink sm:text-6xl md:text-7xl">{event.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
              <span className="flex items-center gap-1.5 capitalize">
                <Icon name="calendar" className="h-4 w-4 text-muted" /> {fullDateLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="map" className="h-4 w-4 text-muted" /> {venue}
              </span>
              {displayRating && (
                <span className="flex items-center gap-1.5">
                  <Stars rating={displayRating} />
                  <span className="font-semibold text-ink">{Number(displayRating).toFixed(1)}</span>
                  {reviewCount ? <span className="text-zinc-400">({reviewCount.toLocaleString("es-ES")})</span> : null}
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
              {ticketUrl && directionsUrl && (
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={secondaryBtn}>
                  <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
                </a>
              )}
              <button onClick={shareEvent} className={`${secondaryBtn} px-4`} aria-label={t("clubPage.share")}>
                <Icon name="share" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {quickFacts.length > 0 && (
        <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-white/10 bg-white/10 sm:grid-cols-4">
            {quickFacts.map((f) => (
              <div key={f.key} className="flex items-start gap-3 bg-surface p-4">
                <Icon name={f.icon} className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                <div className="min-w-0">
                  <dt className="text-xs text-zinc-400">{f.label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold capitalize leading-snug text-ink">{f.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="order-last space-y-6 lg:order-none lg:col-span-2">
            {(event.description || event.artist) && (
              <Panel>
                <h2 className="mb-4 text-lg font-semibold text-ink">{t("event.about")}</h2>
                {event.description && <p className="text-base leading-relaxed text-zinc-200">{event.description}</p>}
                {event.artist && (
                  <div className="mt-5 flex items-center gap-3 rounded-ctl border border-white/10 p-4">
                    <Icon name="headphones" className="h-5 w-5 shrink-0 text-brand-soft" />
                    <div>
                      <p className="text-xs text-zinc-400">{t("event.artist")}</p>
                      <p className="text-sm font-semibold text-ink">{event.artist}</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {sessions && sessions.length > 0 && (
              <Panel>
                <EventSessionsCalendar sessions={sessions} eventName={event.title} />
              </Panel>
            )}

            {(hasCoords || event.address) && (
              <Panel>
                <h2 className="mb-4 text-lg font-semibold text-ink">{t("clubPage.getThereBack")}</h2>
                {hasCoords && (
                  <div className="overflow-hidden rounded-ctl">
                    <ClubMap latitude={event.latitude} longitude={event.longitude} name={event.title} />
                  </div>
                )}
                {event.address && <p className="mt-4 text-sm text-zinc-300">{event.address}</p>}
                {directionsUrl && (
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={`${primaryBtn} mt-4 w-full`}>
                    <Icon name="map" className="h-4 w-4" /> {t("clubPage.openRoute")}
                  </a>
                )}
                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-ink">{t("clubPage.taxi")}</p>
                  <RideButtons name={event.title} address={event.address} lat={hasCoords ? Number(event.latitude) : null} lng={hasCoords ? Number(event.longitude) : null} />
                </div>
              </Panel>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border border-white/10 bg-surface p-5">
              <dl className="space-y-2.5 border-b border-white/10 pb-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-zinc-400">{t("event.date")}</dt>
                  <dd className="text-right font-semibold capitalize text-ink">{fullDateLabel}</dd>
                </div>
                {event.start_time && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-400">{t("event.time")}</dt>
                    <dd className="font-semibold text-ink">
                      {event.start_time}
                      {event.end_time ? ` – ${event.end_time}` : ""}
                    </dd>
                  </div>
                )}
                {priceTiers.length > 0
                  ? priceTiers.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <dt className="text-zinc-400">{tier.label}</dt>
                        <dd className="font-semibold text-ink">{tier.price}</dd>
                      </div>
                    ))
                  : event.price && (
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-zinc-400">{t("event.price")}</dt>
                        <dd className="font-semibold text-ink">{event.price}</dd>
                      </div>
                    )}
              </dl>

              <div className="mt-4 space-y-3">
                {tickets && tickets.length > 0
                  ? tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-ctl border border-white/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{ticket.name}</p>
                            {ticket.description && <p className="mt-1 text-xs text-zinc-400">{ticket.description}</p>}
                          </div>
                          {ticket.price ? <p className="shrink-0 text-sm font-semibold text-ink">{`${ticket.price} ${ticket.currency || "EUR"}`}</p> : null}
                        </div>
                        {ticket.external_url && !event.sold_out && !past && (
                          <a
                            href={ticket.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackClick("tickets_click")}
                            className={`${primaryBtn} mt-3 w-full py-3`}
                          >
                            <Icon name="ticket" className="h-4 w-4" /> {t("event.buy")}
                          </a>
                        )}
                      </div>
                    ))
                  : ticketUrl && (
                      <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={`${primaryBtn} hidden w-full lg:flex`}>
                        <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.tickets")}
                      </a>
                    )}
                {event.sold_out && (
                  <p className="flex items-center justify-center gap-2 rounded-ctl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
                    <Icon name="ban" className="h-4 w-4" /> {t("event.soldOut")}
                  </p>
                )}

                <FavoriteButton itemType="event" itemId={event.id} />
                {!past && <AttendanceButton itemType="event" itemId={event.id} />}
                {!past && hasCoords && (
                  <NearbyVenuesSheet venueType="event" venueId={event.id} name={event.title} latitude={event.latitude} longitude={event.longitude} />
                )}

                <a
                  href={"/contact?type=report_issue&subject=" + encodeURIComponent(`${t("event.reportSubjectPrefix")} ${event.title}`)}
                  className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-zinc-400 transition hover:text-ink"
                >
                  <Icon name="flag" className="h-3.5 w-3.5" /> {t("clubPage.report")}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="mt-16">
        <ClubGallery images={allImages} name={event.title} />
        <ClubReviews clubId={event.id} rating={displayRating} count={reviewCount} table="event_reviews" column="event_id" />
      </div>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-white/10 bg-night/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {ticketUrl ? (
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={`${primaryBtn} flex-1 py-3`}>
              <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.tickets")}
            </a>
          ) : directionsUrl ? (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={`${primaryBtn} flex-1 py-3`}>
              <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
            </a>
          ) : null}
          {ticketUrl && directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={`${secondaryBtn} h-11 w-11 px-0`} aria-label={t("clubPage.directions")}>
              <Icon name="map" className="h-4 w-4" />
            </a>
          )}
          <button onClick={shareEvent} className={`${secondaryBtn} h-11 w-11 px-0`} aria-label={t("clubPage.share")}>
            <Icon name="share" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  )
}
