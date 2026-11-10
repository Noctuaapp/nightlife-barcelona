import type { Metadata } from "next"
import Metro, { metroMetadata } from "../../../components/intl/pages/Metro"

// /fr/metro: ruta fina; la página y sus textos están en components/intl/pages/Metro.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).

export const metadata: Metadata = metroMetadata("fr")

export default function Page() {
  return <Metro lang="fr" />
}
