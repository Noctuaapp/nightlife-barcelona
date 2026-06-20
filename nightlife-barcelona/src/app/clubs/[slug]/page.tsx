import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import ClubPageContent from "../../../components/nightlife/ClubPageContent"
import Link from "next/link"
import { supabase } from "../../../lib/supabase"

type ClubPageProps = {
  params: Promise<{ slug: string }>
}

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params

  const { data: clubs } = await supabase.from("clubs").select("*")
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

  return (
    <>
      <Header />
      <ClubPageContent club={club} clubEvents={clubEvents || []} />
      <BottomNav />
    </>
  )
}