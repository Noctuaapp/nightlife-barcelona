import type { Metadata } from "next"
import ClubsList, { clubsMetadata } from "../../../components/intl/pages/ClubsList"

// /en/clubs: ruta fina; la página y sus textos están en components/intl/pages/ClubsList.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const revalidate = 43200

export const metadata: Metadata = clubsMetadata("en")

export default async function Page() {
  return <ClubsList lang="en" />
}
