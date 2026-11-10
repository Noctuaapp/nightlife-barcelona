import type { Metadata } from "next"
import NightBus, { nightBusMetadata } from "../../../components/intl/pages/NightBus"

// /de/night-bus: ruta fina; la página y sus textos están en components/intl/pages/NightBus.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const revalidate = 43200

export const metadata: Metadata = nightBusMetadata("de")

export default async function Page() {
  return <NightBus lang="de" />
}
