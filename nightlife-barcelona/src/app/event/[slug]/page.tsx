import type { Metadata } from "next"
import { cache } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AdminEditButton from "../../../components/admin/AdminEditButton"
import EventPageContent from "../../../components/nightlife/EventPageContent"
import { supabase } from "../../../lib/supabase"
import { findBySlug } from "../../../lib/slugLookup"

type EventPageProps = {
  params: Promise<{ slug: string }>
}

// Igual que en /clubs/[slug]: título propio por evento y búsqueda ligera por slug (ver
// src/lib/slugLookup.ts). cache() evita repetir la búsqueda en la misma petición.
const getEvent = cache(async (slug: string) => findBySlug("event", slug))

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params
  const match = await getEvent(slug)

  if (!match) {
    return { title: "Evento no encontrado | Noctua" }
  }
  const event = match.row

  const venue = event.club_name ? ` en ${event.club_name}` : ""
  const title = `${event.title}${venue} | Noctua`
  const description = (
    event.description ||
    `${event.title}${venue ? ` en ${event.club_name}` : ""}, Barcelona. Fecha, horario, precio de entrada y cómo conseguir tickets en Noctua.`
  ).slice(0, 160)
  const url = `https://www.noctuaapp.com/event/${match.canonicalSlug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Noctua",
      locale: "es_ES",
      type: "website",
      images: event.image ? [{ url: event.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: event.image ? [event.image] : undefined,
    },
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const match = await getEvent(slug)

  // 404 real en vez de una página "no encontrado" con código 200 (soft 404 para Google).
  if (!match) notFound()
  if (!match.exact) permanentRedirect(`/event/${match.canonicalSlug}`)
  const event = match.row

  const [{ data: tickets }, { data: sessions }] = await Promise.all([
    supabase.from("tickets").select("*").eq("event_id", event.id).eq("available", true).order("price", { ascending: true }),
    supabase.from("event_sessions").select("*").eq("event_id", event.id).order("date", { ascending: true }),
  ])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description || undefined,
    image: event.image || undefined,
    url: `https://www.noctuaapp.com/event/${match.canonicalSlug}`,
    startDate: event.date || undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    // Antes un evento agotado se declaraba "EventCancelled" (cancelado) — Google lo mostraba como
    // cancelado. Agotado se indica en la oferta (availability), no en el estado del evento.
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.club_name || "Barcelona",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address || undefined,
        addressLocality: "Barcelona",
        addressCountry: "ES",
      },
      ...(event.latitude && event.longitude
        ? { geo: { "@type": "GeoCoordinates", latitude: event.latitude, longitude: event.longitude } }
        : {}),
    },
    ...(event.price
      ? {
          offers: {
            "@type": "Offer",
            price: event.price,
            priceCurrency: "EUR",
            url: event.ticket_url || undefined,
            availability: event.sold_out ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          },
        }
      : {}),
  }

  return (
    <>
      <Header />
      <EventPageContent event={event} tickets={tickets || []} sessions={sessions || []} />
      <AdminEditButton kind="event" id={event.id} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
