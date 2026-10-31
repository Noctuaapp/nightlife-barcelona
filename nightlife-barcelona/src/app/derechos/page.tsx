"use client"

import Link from "next/link"
import { Check, X, Phone, ChevronDown } from "lucide-react"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import { useLanguage } from "../../context/LanguageContext"
import { splitLines } from "@/lib/legalText"

// Derechos y deberes al salir de fiesta (31/10/2026). Pensada para que la entienda cualquiera:
// frases cortas, «pueden / no pueden», y los pasos de qué hacer si no te dejan entrar. Las leyes
// van al final, plegadas, para quien quiera comprobarlo.
//
// Solo se afirma lo que dice la ley catalana de espectáculos (Ley 11/2009, arts. 5, 6, 10, 24, 25),
// la de igualdad de trato (Ley 15/2022), el Código Penal (art. 512) y reglas generales de la
// Ley de Enjuiciamiento Criminal (art. 490) y de seguridad ciudadana. NO se dice nada de obligar a
// aceptar efectivo y tarjeta, ni importes de multas, ni edades mínimas concretas: no están
// comprobados. Es una guía general, no asesoramiento jurídico.

const LAWS: { name: string; noteKey: string; href: string }[] = [
  {
    name: "Ley 11/2009 (Cataluña), de espectáculos públicos y actividades recreativas",
    noteKey: "rights.law1",
    href: "https://www.boe.es/eli/es-ct/l/2009/07/06/11/con",
  },
  {
    name: "Decreto 112/2010 (Cataluña), reglamento de espectáculos públicos y actividades recreativas",
    noteKey: "rights.law2",
    href: "https://portaljuridic.gencat.cat/eli/es-ct/d/2010/08/31/112",
  },
  {
    name: "Ley 15/2022, integral para la igualdad de trato y la no discriminación",
    noteKey: "rights.law3",
    href: "https://www.boe.es/eli/es/l/2022/07/12/15",
  },
  {
    name: "Código Penal, artículo 512",
    noteKey: "rights.law4",
    href: "https://www.boe.es/buscar/act.php?id=BOE-A-1995-25444",
  },
  {
    name: "Ley de Enjuiciamiento Criminal, artículo 490",
    noteKey: "rights.law5",
    href: "https://www.boe.es/buscar/act.php?id=BOE-A-1882-6036",
  },
  {
    name: "Ley Orgánica 4/2015, de protección de la seguridad ciudadana",
    noteKey: "rights.law6",
    href: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-3442",
  },
]

