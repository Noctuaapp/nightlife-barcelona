import Link from "next/link"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import ClubEventPageContent from "../../../components/nightlife/ClubEventPageContent"
import { supabase } from "../../../lib/supabase"

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

  if (!clubEvent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-5xl font-black">Noche de club no encontrada</h1>
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
    .eq("club_event_id", clubEvent.id)
    .eq("available", true)
    .order("price", { ascending: true })

  const clubSlug = clubEvent.club_name
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-") || ""

  return (
    <>
      <Header />
      <ClubEventPageContent clubEvent={clubEvent} tickets={tickets || []} clubSlug={clubSlug} />
      <BottomNav />
    </>
  )
}
