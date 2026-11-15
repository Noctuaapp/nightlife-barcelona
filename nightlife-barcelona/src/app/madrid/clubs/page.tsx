import ClubsView, { clubsMetadata } from "../../../components/city/ClubsView"

// Listado de clubs de Madrid (Fase E): el mismo que el de Barcelona, con los locales de Madrid.
export const revalidate = 21600

export const metadata = clubsMetadata("madrid")

export default function MadridClubsPage() {
  return <ClubsView city="madrid" />
}
