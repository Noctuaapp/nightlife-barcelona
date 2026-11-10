import type { Metadata } from "next"
import NightBusLine, { nightBusLineMetadata } from "../../../../components/intl/pages/NightBusLine"

// /it/night-bus/[line]: ruta fina; la página y sus textos están en components/intl/pages/NightBusLine.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const revalidate = 43200
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ line: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  return await nightBusLineMetadata("it", line)
}

export default async function Page({ params }: Props) {
  const { line } = await params
  return <NightBusLine lang="it" line={line} />
}
