"use client"

import { Fragment } from "react"
import { useLanguage } from "../../context/LanguageContext"

// "Acepto los {terms} y la {privacy}…" con los dos enlaces dentro de la frase traducida.
export default function TermsText({ newTab = false }: { newTab?: boolean }) {
  const { t } = useLanguage()
  const link = (href: string, label: string) => (
    <a href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined} className="font-semibold text-brand-soft underline-offset-4 hover:underline">
      {label}
    </a>
  )
  const parts = t("consent.termsText").split(/(\{terms\}|\{privacy\})/)
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p === "{terms}" ? link("/terms", t("consent.termsLink")) : p === "{privacy}" ? link("/privacy", t("consent.privacyLink")) : p}</Fragment>
      ))}
    </>
  )
}
