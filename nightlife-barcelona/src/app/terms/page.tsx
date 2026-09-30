"use client"

import { useLanguage } from "../../context/LanguageContext"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import { splitLines, renderWithLinks } from "@/lib/legalText"

const EMAIL_LINK = { email: { href: "mailto:info@noctuaapp.com", label: "info@noctuaapp.com" } }

function SimpleList({ text }: { text: string }) {
  return (
    <ul className="space-y-2 pl-4">
      {splitLines(text).map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function TermsPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-3">{t("terms.title")}</h1>
          <p className="text-white/40 text-sm">{t("terms.last_updated")}</p>
        </div>
        <div className="space-y-10 text-white/65 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. {t("terms.s1_title")}</h2>
            <p>{t("terms.s1_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. {t("terms.s2_title")}</h2>
            <p>{t("terms.s2_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. {t("terms.s3_title")}</h2>
            <p className="mb-3">{t("terms.s3_intro")}</p>
            <SimpleList text={t("terms.s3_items")} />
            <p className="mt-3">{t("terms.s3_closing")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. {t("terms.s4_title")}</h2>
            <p className="mb-3">{t("terms.s4_intro")}</p>
            <SimpleList text={t("terms.s4_items")} />
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. {t("terms.s5_title")}</h2>
            <p className="mb-3">{t("terms.s5_intro")}</p>
            <SimpleList text={t("terms.s5_items")} />
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. {t("terms.s6_title")}</h2>
            <p>{t("terms.s6_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. {t("terms.s7_title")}</h2>
            <p>{t("terms.s7_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. {t("terms.s8_title")}</h2>
            <p>{t("terms.s8_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. {t("terms.s9_title")}</h2>
            <p>{t("terms.s9_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. {t("terms.s10_title")}</h2>
            <p>{t("terms.s10_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">11. {t("terms.s11_title")}</h2>
            <p>{t("terms.s11_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">12. {t("terms.s12_title")}</h2>
            <p>{t("terms.s12_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">13. {t("terms.s13_title")}</h2>
            <p>{t("terms.s13_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">14. {t("terms.s14_title")}</h2>
            <p>{renderWithLinks(t("terms.s14_body"), EMAIL_LINK)}</p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
