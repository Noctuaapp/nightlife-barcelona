"use client"

import { useLanguage } from "../../context/LanguageContext"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import { splitLines, splitLabelItems, renderWithLinks } from "@/lib/legalText"

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

function LabelList({ text }: { text: string }) {
  return (
    <ul className="space-y-2 pl-4">
      {splitLabelItems(text).map(({ label, desc }) => (
        <li key={label} className="flex gap-2">
          <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
          <span><span className="text-white/80 font-medium">{label}:</span> {desc}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPage() {
  const { t, locale } = useLanguage()

  const googleSettingsLabel: Record<string, string> = {
    es: "configuración de cuenta de Google", en: "Google Account settings", ca: "configuració del compte de Google",
    fr: "paramètres de votre compte Google", de: "Google-Kontoeinstellungen", it: "impostazioni dell'account Google",
    nl: "Google-accountinstellingen",
  }
  const links = {
    ...EMAIL_LINK,
    googleSettings: { href: "https://myaccount.google.com/permissions", label: googleSettingsLabel[locale] || googleSettingsLabel.es, external: true },
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-3">{t("privacy.title")}</h1>
          <p className="text-white/40 text-sm">{t("privacy.last_updated")}</p>
        </div>
        <div className="space-y-10 text-white/65 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. {t("privacy.s1_title")}</h2>
            <p>{renderWithLinks(t("privacy.s1_body"), links)}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. {t("privacy.s2_title")}</h2>
            <p className="mb-3">{t("privacy.s2_intro")}</p>
            <LabelList text={t("privacy.s2_items")} />
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. {t("privacy.s3_title")}</h2>
            <p className="mb-3">{t("privacy.s3_intro")}</p>
            <SimpleList text={t("privacy.s3_items")} />
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. {t("privacy.s4_title")}</h2>
            <p>{t("privacy.s4_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. {t("privacy.s5_title")}</h2>
            <p>{t("privacy.s5_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. {t("privacy.s6_title")}</h2>
            <p>{t("privacy.s6_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. {t("privacy.s7_title")}</h2>
            <p className="mb-3">{t("privacy.s7_intro")}</p>
            <SimpleList text={t("privacy.s7_items")} />
            <p className="mt-3">{renderWithLinks(t("privacy.s7_closing"), links)}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. {t("privacy.s8_title")}</h2>
            <p>{t("privacy.s8_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. {t("privacy.s9_title")}</h2>
            <p className="mb-3">{t("privacy.s9_intro")}</p>
            <LabelList text={t("privacy.s9_items")} />
            <p className="mt-3">{t("privacy.s9_closing")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. {t("privacy.s10_title")}</h2>
            <p className="mb-3">{t("privacy.s10_intro")}</p>
            <LabelList text={t("privacy.s10_items")} />
            <p className="mt-3">{renderWithLinks(t("privacy.s10_closing"), links)}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">11. {t("privacy.s11_title")}</h2>
            <p>{t("privacy.s11_body")}</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">12. {t("privacy.s12_title")}</h2>
            <p>{renderWithLinks(t("privacy.s12_body"), links)}</p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
