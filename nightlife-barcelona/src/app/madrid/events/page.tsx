import type { Metadata } from "next"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import EventsExplorer from "../../../components/nightlife/EventsExplorer"
import EventsComingSoon from "../../../components/nightlife/EventsComingSoon"
import { fetchCityEvents } from "../../../lib/cityEvents"
import { cityRobots } from "../../../lib/citySeo"
import { EVENTS_HIDDEN } from "../../../lib/featureFlags"

// Eventos de Madrid (15/11/2026): la misma pantalla que /events, solo con los eventos de Madrid (lib/cityEvents.ts).
// Con Eventos cerrado (lib/featureFlags.ts) los visitantes ven el aviso «Próximamente» y el admin la agenda real de Madrid.
export const revalidate = 21600

export const metadata: Metadata = {
  title: "Eventos y fiestas en Madrid | Noctua",
  description: "Los próximos eventos, festivales y fiestas en Madrid: fecha, horario, precio y ubicación.",
  // Madrid en prelaunch no se indexa (cityRobots); con Eventos cerrado tampoco, abierta la ciudad o no.
  ...(EVENTS_HIDDEN ? { robots: { index: false, follow: true } } : cityRobots("madrid")),
}

export default async function MadridEventsPage() {
  if (EVENTS_HIDDEN) {
    return (
      <>
        <Header />
        <EventsComingSoon />
        <BottomNav />
      </>
    )
  }
  const events = await fetchCityEvents("madrid")
  return (
    <>
      <Header />
      <EventsExplorer initialEvents={events} />
      <BottomNav />
    </>
  )
}
