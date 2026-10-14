"use client"

import Link from "next/link"
import Icon from "../ui/Icon"
import { useLanguage } from "../../context/LanguageContext"

const ACCESS_HREF = "/contact?type=owner_access"

export default function ForVenuesContent() {
  const { t } = useLanguage()

  const features = [
    { icon: "clipboard", title: t("forVenues.f1Title"), body: t("forVenues.f1Body") },
    { icon: "users", title: t("forVenues.f2Title"), body: t("forVenues.f2Body") },
    { icon: "calendar", title: t("forVenues.f3Title"), body: t("forVenues.f3Body") },
    { icon: "ticket", title: t("forVenues.f4Title"), body: t("forVenues.f4Body") },
  ]
  const steps = [t("forVenues.step1"), t("forVenues.step2"), t("forVenues.step3")]
  const others = [
    { href: "/contact?type=suggest_essential", title: t("forVenues.otherEssentialTitle"), body: t("forVenues.otherEssentialBody") },
    { href: "/contact?type=suggest_venue", title: t("forVenues.otherMissingTitle"), body: t("forVenues.otherMissingBody") },
    { href: "/contact?type=club_partnership", title: t("forVenues.otherPartnerTitle"), body: t("forVenues.otherPartnerBody") },
  ]

  return (
    <main className="min-h-screen bg-night text-ink">
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:px-6 sm:pt-16">
        <p className="text-sm font-semibold text-brand-soft">{t("forVenues.kicker")}</p>
        <h1 className="font-display mt-3 max-w-3xl text-[2.1rem] leading-[1.06] sm:text-6xl">{t("forVenues.title")}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-300">{t("forVenues.subtitle")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={ACCESS_HREF} className="rounded-ctl bg-brand px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-strong">
            {t("forVenues.cta")}
          </Link>
          <Link href="/mi-club" className="rounded-ctl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/10">
            {t("forVenues.haveAccess")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-xl font-semibold">{t("forVenues.featuresTitle")}</h2>
        <div className="mt-5 grid gap-px overflow-hidden rounded-card border border-white/10 bg-white/10 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="bg-surface p-6">
              <Icon name={f.icon} className="h-6 w-6 text-brand-soft" />
              <h3 className="mt-4 text-base font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-5xl px-4 sm:px-6">
        <h2 className="text-xl font-semibold">{t("forVenues.howTitle")}</h2>
        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-4 rounded-card border border-white/10 bg-surface p-5">
              <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm text-brand-soft">{i + 1}</span>
              <p className="pt-1.5 text-sm leading-relaxed text-zinc-200">{s}</p>
            </li>
          ))}
        </ol>
        <Link href={ACCESS_HREF} className="mt-6 inline-flex rounded-ctl bg-brand px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-strong">
          {t("forVenues.cta")}
        </Link>
      </section>

      <section className="mx-auto mt-14 max-w-5xl px-4 pb-6 sm:px-6">
        <h2 className="text-xl font-semibold">{t("forVenues.otherTitle")}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {others.map((o) => (
            <Link key={o.href} href={o.href} className="group rounded-card border border-white/10 bg-surface p-5 transition hover:border-white/25">
              <p className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
                {o.title}
                <Icon name="arrow" className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{o.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
