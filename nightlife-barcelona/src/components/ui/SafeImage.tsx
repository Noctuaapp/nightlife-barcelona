"use client"

import { useEffect, useState } from "react"
import Image, { type ImageProps } from "next/image"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"

// Fotos que nunca se quedan rotas (24/10/2026, "lo de las fotos que no salen bien").
//
// next/image solo sabe optimizar fotos de los dominios declarados en next.config.ts (Supabase,
// Unsplash, Wikimedia). Si una ficha tiene una foto de otro sitio (la web del club, Instagram,
// Google...), Next la rechaza y se ve un hueco. Y en Vercel, si se agota el cupo gratuito de
// optimización de imágenes del mes, TODAS las fotos optimizadas fallan de golpe.
//
// Este componente se usa igual que <Image>, pero:
//   1. Si la foto es de un dominio no declarado, la carga tal cual (sin pasar por el optimizador).
//   2. Si aun así falla al cargar, prueba una vez con la foto original sin optimizar.
//   3. Si tampoco, pone el fondo neutro de Noctua en vez de un hueco roto.
const OPTIMIZABLE_HOSTS = ["iabxlqkthdermmxklstq.supabase.co", "images.unsplash.com", "commons.wikimedia.org"]

function canOptimize(src: string): boolean {
  if (!src || src.startsWith("data:")) return false
  if (src.startsWith("/")) return true
  try {
    return OPTIMIZABLE_HOSTS.includes(new URL(src).hostname)
  } catch {
    return false
  }
}

type Props = Omit<ImageProps, "src"> & { src?: string | null; fallback?: string }

export default function SafeImage({ src, fallback = FALLBACK_IMAGE, unoptimized, onError, ...rest }: Props) {
  const original = src || fallback
  // 0 = normal, 1 = original sin optimizar, 2 = fondo de reserva
  const [stage, setStage] = useState(0)
  useEffect(() => setStage(0), [original])

  const current = stage >= 2 ? fallback : original
  const skipOptimizer = !!unoptimized || stage >= 1 || !canOptimize(current)

  return (
    <Image
      {...rest}
      src={current}
      unoptimized={skipOptimizer}
      onError={(e) => {
        onError?.(e)
        setStage((s) => {
          if (current === fallback) return 2
          // Si ya iba sin optimizar, salta directamente al fondo de reserva.
          return s === 0 && !skipOptimizer ? 1 : 2
        })
      }}
    />
  )
}
