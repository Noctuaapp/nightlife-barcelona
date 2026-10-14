import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AdminEditButton from "../../../components/admin/AdminEditButton"
import ClubEventPageContent from "../../../components/nightlife/ClubEventPageContent"
import { supabase } from "../../../lib/supabase"
import { createSlug } from "../../../lib/slug"

type ClubEventPageProps = {
  params: Promise<{ id: string }>
}

// Noches de club (las que publica cada local desde /mi-club). Antes estaban bloqueadas en
// robots.txt y sin título propio, así que Google no podía mostrar "Viernes en X" aunque fuera
// justo lo que la gente busca. Ahora tienen título, descripción, datos estructurados de evento y
// se generan con ISR (una vez cada 5 min como mucho).
export const revalidate = 300
export async function generateStaticParams() {
  return []
}

const getData = cache(async (rawId: string) => {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) return null
  const { data: clubEvent } = await supabase.from("club_events").select("*").eq("id", id).maybeSingle()
  if (!clubEvent) return null
  let club: Record<string, any> | null = null
  if (clubEvent.club_id) {
    const { data } = await supabase
      .from("clubs")
      .select("id, name, slug, image, address, neighborhood, latitude, longitude, hidden")
      .eq("id", clubEvent.club_id)
      .maybeSingle()
    if (data && !data.hidden) club = data
  }
  return { clubEvent, club }
})

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })
}

export async function generateMetadata({ params }: ClubEventPageProps): Promise<Metadata> {
  const { id } = await params
  const data = await getData(id)
  if (!data) return { title: "Noche no encontrada | Noctua" }
  const { clubEvent, club } = data

  const clubName = club?.name || clubEvent.club_name
  const when = clubEvent.date ? `, ${formatDate(clubEvent.date)}` : ""
  const title = `${clubEvent.title}${clubName ? ` en ${clubName}` : ""}${when} | Noctua`
  const description = (
    clubEvent.description ||
    `${clubEvent.title}${clubName ? ` en ${clubName}` : ""}, Barcelona${when}. Horario, precio, entradas y cómo llegar.`
  ).slice(0, 160)
  const url = `https://www.noctuaapp.com/club-event/${clubEvent.id}`
  const image = clubEvent.image || club?.image || undefined

  // Una noche que ya pasó sigue accesible (enlaces compartidos), pero se pide no indexarla.
  const today = new Date().toISOString().slice(0, 10)
  const past = !!clubEvent.date && clubEvent.date < today

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(past ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website", images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  }
}

export default async function ClubEventPage({ params }: ClubEventPageProps) {
  const { id } = await params
  const data = await getData(id)
  // 404 real (antes pintaba "no encontrada" con código 200, un soft 404 para Google).
  if (!data) notFound()
  const { clubEvent, club } = data

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("club_event_id", clubEvent.id)
    .eq("available", true)
    .order("price", { ascending: true })

  const clubSlug = club?.slug || (clubEvent.club_name ? createSlug(clubEvent.club_name) : "")
  const clubName = club?.name || clubEvent.club_name || null

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: clubEvent.title,
    description: clubEvent.description || undefined,
    image: clubEvent.image || club?.image || undefined,
    url: `https://www.noctuaapp.com/club-event/${clubEvent.id}`,
    startDate: clubEvent.date ? `${clubEvent.date}${clubEvent.start_time && /^\d{1,2}:\d{2}$/.test(clubEvent.start_time) ? `T${clubEvent.start_time.padStart(5, "0")}` : ""}` : undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    ...(clubEvent.artist ? { performer: { "@type": "PerformingGroup", name: clubEvent.artist } } : {}),
    location: {
      "@type": "Place",
      name: clubName || "Barcelona",
      address: {
        "@type": "PostalAddress",
        streetAddress: club?.address || undefined,
        addressLocality: "Barcelona",
        addressCountry: "ES",
      },
      ...(club?.latitude && club?.longitude ? { geo: { "@type": "GeoCoordinates", latitude: club.latitude, longitude: club.longitude } } : {}),
    },
    ...(clubEvent.ticket_url
      ? {
          offers: {
            "@type": "Offer",
            url: clubEvent.ticket_url,
            availability: clubEvent.sold_out ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          },
        }
      : {}),
  }

  return (
    <>
      <Header />
      <ClubEventPageContent clubEvent={clubEvent} club={club} clubName={clubName} tickets={tickets || []} clubSlug={clubSlug} />
      <AdminEditButton kind="clubEvent" id={clubEvent.id} />
      <BottomNav />
      {clubEvent.date && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </>
  )
}
