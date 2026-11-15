import type { Metadata } from "next"
import EssentialsCategoryServer, { essentialCategoryParams, essentialsCategoryMetadata } from "../../../../components/city/EssentialsCategoryServer"

// Categorías de esenciales de Madrid (Fase E): mismo título, descripción y texto de servidor que las de Barcelona, con los
// esenciales de Madrid (src/components/city/EssentialsCategoryServer.tsx).
export function generateStaticParams() {
  return essentialCategoryParams("madrid")
}
export const dynamicParams = false
export const revalidate = 21600

export async function generateMetadata(props: { params: Promise<{ category: string }> }): Promise<Metadata> {
  return essentialsCategoryMetadata("madrid", props)
}

export default function MadridEssentialsCategoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ category: string }> }) {
  return (
    <EssentialsCategoryServer city="madrid" params={params}>
      {children}
    </EssentialsCategoryServer>
  )
}
