import type { Metadata } from "next"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import EventsExplorer from "../../components/nightlife/EventsExplorer"
import EventsComingSoon from "../../components/nightlife/EventsComingSoon"
import { supabase } from "../../lib/supabase"
import { EVENT_IMAGE_FALLBACK, parsePriceEUR, safeJsonLd } from "../../lib/structuredData"
import { createSlug } from "../../lib/slug"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"

export const revalidate = 3600

export const metadata: Metadata = {
  // Con Eventos cerrado (lib/featureFlags.ts) esta dirección solo enseña el aviso «Próximamente»: no se indexa.
  ...(EVENTS_HIDDEN ? { robots: { index: false, follow: true } } : {}),
  title: "Eventos y fiestas en Barcelona | Noctua",
  description:
    "Los próximos eventos, festivales y fiestas en Barcelona: fecha, horario, precio y ubicación. Filtra por barrio, festival y entrada gratuita.",
  alternates: { canonical: "https://www.noctuaapp.com/events" },
  openGraph: {
    title: "Eventos y fiestas en Barcelona | Noctua",
    description: "Los próximos eventos, festivales y fiestas en Barcelona: fecha, horario, precio y ubicación.",
    url: "https://www.noctuaapp.com/events",
    siteName: "Noctua",
    locale: "es_ES",
    type: "website",
  },
}

export default async function EventsPage() {
  // Eventos cerrado (lib/featureFlags.ts): los visitantes ven el aviso «Próximamente». La agenda ni se pide
  // aquí; solo la carga el admin, ya con su sesión, dentro de EventsComingSoon.
  if (EVENTS_HIDDEN) {
    return (
      <>
        <Header />
        <EventsComingSoon />
        <BottomNav />
      </>
    )
  }

  const { data: events } = await supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true })

  // Datos estructurados de la lista (30/10/2026). Antes cada evento mandaba el precio tal cual lo
  // escribe el admin ("15€", "Gratis"), sin foto cuando el evento no tenía y hasta sin fecha:
  // Search Console lo marcaba como valor no válido / campo obligatorio ausente. Ahora el precio
  // pasa por parsePriceEUR (número limpio o se omite la oferta), "image" nunca falta, solo entran
  // eventos con fecha (startDate es obligatorio) y cada elemento lleva la dirección de su página.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: (events || [])
      .filter((event) => !!event.date && !!event.title)
      .slice(0, 30)
      .map((event, index) => {
        const price = parsePriceEUR(event.price)
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Event",
            name: event.title,
            url: `https://www.noctuaapp.com/event/${event.slug || createSlug(event.title)}`,
            image: event.image || EVENT_IMAGE_FALLBACK,
            startDate: event.date,
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
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
            },
            ...(price !== null
              ? {
                  offers: {
                    "@type": "Offer",
                    price,
                    priceCurrency: "EUR",
                    url: event.ticket_url || `https://www.noctuaapp.com/event/${event.slug || createSlug(event.title)}`,
                    availability: event.sold_out ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
                  },
                }
              : {}),
          },
        }
      }),
  }

  return (
    <>
      <Header />
      <EventsExplorer initialEvents={events || []} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  )
}