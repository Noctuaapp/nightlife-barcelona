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

// Español es el idioma "fuente": siempre se carga como red de seguridad para que, si a un
// idioma le falta una clave (una traducción que aún no se ha añadido a ese JSON), el usuario
// vea el texto en español en vez de la clave técnica en crudo (ej. "profile.title").
const FALLBACK_LOCALE: Locale = "es"

function lookup(messages: Record<string, any>, key: string): string | undefined {
  const keys = key.split(".")
  let value: any = messages
  for (const k of keys) {
    value = value?.[k]
  }
  return typeof value === "string" ? value : undefined
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es")
  const [messages, setMessages] = useState<Record<string, any>>({})
  const [fallbackMessages, setFallbackMessages] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem("noctua_locale") as Locale) || "es"
    setLocaleState(saved)
  }, [])

  useEffect(() => {
    setLoaded(false)
    // Antes esto llevaba "?v=" + Date.now(), que invalidaba el caché del navegador en cada
    // carga y obligaba a descargar el JSON entero (35-40KB) en cada página/navegación. Los
    // archivos son estáticos y cambian solo cuando se despliega una versión nueva del sitio,
    // así que dejamos que el navegador los cachee con normalidad.
    fetch(`/messages/${locale}.json`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [locale])

  // Se carga aparte, una sola vez, salvo que el idioma activo ya sea español (entonces no hace
  // falta pedirlo dos veces).
  useEffect(() => {
    if (locale === FALLBACK_LOCALE) {
      setFallbackMessages(messages)
      return
    }
    fetch(`/messages/${FALLBACK_LOCALE}.json`)
      .then((res) => res.json())
      .then((data) => setFallbackMessages(data))
      .catch(() => {})
  }, [locale, messages])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("noctua_locale", newLocale)
  }

  const t = (key: string): string => {
    if (!loaded) return ""
    const direct = lookup(messages, key)
    if (direct !== undefined) return direct

    const fallback = lookup(fallbackMessages, key)
    if (fallback !== undefined) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] Falta la clave "${key}" en "${locale}.json" — usando español de respaldo.`)
      }
      return fallback
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Clave "${key}" no encontrada en ningún idioma.`)
    }
    return key
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)