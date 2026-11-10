import Link from "next/link"
import Image from "next/image"
import InstallAppButton from "../system/InstallAppButton"
import { INTL_LANGS, LANG_LABEL, type IntlLang } from "../../lib/intl/lang"
import { uiOf } from "../../lib/intl/ui"

// Marco de las páginas en inglés, alemán, francés e italiano (/en, /de, /fr, /it): cabecera, menú y pie. Es un
// componente de servidor y todo el texto va ya en el HTML, en el idioma de la página, para que Google lo lea tal
// cual (la cabecera normal de la web carga el idioma en el navegador y para un buscador siempre sale en español).
// El menú del móvil es una fila de píldoras deslizable, sin JavaScript; el selector de idioma es un <details>, también
// sin JavaScript, y cada idioma es un enlace normal a la misma página en ese idioma (así también lo siguen los
// buscadores). «Abrir la app» lleva a la web de siempre, que ya arranca en el idioma del navegador. El botón de
// instalar solo aparece en móvil y mientras la app no esté instalada.

const NAV_SUBS = ["/clubs", "/night-bus", "/metro", "/essentials", "/guides"] as const

export default function IntlShell({
  lang,
  children,
  sub = "",
  esHref = null,
  current = "",
}: {
  lang: IntlLang
  children: React.ReactNode
  /** Parte de la dirección tras /{idioma} de esta página ("" = portada, "/clubs/xxx"), para enlazar a la misma página en otros idiomas. */
  sub?: string
  /** Dirección de la misma página en español (si existe). */
  esHref?: string | null
  /** Sección activa del menú: "/clubs", "/night-bus", "/metro", "/essentials" o "/guides". */
  current?: string
}) {
  const t = uiOf(lang).shell
  const nav = [
    { sub: NAV_SUBS[0], label: t.navClubs },
    { sub: NAV_SUBS[1], label: t.navNightBus },
    { sub: NAV_SUBS[2], label: t.navMetro },
    { sub: NAV_SUBS[3], label: t.navEssentials },
    { sub: NAV_SUBS[4], label: t.navGuides },
  ].map((n) => ({ ...n, href: `/${lang}${n.sub}` }))
  const others = [
    { code: "es" as const, href: esHref ?? "/" },
    ...INTL_LANGS.filter((l) => l !== lang).map((l) => ({ code: l, href: `/${l}${sub}` })),
  ]

  return (
    <div lang={lang} className="flex min-h-screen flex-col bg-night text-ink">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-night/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href={`/${lang}`} className="flex shrink-0 items-center" aria-label={t.logoAria}>
            <Image src="/noctua_logo.png" alt="Noctua" width={160} height={98} priority className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <details className="group relative">
              <summary
                aria-label={t.languageAria}
                className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition marker:hidden hover:border-white/30 hover:text-ink [&::-webkit-details-marker]:hidden"
              >
                {LANG_LABEL[lang]}
                <span aria-hidden="true" className="text-[10px] text-zinc-500 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <ul className="absolute right-0 top-full z-50 mt-2 min-w-[9rem] overflow-hidden rounded-card border border-white/10 bg-[#1b1823] py-1 shadow-xl">
                {others.map((o) => (
                  <li key={o.code}>
                    <Link href={o.href} hrefLang={o.code} lang={o.code} className="block px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-ink">
                      {LANG_LABEL[o.code]}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
            <Link href="/" className="btn-pill btn-primary px-4 py-2 text-xs sm:text-sm">
              {t.openApp}
            </Link>
          </div>
        </div>
        <nav aria-label={t.mainNavAria} className="mx-auto max-w-6xl px-4 pb-2">
          <ul className="scrollbar-none flex gap-2 overflow-x-auto">
            {nav.map((n) => {
              const active = current === n.sub
              return (
                <li key={n.href} className="shrink-0">
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`block whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                      active ? "bg-ink text-night" : "bg-[#23202d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:bg-[#2c2937]"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-white/10 px-4 pb-12 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-md">
            <InstallAppButton from="intl" variant="inline" />
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Image src="/noctua_logo.png" alt="Noctua" width={160} height={98} className="h-9 w-auto object-contain" />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">{t.footerTagline}</p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-300">{t.explore}</p>
              <ul className="space-y-2 text-sm text-zinc-400">
                {nav.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="transition hover:text-ink">
                      {n.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/map" className="transition hover:text-ink">
                    {t.liveMap}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-300">Noctua</p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <Link href="/para-locales" className="transition hover:text-ink">
                    {t.forVenues}
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="transition hover:text-ink">
                    {t.contact}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="transition hover:text-ink">
                    {t.privacy}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition hover:text-ink">
                    {t.terms}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed text-zinc-500">{t.disclaimer}</p>
        </div>
      </footer>
    </div>
  )
}
