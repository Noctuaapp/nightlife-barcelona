import type { Metadata } from "next"
import Home, { homeMetadata } from "../../components/intl/pages/Home"

// /en: ruta fina; la página y sus textos están en components/intl/pages/Home.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const revalidate = 86400

export const metadata: Metadata = homeMetadata("en")

export default async function Page() {
  return <Home lang="en" />
}
