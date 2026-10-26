import type { Metadata } from "next"
import es from "../../../public/messages/es.json"
import { safeJsonLd } from "../../lib/structuredData"

// Título propio + datos estructurados FAQPage: con ellos Google puede mostrar las preguntas
// desplegables directamente en los resultados de búsqueda. Se generan en el servidor a partir del
// mismo texto en español que usa la página, así nunca se desincronizan.
export const metadata: Metadata = {
  title: "Preguntas frecuentes | Noctua",
  description:
    "Cómo funciona Noctua: cuentas, check-ins, favoritos, estado en directo de los locales, privacidad y cómo dar de alta tu club o evento.",
  alternates: { canonical: "https://www.noctuaapp.com/faq" },
}

const CATEGORY_KEYS = ["cat1", "cat2", "cat3", "cat4", "cat5"] as const

function faqItems() {
  const faq = (es as { faq: Record<string, string> }).faq
  return CATEGORY_KEYS.flatMap((cat) =>
    (faq[`${cat}_items`] || "")
      .split("\n")
      .map((line) => line.split("||"))
      .filter(([q, a]) => q?.trim() && a?.trim())
      .map(([q, a]) => ({
        "@type": "Question",
        name: q.trim(),
        acceptedAnswer: { "@type": "Answer", text: a.trim() },
      }))
  )
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems() }
  return (
    <>
      {children}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    </>
  )
}
