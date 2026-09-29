import Link from "next/link"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import EventPageContent from "../../../components/nightlife/EventPageContent"
import { supabase } from "../../../lib/supabase"
import { createSlug } from "../../../lib/slug"

type EventPageProps = {
  params: Promise<{ slug: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params

  // Filtramos hidden igual que en el listado, si no un evento oculto seguía siendo visitable
  // por enlace directo.
  const { data: events } = await supabase.from("events").select("*").eq("hidden", false)
  const event = events?.find((e) => createSlug(e.title) === slug)

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-5xl font-black">Evento no encontrado</h1>
          <Link href="/" className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-bold text-black">
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

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

  return (
    <>
      <Header />
      <EventPageContent event={event} tickets={tickets || []} sessions={sessions || []} />
      <BottomNav />
    </>
  )
}
