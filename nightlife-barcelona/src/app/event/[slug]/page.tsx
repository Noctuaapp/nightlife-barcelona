import type { Metadata } from "next"
import { cache } from "react"
import { notFound, permanentRedirect } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AdminEditButton from "../../../components/admin/AdminEditButton"
import EventPageContent from "../../../components/nightlife/EventPageContent"
import { EditAccessProvider } from "../../../components/admin/EditAccess"
import { supabase } from "../../../lib/supabase"
import { findBySlug } from "../../../lib/slugLookup"
import { EVENT_IMAGE_FALLBACK, parsePriceEUR } from "../../../lib/structuredData"

// ISR: la ficha se genera la primera vez que alguien la pide y se sirve ya hecha durante 5 min
// (antes se generaba de cero en cada visita, consultando la base de datos cada vez). Los cambios
// del admin o del dueño tardan como mucho 5 min en verse.
export const revalidate = 300
export async function generateStaticParams() {
  return []
}

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

  // event.price es texto libre que escribe el admin ("15€", "Gratis", "10-15€"...) — Google
  // exige un número limpio en el Offer, así que se pasa por parsePriceEUR() (ver lib/structuredData).
  // Si no se puede sacar un número, se omite "offers" entero en vez de mandar uno inválido.
  const eventPrice = parsePriceEUR(event.price)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description || undefined,
    // Nunca vacío: Google exige al menos una imagen para el resultado enriquecido de evento.
    image: event.image || EVENT_IMAGE_FALLBACK,
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
    ...(eventPrice !== null
      ? {
          offers: {
            "@type": "Offer",
            price: eventPrice,
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
      <EditAccessProvider ownerUserId={event.owner_user_id}>
        <EventPageContent event={event} tickets={tickets || []} sessions={sessions || []} />
      </EditAccessProvider>
      <AdminEditButton kind="event" id={event.id} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
