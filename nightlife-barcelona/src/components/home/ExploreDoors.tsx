"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { EssentialsOverlay, MapOverlay, PlanOverlay } from "./art/ExploreArt"

// «Explora Noctua» (06/11/2026). Rediseñado el 12/11/2026, tercera versión: las dos anteriores (tarjetas con icono y
// dibujos vectoriales sobre fondo plano) se leían como plantilla. Ahora es un mosaico de tres piezas con fotografía:
// cada una es un recorte distinto de la foto de Barcelona de la portada, con su propio tono (la bahía al natural para
// el mapa, violeta para el plan, verdeazulado y cálido para esenciales; ver public/home/), y encima lo que hay dentro
// de cada puerta (art/ExploreArt.tsx). Tres puertas (mapa, plan y esenciales); «Volver a casa» (metro, NitBus y taxi)
// es un bloque propio (HomeGetHome.tsx).

function Tile({
  href,
  className,
  image,
  imageClass = "object-center",
  sizes,
  scrim,
  title,
  text,
  big = false,
  narrow = false,
  children,
}: {
  href: string
  className: string
  image: string
  imageClass?: string
  sizes: string
  /** Degradado que oscurece la foto por donde va el texto. */
  scrim: string
  title: string
  text: string
  big?: boolean
  /** Deja sitio a la capa de la derecha (las piezas pequeñas). */
  narrow?: boolean
  children: React.ReactNode
}) {
  const words = title.split(" ")
  const last = words.pop() ?? ""
  const head = words.join(" ")
  return (
    <Link
      href={href}
      className={`group relative isolate flex overflow-hidden rounded-card border border-white/10 bg-night shadow-[inset_0_1px_0_rgba(255,255,255,.14)] transition-colors hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes={sizes}
        className={`-z-20 object-cover transition-transform duration-[900ms] ease-out motion-safe:group-hover:scale-[1.04] ${imageClass}`}
      />
      <span aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: scrim }} />
      {children}
      <span className={`relative z-10 flex flex-col p-5 sm:p-6 ${narrow ? "max-w-[60%] self-center" : "mt-auto max-w-lg"}`}>
        <span className={`font-display leading-[1.12] text-ink [text-shadow:0_2px_18px_rgba(0,0,0,.5)] ${big ? "text-[1.7rem] sm:text-4xl" : "text-lg sm:text-xl"}`}>
          {head}
          {head ? " " : ""}
          {/* La última palabra y la flecha no se separan: la flecha nunca queda sola en una línea. */}
          <span className="whitespace-nowrap">
            {last}
            <ArrowUpRight
              size={big ? 28 : 20}
              strokeWidth={2.4}
              aria-hidden="true"
              className="ml-2 inline-block -translate-y-0.5 align-baseline text-zinc-200 transition-transform group-hover:-translate-y-1 group-hover:translate-x-0.5 group-hover:text-ink"
            />
          </span>
        </span>
        <span className={`mt-2 leading-snug text-zinc-100 [text-shadow:0_1px_12px_rgba(0,0,0,.6)] ${big ? "text-base" : "text-sm"}`}>{text}</span>
      </span>
    </Link>
  )
}

export default function ExploreDoors() {
  const { t } = useLanguage()

  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6" aria-labelledby="explore-title">
      <h2 id="explore-title" className="font-display text-3xl sm:text-4xl">
        {t("home.exploreTitle")}
      </h2>
      <p className="mt-2 text-sm text-zinc-300">{t("home.exploreSub")}</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:h-[27rem] lg:grid-cols-12 lg:grid-rows-2 lg:gap-4">
        {/* Mapa: la pieza grande. La foto de la bahía con los sitios y la ruta encima. */}
        <Tile
          href="/map"
          big
          className="min-h-[18rem] sm:col-span-2 sm:min-h-[22rem] lg:col-span-7 lg:row-span-2"
          image="/home/explore-map.webp"
          imageClass="object-[50%_60%]"
          sizes="(min-width: 1280px) 720px, (min-width: 640px) 100vw, 100vw"
          scrim="linear-gradient(to top, rgba(10,9,16,.94) 0%, rgba(10,9,16,.62) 26%, rgba(10,9,16,.12) 58%, transparent 75%)"
          title={t("home.quickMap")}
          text={t("home.doorMapText")}
        >
          <MapOverlay chipLabel={t("home.openNow")} />
        </Tile>

        <Tile
          href="/plan"
          narrow
          className="min-h-[11rem] lg:col-span-5"
          image="/home/explore-plan.webp"
          imageClass="object-[30%_40%]"
          sizes="(min-width: 1280px) 520px, (min-width: 640px) 50vw, 100vw"
          scrim="linear-gradient(90deg, rgba(10,6,34,.9) 0%, rgba(10,6,34,.62) 48%, rgba(10,6,34,.1) 100%)"
          title={t("home.quickPlan")}
          text={t("home.doorPlanText")}
        >
          <PlanOverlay />
        </Tile>

        <Tile
          href="/essentials"
          narrow
          className="min-h-[11rem] lg:col-span-5"
          image="/home/explore-essentials.webp"
          imageClass="object-[40%_50%]"
          sizes="(min-width: 1280px) 520px, (min-width: 640px) 50vw, 100vw"
          scrim="linear-gradient(90deg, rgba(3,18,16,.82) 0%, rgba(3,18,16,.5) 46%, rgba(3,18,16,.04) 100%)"
          title={t("home.quickEssentials")}
          text={t("home.doorEssentialsText")}
        >
          <EssentialsOverlay />
        </Tile>
      </div>
    </section>
  )
}
