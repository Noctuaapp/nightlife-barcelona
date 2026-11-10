import type { Metadata } from "next"
import GuidesIndex, { guidesIndexMetadata } from "../../../components/intl/pages/GuidesIndex"

// /fr/guides: ruta fina; la página y sus textos están en components/intl/pages/GuidesIndex.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).

export const metadata: Metadata = guidesIndexMetadata("fr")

export default function Page() {
  return <GuidesIndex lang="fr" />
}
