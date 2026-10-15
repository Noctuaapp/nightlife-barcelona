"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Icon from "../../ui/Icon"
import { useLanguage } from "../../../context/LanguageContext"
import { useIsAdmin } from "../../../lib/useIsAdmin"
import { supabase } from "../../../lib/supabase"
import { toast } from "../../ui/Toast"

// Galería de fotos de la ficha: mosaico en escritorio, carrusel en móvil y visor a pantalla
// completa. Todas las fotos pasan por next/image (tamaño adaptado a la pantalla y formato moderno).
//
// `edit` (opcional): si se pasa y eres admin, añade debajo una tira para subir, quitar y reordenar
// fotos directamente desde la ficha pública (sin ir a /admin). La portada (`heroField`, por
// defecto "image") y la galería (`gallery`) son dos columnas distintas en la base de datos, pero
// aquí se tratan como una sola lista: la primera foto de la tira ES la portada, así que arrastrar
// una foto al principio la convierte de verdad en la portada (la antigua pasa a la galería).
type GalleryEdit = { table: string; id: number; bucket: string; gallery: string[]; heroField?: string }

export default function ClubGallery({ images, name, edit }: { images: string[]; name: string; edit?: GalleryEdit }) {
  const { t } = useLanguage()
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const [open, setOpen] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  // La ficha es ISR (tarda en regenerarse): no esperamos a que vuelva a buscar los datos para
  // reflejar lo que se acaba de subir, quitar o reordenar, se enseña ya mismo con lo guardado.
  const [photosOverride, setPhotosOverride] = useState<string[] | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const canManage = !!edit && isAdmin
  const heroField = edit?.heroField || "image"

  // `images` llega como [portada, ...galería]. Si se gestiona aquí, se reconstruye igual a partir
  // de `edit` (que lleva el dato crudo de cada columna) para poder escribir luego en las dos.
  const basePhotos = edit ? ([images[0], ...edit.gallery].filter(Boolean) as string[]) : images
  const displayImages = canManage ? (photosOverride ?? basePhotos) : images

  if (displayImages.length < 2 && !canManage) return null

  const go = (delta: number) => setOpen((i) => (i === null ? null : (i + delta + displayImages.length) % displayImages.length))

  // Guarda la lista completa reordenada: la posición 0 pasa a ser la portada de verdad (columna
  // `heroField`) y el resto, la galería (columna `gallery`).
  const saveOrder = async (next: string[]) => {
    if (!edit) return
    const { error } = await supabase
      .from(edit.table)
      .update({ [heroField]: next[0] || null, gallery: next.length > 1 ? next.slice(1) : null })
      .eq("id", edit.id)
    if (error) {
      toast("Error al guardar: " + error.message)
      return
    }
    setPhotosOverride(next)
    router.refresh()
  }

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!edit) return
    const files = e.target.files
    e.target.value = ""
    if (!files || files.length === 0) return
    setUploading(true)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()
      const fileName = `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from(edit.bucket).upload(fileName, file)
      if (error) continue
      const { data } = supabase.storage.from(edit.bucket).getPublicUrl(fileName)
      urls.push(data.publicUrl)
    }
    setUploading(false)
    if (urls.length === 0) {
      toast("No se pudo subir ninguna foto")
      return
    }
    await saveOrder([...displayImages, ...urls])
  }

  const removePhoto = (url: string) => {
    if (displayImages.length <= 1) return // siempre tiene que quedar al menos una foto de portada
    saveOrder(displayImages.filter((u) => u !== url))
  }

  const reorderPhoto = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= displayImages.length || to >= displayImages.length) return
    const next = [...displayImages]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    saveOrder(next)
  }

  return (
    <section className="mx-auto mb-16 max-w-6xl px-4 sm:px-6" aria-label={t("clubPage.gallery")}>
      <h2 className="mb-4 text-lg font-semibold text-ink">{t("clubPage.gallery")}</h2>

      {displayImages.length >= 2 && (
        <>
          <div className="hidden h-[420px] grid-cols-4 grid-rows-2 gap-3 sm:grid">
            {displayImages.slice(0, 5).map((src, i) => (
              <button
                key={src + i}
                onClick={() => setOpen(i)}
                className={`group relative overflow-hidden rounded-card ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                aria-label={`${t("clubPage.openPhoto")} ${i + 1}`}
              >
                <Image src={src} alt={`${name} ${i + 1}`} fill sizes={i === 0 ? "50vw" : "25vw"} className="object-cover" />
                {i === 4 && displayImages.length > 5 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-semibold text-white">
                    +{displayImages.length - 5}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:hidden">
            {displayImages.map((src, i) => (
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
        </>
      )}

      {canManage && (
        <div className={displayImages.length >= 2 ? "mt-5" : ""}>
          <p className="mb-2 text-xs font-semibold text-zinc-400">Todas las fotos (solo tú lo ves) — arrastra para reordenar; la primera es la portada</p>
          <div className="flex flex-wrap gap-3">
            {displayImages.map((url, i) => (
              <div
                key={url}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIndex !== null) reorderPhoto(dragIndex, i)
                  setDragIndex(null)
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`group relative h-20 w-20 shrink-0 cursor-move overflow-hidden rounded-xl border transition ${
                  dragIndex === i ? "border-purple-400 opacity-50" : "border-white/10"
                }`}
              >
                <Image src={url} alt="" fill sizes="80px" className="pointer-events-none object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 py-0.5 text-center text-[10px] font-bold text-white">Portada</span>
                )}
                {displayImages.length > 1 && (
                  <button
                    onClick={() => removePhoto(url)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Quitar foto"
                  >
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 text-center text-xs font-bold text-zinc-400 transition hover:border-purple-400/50 hover:text-white">
              {uploading ? "Subiendo…" : "+ Añadir"}
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={addPhotos} />
            </label>
          </div>
        </div>
      )}

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
            <Image src={displayImages[open]} alt={name} fill sizes="100vw" className="object-contain" />
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
