import type { Metadata } from "next"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import Footer from "../../components/layout/Footer"
import ForVenuesContent from "../../components/marketing/ForVenuesContent"

// Página para dueños de clubs, organizadores y negocios nocturnos. El pie de página la enlaza
// ("¿Tienes un club…?"); antes ese enlace llevaba directamente al formulario genérico de contacto.
export const metadata: Metadata = {
  title: "Para locales y organizadores | Noctua",
  description:
    "Gestiona la ficha de tu club o evento en Noctua: horario, precios, fotos, estado de la cola en directo y tus noches con enlace de entradas.",
  alternates: { canonical: "https://www.noctuaapp.com/para-locales" },
  openGraph: {
    title: "Para locales y organizadores | Noctua",
    description: "Gestiona la ficha de tu club o evento en Noctua.",
    url: "https://www.noctuaapp.com/para-locales",
    siteName: "Noctua",
    locale: "es_ES",
    type: "website",
  },
}

export default function ForVenuesPage() {
  return (
    <>
      <Header />
      <ForVenuesContent />
      <Footer />
      <BottomNav />
    </>
  )
}
