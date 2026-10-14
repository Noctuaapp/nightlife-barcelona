import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Planifica tu noche en Barcelona | Noctua",
  description: "Dinos qué música, zona y ambiente te apetecen y te proponemos un plan de noche en Barcelona.",
  alternates: { canonical: "https://www.noctuaapp.com/plan" },
}

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children
}
