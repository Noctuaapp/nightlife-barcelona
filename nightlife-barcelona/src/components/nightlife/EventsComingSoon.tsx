"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import { useIsAdmin } from "../../lib/useIsAdmin"
import { supabase } from "../../lib/supabase"
import ExploreSwitch from "./ExploreSwitch"
import EventsExplorer from "./EventsExplorer"
import NocOwl from "../mascot/NocOwl"

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
      </>
    )
  }

  return (
    <main className="relative min-h-screen bg-night pb-40 text-ink">
      <section className="px-4 pt-8 sm:pt-12">
        <div className="mx-auto max-w-7xl">
          <ExploreSwitch active="events" />
          <div className="mx-auto mt-16 max-w-xl text-center">
            <div className="mx-auto w-fit">
              <NocOwl size={96} mood="sleepy" />
            </div>
            <h1 className="font-display mt-6 break-words text-[2rem] leading-[1.1] text-ink sm:text-5xl">{t("events.soonTitle")}</h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-zinc-300">{t("events.soonBody")}</p>
            <Link
              href="/clubs"
              className="mt-8 inline-flex items-center justify-center rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
            >
              {t("events.soonCta")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
