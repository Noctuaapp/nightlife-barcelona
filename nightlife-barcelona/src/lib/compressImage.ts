// Fotos subidas desde el móvil (25/10/2026).
//
// Una foto de la cámara de un móvil pesa 3–12 MB y mide 4000 px o más. Subida tal cual, la ficha
// tarda muchísimo en cargar con datos móviles y la portada se ve a trozos. Además, algunas salen
// giradas (el giro va en los metadatos EXIF, que no todos los sitios respetan).
//
// Antes de subirla, se redimensiona a 2000 px como máximo por el lado largo, se endereza según el
// EXIF y se guarda como JPEG de buena calidad (unos 300–600 KB). Si el navegador no puede leer la
// foto (p. ej. HEIC en Android) se sube la original, como antes: nunca se bloquea una subida.

const MAX_SIDE = 2000
const QUALITY = 0.86

export type PreparedImage = { blob: Blob; ext: string; contentType: string }

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const original: PreparedImage = {
    blob: file,
    ext: (file.name.split(".").pop() || "jpg").toLowerCase(),
    contentType: file.type || "image/jpeg",
  }
  // GIF (animaciones) y SVG se suben tal cual.
  if (/gif|svg/i.test(file.type)) return original
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") return original

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    // Pequeña y ligera ya: no se toca (evita perder calidad para nada).
    if (scale === 1 && file.size < 900 * 1024 && /jpe?g|webp|png/i.test(file.type)) {
      bitmap.close?.()
      return original
    }
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return original
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY))
    if (!blob || blob.size === 0) return original
    // Si por lo que sea sale más pesada que la original (foto ya muy comprimida), se queda la original.
    if (blob.size >= file.size && scale === 1) return original
    return { blob, ext: "jpg", contentType: "image/jpeg" }
  } catch {
    return original
  }
}

export function uploadFileName(prefix: string, ext: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}

// Carpeta de cada foto según la ficha a la que pertenece (club/12/..., event/40/...). Supabase
// solo deja subir ahí al admin o al dueño de esa ficha (supabase/30_etiquetas_y_duenos.sql).
const FOLDER: Record<string, string> = {
  clubs: "club",
  events: "event",
  club_events: "club_event",
  club_sessions: "club_session",
}

export function ownerFolder(table: string, id: number | string): string {
  return `${FOLDER[table] || table}/${id}`
}
