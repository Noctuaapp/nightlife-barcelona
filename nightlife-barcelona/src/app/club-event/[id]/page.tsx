import { notFound } from "next/navigation"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import AdminEditButton from "../../../components/admin/AdminEditButton"
import ClubEventPageContent from "../../../components/nightlife/ClubEventPageContent"
import { supabase } from "../../../lib/supabase"
import { createSlug } from "../../../lib/slug"

type ClubEventPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ClubEventPage({ params }: ClubEventPageProps) {
  const { id } = await params

  const { data: clubEvent } = await supabase
    .from("club_events")
    .select("*")
    .eq("id", Number(id))
    .single()

  // 404 real (antes pintaba "no encontrada" con código 200, un soft 404 para Google).
  if (!clubEvent) notFound()

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("club_event_id", clubEvent.id)
    .eq("available", true)
    .order("price", { ascending: true })

  // Mismo slug que el resto de la web (antes tenía su propia versión, que dejaba símbolos como
  // "&" o "'" en el enlace y llevaba a un 404 en clubs con esos caracteres en el nombre).
  let clubSlug = createSlug(clubEvent.club_name)
  if (clubEvent.club_id) {
    const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubEvent.club_id).maybeSingle()
    if (club?.slug) clubSlug = club.slug
  }

  return (
    <>
      <Header />
      <ClubEventPageContent clubEvent={clubEvent} tickets={tickets || []} clubSlug={clubSlug} />
      <AdminEditButton kind="clubEvent" id={clubEvent.id} />
      <BottomNav />
    </>
  )
}
