import ClubsView, { clubsMetadata } from "../../components/city/ClubsView"

// 05/11/2026: antes 3600 s. Subido a 6 h para gastar menos «ISR Writes» de Vercel (ver src/app/clubs/[slug]/page.tsx).
export const revalidate = 21600

export const metadata = clubsMetadata("barcelona")

export default function ClubsPage() {
  return <ClubsView city="barcelona" />
}
