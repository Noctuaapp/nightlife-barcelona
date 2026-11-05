"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import { useIsAdmin } from "../../lib/useIsAdmin"
import { supabase } from "../../lib/supabase"
import ExploreSwitch from "./ExploreSwitch"
import EventsExplorer from "./EventsExplorer"
import NocOwl from "../mascot/NocOwl"
import SectionHero from "../ui/SectionHero"
import MananeoSection from "./MananeoSection"

// Pantalla de /events mientras Eventos está cerrado (EVENTS_HIDDEN en lib/featureFlags.ts; app/events/page.tsx):
// - Visitantes (y buscadores): solo ven «Próximamente» y un acceso a los clubs. La agenda ni se pide.
// - Admin: ve la agenda real para poder revisarla y terminarla; los eventos se piden aquí, ya con la
//   sesión de admin, en vez de enviarlos con la página a todo el mundo.
export default function EventsComingSoon() {
  const { t } = useLanguage()
  const isAdmin = useIsAdmin()
  const [events, setEvents] = useState<any[] | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    supabase
      .from("events")
      .select("*")
      .eq("hidden", false)
      .order("date", { ascending: true })
      .then(({ data }) => {
        if (alive) setEvents(data || [])
      })
    return () => {
      alive = false
    }
  }, [isAdmin])

  if (isAdmin && events) {
    return (
      <>
        <p className="bg-warn/10 px-4 py-2 text-center text-xs font-semibold text-warn" role="note">
          Vista de admin: los visitantes ven la pantalla «Próximamente».
        </p>
        <EventsExplorer initialEvents={events} />
        <MananeoSection />
      </>
    )
  }

  return (
    <main className="relative min-h-screen bg-night pb-40 text-ink">
      {/* PORTADA a pantalla casi completa con la foto de la web (03/11/2026): antes era un búho sobre fondo negro. */}
      <SectionHero section="events" title={t("events.soonTitle")} subtitle={t("events.soonBody")} switcher={<ExploreSwitch active="events" />} tall>
        <div className="mt-6 flex items-center gap-4">
          <Link
            href="/clubs"
            className="btn-pill btn-primary inline-flex items-center justify-center px-6 py-3 text-sm"
          >
            {t("events.soonCta")}
          </Link>
          <div className="shrink-0 rounded-full bg-black/35 p-1.5 backdrop-blur-md">
            <NocOwl size={44} mood="sleepy" />
          </div>
        </div>
      </SectionHero>
    </main>
  )
}
