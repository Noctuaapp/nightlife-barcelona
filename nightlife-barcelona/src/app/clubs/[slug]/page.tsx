import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import ClubPageContent from "../../../components/nightlife/ClubPageContent"
import Link from "next/link"
import { supabase } from "../../../lib/supabase"
import { createSlug } from "../../../lib/slug"

type ClubPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params

  // Filtramos hidden igual que en el listado — si no, un club oculto desde el admin seguía siendo
  // visitable por enlace directo (compartido, indexado por Google, guardado en favoritos antes de
  // ocultarlo...), que es justo lo que "ocultar" pretende evitar.
  const { data: clubs } = await supabase.from("clubs").select("*").eq("hidden", false)
  const club = clubs?.find((club) => createSlug(club.name) === slug)

  if (!club) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-5xl font-black">Club not found</h1>
          <Link href="/" className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-bold text-black">
            Back home
          </Link>
        </div>
      </main>
    )
  }

  const { data: clubEvents } = await supabase
    .from("club_events")
    .select("*")
    .eq("club_id", club.id)
    .order("date", { ascending: true })

  const { data: clubSessions } = await supabase
    .from("club_sessions")
    .select("*")
    .eq("club_id", club.id)
    .order("sort_order", { ascending: true })

  return (
    <>
      <Header />
      <ClubPageContent club={club} clubEvents={clubEvents || []} clubSessions={clubSessions || []} />
      <BottomNav />
    </>
  )
}