import type { Metadata } from "next"
import MetroLine, { metroLineMetadata } from "../../../../components/intl/pages/MetroLine"
import { METRO_LINE_CODES } from "../../../../lib/metroLines"

// /en/metro/[line]: ruta fina; la página y sus textos están en components/intl/pages/MetroLine.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const dynamicParams = false
export function generateStaticParams() {
  return METRO_LINE_CODES.map((line) => ({ line }))
}

type Props = { params: Promise<{ line: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  return await metroLineMetadata("en", line)
}

export default async function Page({ params }: Props) {
  const { line } = await params
  return <MetroLine lang="en" line={line} />
}