function Bullets({ text, tone }: { text: string; tone: "yes" | "no" | "dot" }) {
  return (
    <ul className="space-y-2.5">
      {splitLines(text).map((item) => (
        <li key={item} className="flex gap-2.5 text-base leading-snug text-zinc-100">
          {tone === "yes" ? (
            <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-open" />
          ) : tone === "no" ? (
            <X size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-red-300" />
          ) : (
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-soft" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function CanCant({ can, cant }: { can: string; cant: string }) {
  const { t } = useLanguage()
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-card border border-open/30 bg-open/[0.06] p-5">
        <h3 className="mb-3 text-base font-semibold text-open">{t("rights.canTitle")}</h3>
        <Bullets text={can} tone="yes" />
      </div>
      <div className="rounded-card border border-red-400/30 bg-red-400/[0.06] p-5">
        <h3 className="mb-3 text-base font-semibold text-red-300">{t("rights.cantTitle")}</h3>
        <Bullets text={cant} tone="no" />
      </div>
    </div>
  )
}

const card = "rounded-card border border-white/10 bg-surface p-5 sm:p-6"

export default function RightsPage() {
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
        <header>
          <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-5xl">{t("rights.title")}</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-300">{t("rights.subtitle")}</p>
          <a
            href="#denegada"
            className="mt-6 inline-flex items-center gap-2 rounded-ctl bg-brand px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-strong"
          >
            {t("rights.jump")}
          </a>
        </header>

        <div className="mt-12 space-y-12">
          {/* 1. Para entrar */}
          <section aria-labelledby="r-entrar" className="scroll-mt-24">
            <h2 id="r-entrar" className="text-2xl font-semibold text-ink">
              {t("rights.s1Title")}
            </h2>
            <p className="mt-2 text-base text-zinc-300">{t("rights.s1Intro")}</p>
            <CanCant can={t("rights.s1Can")} cant={t("rights.s1Cant")} />
          </section>

          {/* 2. Dentro del local */}
          <section aria-labelledby="r-dentro" className="scroll-mt-24">
            <h2 id="r-dentro" className="text-2xl font-semibold text-ink">
              {t("rights.s2Title")}
            </h2>
            <p className="mt-2 text-base text-zinc-300">{t("rights.s2Intro")}</p>
            <div className={`mt-5 ${card}`}>
              <Bullets text={t("rights.s2List")} tone="yes" />
            </div>
          </section>

          {/* 3. Porteros y seguridad */}
          <section aria-labelledby="r-seguridad" className="scroll-mt-24">
            <h2 id="r-seguridad" className="text-2xl font-semibold text-ink">
              {t("rights.s3Title")}
            </h2>
            <p className="mt-2 text-base text-zinc-300">{t("rights.s3Intro")}</p>
            <CanCant can={t("rights.s3Can")} cant={t("rights.s3Cant")} />
            <p className="mt-4 text-base leading-relaxed text-zinc-300">{t("rights.s3Note")}</p>
            <p className="mt-3 rounded-card border border-warn/40 bg-warn/[0.08] p-4 text-base leading-relaxed text-zinc-100">{t("rights.s3Hurt")}</p>
          </section>

          {/* 4. Si no me dejan entrar */}
          <section id="denegada" aria-labelledby="r-denegada" className="scroll-mt-24 rounded-card border border-brand/40 bg-brand/[0.06] p-5 sm:p-7">
            <h2 id="r-denegada" className="text-2xl font-semibold text-ink">
              {t("rights.s4Title")}
            </h2>
            <p className="mt-2 text-base text-zinc-200">{t("rights.s4Intro")}</p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-card border border-white/10 bg-night/60 p-5">
                <h3 className="mb-3 text-base font-semibold text-ink">{t("rights.s4OkTitle")}</h3>
                <Bullets text={t("rights.s4OkList")} tone="dot" />
              </div>
              <div className="rounded-card border border-white/10 bg-night/60 p-5">
                <h3 className="mb-3 text-base font-semibold text-ink">{t("rights.s4BadTitle")}</h3>
                <Bullets text={t("rights.s4BadList")} tone="dot" />
              </div>
            </div>

            <h3 className="mt-8 text-lg font-semibold text-ink">{t("rights.s4StepsTitle")}</h3>
            {/* Aquí sí es una secuencia: se hace en este orden. */}
            <ol className="mt-4 space-y-3">
              {splitLines(t("rights.s4Steps")).map((step, i) => (
                <li key={step} className="flex gap-3.5 rounded-card border border-white/10 bg-night/60 p-4">
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-base leading-snug text-zinc-100">{step}</span>
                </li>
              ))}
            </ol>

            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={t("rights.phonesTitle")}>
              {[
                { n: "112", l: t("rights.phone112") },
                { n: "092", l: t("rights.phone092") },
                { n: "088", l: t("rights.phone088") },
              ].map((p) => (
                <li key={p.n}>
                  <a
                    href={`tel:${p.n}`}
                    className="flex h-full items-center gap-3 rounded-card border border-white/15 bg-night/60 p-4 transition hover:border-white/30"
                  >
                    <Phone size={18} aria-hidden="true" className="shrink-0 text-brand-soft" />
                    <span>
                      <span className="block text-xl font-bold tabular-nums text-ink">{p.n}</span>
                      <span className="block text-sm text-zinc-300">{p.l}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="rounded-ctl bg-brand px-6 py-3.5 text-center text-base font-semibold text-white transition hover:bg-brand-strong">
                {t("rights.tellUs")}
              </Link>
              <Link href="/clubs" className="rounded-ctl border border-white/20 px-6 py-3.5 text-center text-base font-semibold text-ink transition hover:bg-white/5">
                {t("rights.tryElsewhere")}
              </Link>
            </div>
          </section>

          {/* 5. Deberes */}
          <section aria-labelledby="r-deberes" className="scroll-mt-24">
            <h2 id="r-deberes" className="text-2xl font-semibold text-ink">
              {t("rights.s5Title")}
            </h2>
            <p className="mt-2 text-base text-zinc-300">{t("rights.s5Intro")}</p>
            <div className={`mt-5 ${card}`}>
              <Bullets text={t("rights.s5List")} tone="dot" />
            </div>
          </section>

          {/* Leyes: plegado, para quien quiera comprobarlo. */}
          <section>
            <details className={`group ${card}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {t("rights.lawsTitle")}
                <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-zinc-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-sm text-zinc-300">{t("rights.lawsIntro")}</p>
              <ul className="mt-4 space-y-4">
                {LAWS.map((law) => (
                  <li key={law.name}>
                    <a href={law.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-soft underline underline-offset-4 hover:text-ink">
                      {law.name}
                    </a>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{t(law.noteKey)}</p>
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <p className="text-sm leading-relaxed text-zinc-400">{t("rights.disclaimer")}</p>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
