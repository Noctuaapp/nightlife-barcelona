"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { useIsAdmin } from "../../lib/useIsAdmin"
import { toast } from "../ui/Toast"

// Edición in situ: para el admin, cualquier texto envuelto aquí se puede tocar y editar sin salir
// de la ficha pública (antes había que ir al formulario de /admin). Para cualquier otra persona es
// exactamente el mismo texto de siempre — si no es admin, esto no es más que `{value}`.
//
// Guarda directamente contra Supabase (misma tabla y mismo permiso que ya usa el panel de admin
// para sus botones de "activar/desactivar" de un solo campo), así que no hace falta ninguna ruta
// nueva. Tras guardar, refresca la página (datos del servidor) para que se vea en todos los sitios
// donde aparezca ese dato.
type InlineEditTextProps = {
  table: string
  id: number
  field: string
  value?: string | null
  multiline?: boolean
  placeholder?: string
  emptyLabel?: string
  className?: string
}

export function InlineEditText({
  table,
  id,
  field,
  value,
  multiline = false,
  placeholder = "",
  emptyLabel = "añadir",
  className = "",
}: InlineEditTextProps) {
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || "")
  const [saving, setSaving] = useState(false)
  // La ficha es ISR (se regenera cada 5 min): `router.refresh()` no garantiza traer el dato nuevo
  // al momento, así que en vez de depender de eso, una vez se guarda bien se enseña directamente
  // lo guardado — no lo que diga `value` (que puede seguir siendo la versión cacheada un rato).
  const [saved, setSaved] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const shown = saved !== null ? saved : value || ""

  const startEditing = () => {
    setDraft(shown)
    setEditing(true)
  }

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      const len = ref.current.value.length
      ref.current.setSelectionRange?.(len, len)
    }
  }, [editing])

  if (!isAdmin) return <>{shown || null}</>

  const save = async () => {
    const next = draft.trim()
    if (next === shown) {
      setEditing(false)
      return
    }
    setSaving(true)
    const { error } = await supabase.from(table).update({ [field]: next || null }).eq("id", id)
    setSaving(false)
    setEditing(false)
    if (error) {
      toast("No se pudo guardar: " + error.message)
      return
    }
    setSaved(next)
    router.refresh()
  }

  const cancel = () => {
    setDraft(shown)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={startEditing}
        onKeyDown={(e) => {
          if (e.key === "Enter") startEditing()
        }}
        className={`cursor-text rounded px-0.5 -mx-0.5 transition hover:bg-purple-400/15 ${className}`}
        title="Click para editar"
      >
        {shown || <span className="italic text-purple-300/70">+ {emptyLabel}</span>}
      </span>
    )
  }

  const shared = {
    value: draft,
    disabled: saving,
    placeholder,
    style: { font: "inherit", color: "inherit", lineHeight: "inherit" } as React.CSSProperties,
    className: `w-full min-w-[8ch] rounded-md border border-purple-400 bg-black/50 px-2 py-0.5 outline-none ${className}`,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: save,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault()
        cancel()
      }
      if (e.key === "Enter" && !multiline) {
        e.preventDefault()
        ;(e.target as HTMLElement).blur()
      }
    },
  }

  return multiline ? (
    <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} rows={4} {...shared} />
  ) : (
    <input ref={ref as React.RefObject<HTMLInputElement>} type="text" {...shared} />
  )
}

// Igual que arriba pero para la imagen principal: se coloca como overlay (posición absoluta)
// encima de la <Image> real de la ficha. Para quien no es admin no renderiza nada, así que la
// imagen de toda la vida no cambia ni un píxel.
type InlineEditImageProps = {
  table: string
  id: number
  field: string
  bucket: string
  label?: string
  className?: string
}

export function InlineEditImage({ table, id, field, bucket, label = "Cambiar imagen", className = "" }: InlineEditImageProps) {
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  // Igual que en el texto: no esperamos a que la ISR de la página traiga la imagen nueva, se
  // enseña directamente la que se acaba de subir, tapando la antigua.
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const inputId = `inline-img-${table}-${id}-${field}`

  if (!isAdmin) return savedUrl ? <SavedImageOverlay src={savedUrl} /> : null

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    const ext = file.name.split(".").pop()
    const fileName = `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file)
    if (uploadError) {
      setUploading(false)
      toast("Error al subir la imagen: " + uploadError.message)
      return
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
    const { error } = await supabase.from(table).update({ [field]: data.publicUrl }).eq("id", id)
    setUploading(false)
    if (error) {
      toast("Error al guardar la imagen: " + error.message)
      return
    }
    setSavedUrl(data.publicUrl)
    router.refresh()
  }

  return (
    <>
      {savedUrl && <SavedImageOverlay src={savedUrl} />}
      <label
        htmlFor={inputId}
        className={`absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/0 text-center text-sm font-bold text-white opacity-0 transition hover:bg-black/50 hover:opacity-100 ${className}`}
      >
        {uploading ? "Subiendo…" : `📁 ${label}`}
        <input id={inputId} type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFile} />
      </label>
    </>
  )
}

// Tapa la imagen vieja (la que vino del servidor) con la recién subida mientras la ISR de la
// página se pone al día. Usa <img> normal, no next/image, porque esto vive fuera de su control de
// tamaños y solo necesita cubrir el mismo hueco que la imagen original.
function SavedImageOverlay({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="absolute inset-0 z-[5] h-full w-full object-cover" />
}
