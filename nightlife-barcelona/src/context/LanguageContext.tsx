"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Locale = "es" | "en" | "ca" | "fr" | "de" | "it" | "nl"

type LanguageContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "es",
  setLocale: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es")
  const [messages, setMessages] = useState<Record<string, any>>({})

  useEffect(() => {
    const saved = localStorage.getItem("noctua_locale") as Locale
    const initial = saved || "es"
    setLocaleState(initial)
  }, [])

  useEffect(() => {
    fetch(`/messages/${locale}.json?v=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch(() => {})
  }, [locale])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("noctua_locale", newLocale)
  }

  const t = (key: string): string => {
    const keys = key.split(".")
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    return typeof value === "string" ? value : key
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)