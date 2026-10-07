"use client"

import { useState } from "react"

// Foto de un esencial con respaldo: si la imagen no existe o no carga, se muestra el icono de la
// categoría sobre su color en vez de un hueco vacío. Se usa <img> (no background-image) porque una
// URL con espacios o paréntesis rompe `url(...)` sin avisar, y no se vería ninguna foto.
export default function EssentialPhoto({
  src,
  alt,
  icon,
  color,
  className = "",
  imgClassName = "",
}: {
  src: string | null | undefined
  alt: string
  icon: string
  color: string
  className?: string
  imgClassName?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const clean = typeof src === "string" ? src.trim() : ""

  if (!clean || failedSrc === clean) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ background: `linear-gradient(135deg, ${color}40, ${color}12)` }}
      >
        <span className="text-3xl">{icon}</span>
      </div>
    )
  }

  return (
    // "relative" solo si quien lo usa no lo coloca ya (absolute/fixed/sticky): con ambas clases,
    // Tailwind aplicaba "relative" y la foto empujaba el texto de la tarjeta fuera de la vista.
    <div className={`${/\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative"} overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={clean}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(clean)}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </div>
  )
}
