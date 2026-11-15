import type { Metadata } from "next"
import HomeView from "../../components/city/HomeView"
import { cityHomeMetadata } from "../../lib/citySeo"

// Portada de Madrid (Fase E). Mismo componente que la de Barcelona, con los locales de Madrid. Mientras Madrid esté en
// prelaunch, la lista llega vacía (fetchVisibleClubs) y la puerta de /madrid solo deja pasar al admin.
export const revalidate = 21600

export const metadata: Metadata = cityHomeMetadata("madrid")

export default function MadridHome() {
  return <HomeView city="madrid" />
}
