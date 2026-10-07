import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import EventPageContent from "../../../components/nightlife/EventPageContent"
import { supabase } from "../../../lib/supabase"
import { createSlug } from "../../../lib/slug"

type EventPageProps = {
  params: Promise<{ slug: string }>
}

// Igual que en /clubs/[slug]: antes todos los eventos compartían el <title>/descripción genéricos
// de la home, así que "Fiesta de Halloween en Pacha" y "Concierto de Techno en Razzmatazz"
// aparecían con el mismo título en Google. cache() evita pedir la lista de eventos dos veces.
const getEvent = cache(async (slug: string) => {
  // Filtramos hidden igual que en el listado, si no un evento oculto seguía siendo visitable
  // por enlace directo.
  const { data: events } = await supabase.from("events").select("*").eq("hidden", false)
  return events?.find((e) => createSlug(e.title) === slug) || null
})

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug)

  if (!event) {
    return { title: "Evento no encontrado | Noctua" }
  }

  const venue = event.club_name ? ` en ${event.club_name}` : ""
  const title = `${event.title}${venue} | Noctua`
  const description = (
    event.description ||
    `${event.title}${venue ? ` en ${event.club_name}` : ""}, Barcelona. Fecha, horario, precio de entrada y cómo conseguir tickets en Noctua.`
  ).slice(0, 160)
  const url = `https://noctuaapp.com/event/${slug}`

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
  const event = await getEvent(slug)

  // 404 real en vez de una página "no encontrado" con código 200 (soft 404 para Google).
  if (!event) notFound()

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("event_id", event.id)
    .eq("available", true)
    .order("price", { ascending: true })

  const { data: sessions } = await supabase
    .from("event_sessions")
    .select("*")
    .eq("event_id", event.id)
    .order("date", { ascending: true })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description || undefined,
    image: event.image || undefined,
    url: `https://noctuaapp.com/event/${slug}`,
    startDate: event.date || undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: event.sold_out
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
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
      ? { offers: { "@type": "Offer", price: event.price, priceCurrency: "EUR", url: event.ticket_url || undefined } }
      : {}),
  }

  return (
    <>
      <Header />
      <EventPageContent event={event} tickets={tickets || []} sessions={sessions || []} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
