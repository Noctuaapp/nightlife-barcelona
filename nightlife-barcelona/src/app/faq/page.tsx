"use client"

import { useState } from "react"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import { useLanguage } from "../../context/LanguageContext"

// Cada categoría guarda sus preguntas como un único string traducido: una pregunta por línea,
// con "pregunta||respuesta" (el sistema de traducciones solo devuelve strings, no arrays).
const CATEGORY_KEYS = ["cat1", "cat2", "cat3", "cat4", "cat5"]

function parseItems(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [q, a] = line.split("||")
      return { q: (q || "").trim(), a: (a || "").trim() }
    })
}

export default function FAQPage() {
  const { t } = useLanguage()
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  const toggle = (key: string) => {
    setOpenIndex(openIndex === key ? null : key)
  }

  const categories = CATEGORY_KEYS.map((catKey) => ({
    key: catKey,
    name: t(`faq.${catKey}_name`),
    items: parseItems(t(`faq.${catKey}_items`)),
  }))

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white mb-3">{t("faq.title")}</h1>
          <p className="text-white/50 text-sm">{t("faq.subtitle")}</p>
        </div>

        <div className="space-y-10">
          {categories.map((section) => (
            <div key={section.key}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-4">
                {section.name}
              </h2>
              <div className="space-y-2">
                {section.items.map((item, i) => {
                  const key = `${section.key}-${i}`
                  const isOpen = openIndex === key
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-white/8 overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 cursor-pointer"
                      >
                        <span className="text-white/90 text-sm font-medium leading-snug">
                          {item.q}
                        </span>
                        <span
                          className="text-white/40 text-lg flex-shrink-0 transition-transform duration-200"
                          style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                        >
                          +
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4">
                          <p className="text-white/55 text-sm leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-14 rounded-2xl border border-white/8 p-8 text-center"
          style={{ background: "rgba(168,85,247,0.06)" }}
        >
          <p className="text-white/80 font-medium mb-1">{t("faq.stillQuestions")}</p>
          <p className="text-white/40 text-sm mb-5">{t("faq.teamHelp")}</p>

          <a href="/contact"
            className="inline-block px-6 py-2.5 rounded-full text-sm font-medium text-white border border-white/20 hover:bg-white/10 transition-colors"
          >
            {t("faq.contactButton")}
          </a>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
