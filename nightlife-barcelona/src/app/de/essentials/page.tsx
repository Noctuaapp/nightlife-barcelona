import type { Metadata } from "next"
import Essentials, { essentialsMetadata } from "../../../components/intl/pages/Essentials"

// /de/essentials: ruta fina; la página y sus textos están en components/intl/pages/Essentials.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).

export const metadata: Metadata = essentialsMetadata("de")

export default function Page() {
  return <Essentials lang="de" />
}
