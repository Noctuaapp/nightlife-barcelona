import type { Metadata } from "next"
import GuidesIndex, { guidesIndexMetadata } from "../../../components/intl/pages/GuidesIndex"

// /en/guides: ruta fina; la página y sus textos están en components/intl/pages/GuidesIndex.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).

export const metadata: Metadata = guidesIndexMetadata("en")

export default function Page() {
  return <GuidesIndex lang="en" />
}
