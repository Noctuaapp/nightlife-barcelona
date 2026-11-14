"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AdminEditButton from "../../../components/admin/AdminEditButton"
import ClubPageContent from "../../../components/nightlife/ClubPageContent"
import { EditAccessProvider } from "../../../components/admin/EditAccess"
import { supabase } from "../../../lib/supabase"
import { useIsAdmin } from "../../../lib/useIsAdmin"
import { PRELAUNCH_CITY_NAMES } from "../../../lib/cities"
import { fetchCityClubs } from "../../../lib/previewCity"
import { matchPreviewClub } from "../../../lib/previewClubMatch"
import type { DbRow } from "../../../lib/clubQueries"
import NotFoundContent from "../../../components/system/NotFoundContent"

// Ficha de un local de una ciudad en vista previa (14/11/2026). El servidor no encuentra los locales ocultos
// (lib/slugLookup.ts) y devuelve un 404 real, que es lo que debe ver el público y Google. Esa respuesta cae aquí: si
// quien mira es el admin y el local es de una ciudad en prelaunch (Madrid), se carga en el navegador y se enseña la
// ficha completa para poder revisarla antes de abrir la ciudad. Para cualquier otra persona, o si el local no
// existe, sale la página 404 de siempre.
type Preview = { club: DbRow; events: DbRow[]; sessions: DbRow[]; related: DbRow[] }

const RELATED_FIELDS = "id, name, slug, image, neighborhood, music, rating, google_rating"

export default function ClubNotFound() {
  const pathname = usePathname() || ""
  const slug = pathname.split("/").filter(Boolean)[1] || ""
  const isAdmin = useIsAdmin()
  const [state, setState] = useState<"loading" | "none" | Preview>("loading")

  useEffect(() => {
    if (!isAdmin || !slug) return
    let alive = true
    ;(async () => {
      for (const cityName of PRELAUNCH_CITY_NAMES) {
        const rows = await fetchCityClubs(cityName, RELATED_FIELDS)
        const found = matchPreviewClub(rows as { id: number; name?: string | null; slug?: string | null }[], slug)
        if (!found) continue
        const [{ data: club }, { data: events }, { data: sessions }] = await Promise.all([
          supabase.from("clubs").select("*").eq("id", found.id).maybeSingle(),
          supabase.from("club_events").select("*").eq("club_id", found.id).order("date", { ascending: true }),
          supabase.from("club_sessions").select("*").eq("club_id", found.id).order("sort_order", { ascending: true }),
        ])
        if (!club) continue
        // Parecidos: los del mismo barrio primero, y los demás por orden de llegada.
        const related = rows
          .filter((r) => r.id !== found.id)
          .sort((a, b) => Number(b.neighborhood && b.neighborhood === club.neighborhood) - Number(a.neighborhood && a.neighborhood === club.neighborhood))
          .slice(0, 6)
        if (alive) setState({ club, events: events || [], sessions: sessions || [], related })
        return
      }
      if (alive) setState("none")
    })()
    return () => {
      alive = false
    }
  }, [isAdmin, slug])

  if (!isAdmin || state === "none") {
    // La misma página 404 de siempre (app/not-found.tsx).
    return (
      <>
        <Header />
        <NotFoundContent />
        <BottomNav />
      </>
    )
  }
  if (state === "loading") return null

  return (
    <>
      <Header />
      <EditAccessProvider ownerUserId={state.club.owner_user_id}>
        <ClubPageContent club={state.club} clubEvents={state.events} clubSessions={state.sessions} initialRelated={state.related} />
      </EditAccessProvider>
      <AdminEditButton kind="club" id={state.club.id} />
      <BottomNav />
    </>
  )
}
