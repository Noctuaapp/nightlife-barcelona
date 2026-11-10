import Link from "next/link"
import Image from "next/image"
import InstallAppButton from "../system/InstallAppButton"

// Marco de las páginas en inglés (/en/...): cabecera, menú y pie. Es un componente de servidor y todo el
// texto va ya en el HTML, en inglés, para que Google lo lea tal cual (la cabecera normal de la web carga el
// idioma en el navegador y para un buscador siempre sale en español). El menú del móvil es una fila de
// píldoras deslizable, sin JavaScript. «Open the app» lleva a la web de siempre, que ya arranca en el idioma
// del navegador. El botón de instalar solo aparece en móvil y mientras la app no esté instalada.

const NAV = [
  { href: "/en/clubs", label: "Clubs & bars" },
  { href: "/en/night-bus", label: "Night bus" },
  { href: "/en/metro", label: "Metro" },
  { href: "/en/essentials", label: "Essentials" },
  { href: "/en/guides", label: "Guides" },
]

export default function IntlShell({
  children,
  esHref = null,
  current = "",
}: {
  children: React.ReactNode
  /** Dirección de la misma página en español (si existe). */
  esHref?: string | null
  /** Parte de la dirección del menú que está activa (por ejemplo "/en/clubs"). */
  current?: string
}) {
  return (
    <div lang="en" className="flex min-h-screen flex-col bg-night text-ink">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-night/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/en" className="flex shrink-0 items-center" aria-label="Noctua – Barcelona nightlife guide">
            <Image src="/noctua_logo.png" alt="Noctua" width={160} height={98} priority className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={esHref ?? "/"}
              hrefLang="es"
              lang="es"
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-white/30 hover:text-ink"
            >
              Español
            </Link>
            <Link href="/" className="btn-pill btn-primary px-4 py-2 text-xs sm:text-sm">
              Open the app
            </Link>
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-6xl px-4 pb-2">
          <ul className="scrollbar-none flex gap-2 overflow-x-auto">
            {NAV.map((n) => {
              const active = current === n.href
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
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
                Barcelona nightlife, live: clubs and bars with hours and entry prices, the night bus and metro to get home, and late-night essentials.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-300">Explore</p>
              <ul className="space-y-2 text-sm text-zinc-400">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="transition hover:text-ink">
                      {n.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/map" className="transition hover:text-ink">
                    Live map (app)
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-300">Noctua</p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <Link href="/para-locales" className="transition hover:text-ink">
                    For venues
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="transition hover:text-ink">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="transition hover:text-ink">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition hover:text-ink">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed text-zinc-500">
            Hours, prices and rules come from the venues and public sources and can change without notice: check before you go. Drink responsibly.
          </p>
        </div>
      </footer>
    </div>
  )
}
