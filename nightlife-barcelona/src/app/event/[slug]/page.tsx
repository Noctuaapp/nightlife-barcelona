import Link from "next/link"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import FavoriteButton from "../../../components/favorites/FavoriteButton"
import ClubMap from "../../../components/map/ClubMap"
import EventSessionsCalendar from "../../../components/nightlife/EventSessionsCalendar"
import TransportButtons from "../../../components/ui/TransportButtons"
import { supabase } from "../../../lib/supabase"

type EventPageProps = {
  params: Promise<{ slug: string }>
}

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

const isEventPast = (date: string): boolean => {
  if (!date) return false
  const eventDate = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return eventDate < now
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params

  const { data: events } = await supabase.from("events").select("*")
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

  const past = isEventPast(event.date)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">

        <section className="relative h-[75vh] overflow-hidden">
          <img
            src={event.image || "/clubs/razz.jpg"}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />
          <div className="relative z-10 flex h-full items-end">
            <div className="mx-auto w-full max-w-7xl px-6 pb-16">
              <p className="text-sm uppercase tracking-[0.4em] text-zinc-300">
                {event.address || "Barcelona event"}
              </p>
              <h1 className="mt-5 max-w-5xl text-6xl font-black tracking-tight text-white md:text-8xl">
                {event.title}
              </h1>
              <div className="mt-8 flex flex-wrap gap-3">
                {past && (
                  <div className="rounded-full border border-zinc-500/30 bg-zinc-800/80 px-5 py-3 text-sm font-bold text-zinc-400">
                    ⏹ Evento terminado
                  </div>
                )}
                {event.featured && !past && (
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300">
                    🔥 Destacado
                  </div>
                )}
                {event.sold_out && (
                  <div className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300">
                    🚫 Agotado
                  </div>
                )}
                <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                  📅 {event.date ? new Date(event.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "TBA"}
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                  🎟 {event.price || "TBA"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-3">

            <div className="lg:col-span-2 space-y-10">
              <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Sobre el evento</p>
                <h2 className="mt-4 text-5xl font-black">Sobre este evento</h2>
                <p className="mt-8 text-lg leading-relaxed text-zinc-300">
                  {event.description || "Un evento en Barcelona."}
                </p>
              </div>

              {sessions && sessions.length > 0 && (
                <EventSessionsCalendar sessions={sessions} eventName={event.title} />
              )}
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Info del evento</p>
              <h3 className="mt-4 text-4xl font-black">Detalles</h3>

              <div className="mt-10 space-y-6 text-zinc-300">
                <div>
                  <p className="text-sm text-zinc-500">Fecha</p>
                  <p className="mt-2 text-lg">
                    📅 {event.date ? new Date(event.date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "TBA"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Hora</p>
                  <p className="mt-2 text-lg">🕒 {event.start_time || "TBA"} - {event.end_time || "TBA"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Precio</p>
                  <p className="mt-2 text-lg">🎟 {event.price || "TBA"}</p>
                </div>
              </div>

              {tickets && tickets.length > 0 && (
                <div className="mt-10">
                  <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Entradas</p>
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-white">{ticket.name}</h4>
                            {ticket.description && <p className="mt-1 text-sm text-zinc-400">{ticket.description}</p>}
                          </div>
                          <p className="shrink-0 font-black text-white">
                            {ticket.price ? `${ticket.price} ${ticket.currency || "EUR"}` : "TBA"}
                          </p>
                        </div>
                        {ticket.external_url && !event.sold_out && (
                          <a href={ticket.external_url} target="_blank" rel="noopener noreferrer"
                            className="mt-4 flex items-center justify-center rounded-xl bg-white px-4 py-3 font-bold text-black transition hover:scale-[1.02]">
                            Comprar entrada
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!tickets || tickets.length === 0) && event.ticket_url && !event.sold_out && !past && (
                <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
                  className="mt-10 flex items-center justify-center rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]">
                  Comprar entradas
                </a>
              )}

              {event.sold_out && (
                <div className="mt-10 flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 font-bold text-red-300">
                  🚫 Agotado
                </div>
              )}

              {past && (
                <div className="mt-10 flex items-center justify-center rounded-2xl border border-zinc-500/20 bg-zinc-800/50 px-6 py-4 font-bold text-zinc-400">
                  ⏹ Evento terminado
                </div>
              )}

              {event.latitude && event.longitude && (
                <div className="mt-8">
                  <p className="text-sm text-zinc-500 mb-3">Ubicación</p>
                  <ClubMap latitude={event.latitude} longitude={event.longitude} name={event.title} />
                  {event.address && <p className="mt-3 text-sm text-zinc-400">📍 {event.address}</p>}
                </div>
              )}

              <TransportButtons
                name={event.title}
                address={event.address}
                lat={event.latitude}
                lng={event.longitude}
              />

              <FavoriteButton itemType="event" itemId={event.id} />

              <Link href="/" className="mt-4 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10">
                Volver al inicio
              </Link>

              <a
                href={"/contact?type=report_issue&subject=" + encodeURIComponent("Reporte evento: " + event.title)}
                className="mt-3 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-zinc-400 transition hover:bg-white/10"
              >
                ⚑ Reportar información incorrecta
              </a>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}