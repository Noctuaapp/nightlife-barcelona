import type { Metadata } from "next"
import Metro, { metroMetadata } from "../../../components/intl/pages/Metro"

// /en/metro: ruta fina; la página y sus textos están en components/intl/pages/Metro.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).

export const metadata: Metadata = metroMetadata("en")

export default function Page() {
  return <Metro lang="en" />
}
