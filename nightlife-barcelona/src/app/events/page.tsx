import type { Metadata } from "next"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import EventsExplorer from "../../components/nightlife/EventsExplorer"
import { supabase } from "../../lib/supabase"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Eventos y fiestas en Barcelona | Noctua",
  description:
    "Los próximos eventos, festivales y fiestas en Barcelona: fecha, horario, precio y ubicación. Filtra por barrio, festival y entrada gratuita.",
  alternates: { canonical: "https://noctuaapp.com/events" },
  openGraph: {
    title: "Eventos y fiestas en Barcelona | Noctua",
    description: "Los próximos eventos, festivales y fiestas en Barcelona: fecha, horario, precio y ubicación.",
    url: "https://noctuaapp.com/events",
    siteName: "Noctua",
    locale: "es_ES",
    type: "website",
  },
}

export default async function EventsPage() {
  const { data: events } = await supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: (events || []).slice(0, 30).map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Event",
        name: event.title,
        image: event.image || undefined,
        startDate: event.date || undefined,
        location: {
          "@type": "Place",
          name: event.club_name || "Barcelona",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Barcelona",
            addressCountry: "ES",
          },
        },
        ...(event.price
          ? { offers: { "@type": "Offer", price: event.price, priceCurrency: "EUR", url: event.ticket_url || undefined } }
          : {}),
      },
    })),
  }

  return (
    <>
      <Header />
      <EventsExplorer initialEvents={events || []} />
      <BottomNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}