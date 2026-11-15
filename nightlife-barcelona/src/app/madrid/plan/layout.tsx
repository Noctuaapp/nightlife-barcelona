import type { Metadata } from "next"
import { cityRobots } from "../../../lib/citySeo"

export const metadata: Metadata = {
  title: "Planifica tu noche en Madrid | Noctua",
  description: "Dinos qué música, zona y ambiente te apetecen y te proponemos un plan de noche en Madrid.",
  alternates: { canonical: "https://www.noctuaapp.com/madrid/plan" },
  ...cityRobots("madrid"),
}

export default function MadridPlanLayout({ children }: { children: React.ReactNode }) {
  return children
}
