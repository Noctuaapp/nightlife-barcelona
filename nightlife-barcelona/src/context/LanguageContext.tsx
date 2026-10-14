"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
// El español va incluido en el propio código (no se pide por red). Antes t() devolvía "" hasta que
// llegaba el JSON, así que el HTML que generaba el servidor —el que lee Google— salía con los
// textos vacíos: Privacidad, Términos y FAQ se veían en blanco, y en cada carga había un parpadeo
// sin textos. Ahora la primera pintura ya trae el español y los demás idiomas se cargan encima.
import esMessages from "../../public/messages/es.json"

// Idiomas activos. Los archivos de francés, alemán, italiano y neerlandés siguen en
// public/messages, pero no se ofrecen hasta que estén completos.
type Locale = "es" | "en" | "ca"
const ACTIVE_LOCALES: Locale[] = ["es", "en", "ca"]

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
  const [messages, setMessages] = useState<Record<string, any>>(esMessages)
  const fallbackMessages: Record<string, any> = esMessages

  useEffect(() => {
    let saved: Locale = "es"
    try {
      const stored = localStorage.getItem("noctua_locale")
      if (stored && (ACTIVE_LOCALES as string[]).includes(stored)) saved = stored as Locale
      // Quien tenía elegido francés, alemán, italiano o neerlandés pasa a inglés.
      else if (stored) saved = "en"
    } catch {
      /* modo privado: se queda en español */
    }
    setLocaleState(saved)
  }, [])

  useEffect(() => {
    // Accesibilidad y analítica: la etiqueta <html lang> sigue al idioma elegido.
    document.documentElement.lang = locale
    if (locale === FALLBACK_LOCALE) {
      setMessages(esMessages)
      return
    }
    // Mientras llega el otro idioma se sigue viendo el español (nunca textos vacíos).
    fetch(`/messages/${locale}.json`)
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch(() => setMessages(esMessages))
  }, [locale])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem("noctua_locale", newLocale)
    } catch {
      /* sin almacenamiento: el idioma dura lo que la pestaña */
    }
  }

  const t = (key: string): string => {
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