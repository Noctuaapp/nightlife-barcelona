"use client"

import { useState } from "react"
import Image from "next/image"
import Icon from "../../ui/Icon"
import { useLanguage } from "../../../context/LanguageContext"

// Galería de fotos de la ficha: mosaico en escritorio, carrusel en móvil y visor a pantalla
// completa. Todas las fotos pasan por next/image (tamaño adaptado a la pantalla y formato moderno).
export default function ClubGallery({ images, name }: { images: string[]; name: string }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState<number | null>(null)
  if (images.length < 2) return null

  const go = (delta: number) => setOpen((i) => (i === null ? null : (i + delta + images.length) % images.length))

  return (
    <section className="mx-auto mb-16 max-w-6xl px-4 sm:px-6" aria-label={t("clubPage.gallery")}>
      <h2 className="mb-4 text-lg font-semibold text-ink">{t("clubPage.gallery")}</h2>

      <div className="hidden h-[420px] grid-cols-4 grid-rows-2 gap-3 sm:grid">
        {images.slice(0, 5).map((src, i) => (
          <button
            key={src + i}
            onClick={() => setOpen(i)}
            className={`group relative overflow-hidden rounded-card ${i === 0 ? "col-span-2 row-span-2" : ""}`}
            aria-label={`${t("clubPage.openPhoto")} ${i + 1}`}
          >
            <Image src={src} alt={`${name} ${i + 1}`} fill sizes={i === 0 ? "50vw" : "25vw"} className="object-cover" />
            {i === 4 && images.length > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
                +{images.length - 5}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:hidden">
        {images.map((src, i) => (
          <button
            key={src + i}
            onClick={() => setOpen(i)}
            className="relative h-[56vw] w-[78vw] shrink-0 snap-center overflow-hidden rounded-card"
            aria-label={`${t("clubPage.openPhoto")} ${i + 1}`}
          >
            <Image src={src} alt={`${name} ${i + 1}`} fill sizes="78vw" className="object-cover" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
        >
          <button onClick={() => setOpen(null)} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white" aria-label={t("clubPage.close")}>
            <Icon name="close" className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white sm:left-8"
            aria-label={t("clubPage.prev")}
          >
            <Icon name="arrow" className="h-5 w-5 rotate-180" />
          </button>
          <div className="relative h-[80vh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <Image src={images[open]} alt={name} fill sizes="100vw" className="object-contain" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white sm:right-8"
            aria-label={t("clubPage.next")}
          >
            <Icon name="arrow" className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  )
}
