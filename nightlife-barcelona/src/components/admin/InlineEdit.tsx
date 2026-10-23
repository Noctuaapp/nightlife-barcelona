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

  // Botones explícitos de guardar/cancelar, visibles siempre (no solo al pasar el ratón por
  // encima): en móvil no hay ratón que active ":hover", y el guardado al perder el foco
  // (onBlur) es poco fiable al tocar fuera del campo en Safari/Chrome de iOS y Android — a veces
  // el toque siguiente no cuenta como "perder el foco" hasta que ya se ha navegado a otro sitio,
  // así que la edición se perdía sin aviso. Con un botón que se toca directamente, el guardado ya
  // no depende de ese evento: se llama a save() al momento, igual en móvil que en escritorio.
  // onMouseDown con preventDefault evita que el toque en el botón dispare primero un onBlur del
  // campo (que ya llamaría a save) justo antes del click, lo que duplicaría la llamada.
  const controls = (
    <span className="ml-1 inline-flex shrink-0 gap-1 align-middle">
      <button
        type="button"
        aria-label="Guardar"
        onMouseDown={(e) => e.preventDefault()}
        onClick={save}
        disabled={saving}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/90 text-xs font-bold text-white active:bg-purple-500"
      >
        ✓
      </button>
      <button
        type="button"
        aria-label="Cancelar"
        onMouseDown={(e) => e.preventDefault()}
        onClick={cancel}
        disabled={saving}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-zinc-200 active:bg-white/20"
      >
        ✕
      </button>
    </span>
  )

  return multiline ? (
    <span className="inline-flex w-full items-start gap-1">
      <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} rows={4} {...shared} />
      {controls}
    </span>
  ) : (
    <span className="inline-flex w-full items-center gap-1">
      <input ref={ref as React.RefObject<HTMLInputElement>} type="text" {...shared} />
      {controls}
    </span>
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
    // Mismo fallo que en ClubGallery: si upload() lanza una excepción (en vez de devolver un
    // error normal) sin try/catch alrededor, "uploading" se quedaba en true para siempre y el
    // overlay quedaba inservible sin ningún aviso — exactamente "le doy y no pasa nada".
    try {
      const ext = file.name.split(".").pop()
      const fileName = `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file)
      if (uploadError) {
        toast("Error al subir la imagen: " + uploadError.message, 6000)
        return
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
      const { error } = await supabase.from(table).update({ [field]: data.publicUrl }).eq("id", id)
      if (error) {
        toast("Error al guardar la imagen: " + error.message, 6000)
        return
      }
      setSavedUrl(data.publicUrl)
      router.refresh()
    } catch (err) {
      toast("Error al subir la imagen: " + (err instanceof Error ? err.message : String(err)), 6000)
    } finally {
      setUploading(false)
    }
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

// Tarifas combinadas de un festival (packs de varios días, abonos...), guardadas como una lista
// libre en la columna `price_tiers` (jsonb: [{label, price}]) — no es una columna de texto suelta,
// así que no vale InlineEditText: aquí se edita la lista entera y se guarda de una vez. Para quien
// no es admin solo se enseñan las filas ya guardadas (igual que antes de este componente).
type Tier = { label: string; price: string }

export function InlineEditTiers({ table, id, value }: { table: string; id: number; value: Tier[] | null }) {
  const isAdmin = useIsAdmin()
  const router = useRouter()
  const [tiers, setTiers] = useState<Tier[]>(() => (Array.isArray(value) ? value : []))
  const [saving, setSaving] = useState(false)

  if (!isAdmin) {
    const list = Array.isArray(value) ? value : []
    return (
      <>
        {list.map((tier, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <dt className="text-zinc-400">{tier.label}</dt>
            <dd className="font-semibold text-ink">{tier.price}</dd>
          </div>
        ))}
      </>
    )
  }

  const persist = async (next: Tier[]) => {
    setTiers(next)
    setSaving(true)
    const { error } = await supabase.from(table).update({ price_tiers: next.length > 0 ? next : null }).eq("id", id)
    setSaving(false)
    if (error) toast("No se pudo guardar: " + error.message)
    else router.refresh()
  }

  const update = (i: number, patch: Partial<Tier>) => setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const commit = () => persist(tiers)
  const remove = (i: number) => persist(tiers.filter((_, idx) => idx !== i))
  const add = () => persist([...tiers, { label: "Abono 2 días", price: "80 €" }])

  return (
    <div className="space-y-2 py-1">
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={tier.label}
            disabled={saving}
            onChange={(e) => update(i, { label: e.target.value })}
            onBlur={commit}
            placeholder="Ej. Abono 2 días"
            className="min-w-0 flex-1 rounded-md border border-purple-400/40 bg-black/30 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-purple-400"
          />
          <input
            value={tier.price}
            disabled={saving}
            onChange={(e) => update(i, { price: e.target.value })}
            onBlur={commit}
            placeholder="80 €"
            className="w-20 shrink-0 rounded-md border border-purple-400/40 bg-black/30 px-2 py-1 text-right text-xs font-semibold text-ink outline-none focus:border-purple-400"
          />
          <button onClick={() => remove(i)} disabled={saving} aria-label="Quitar tarifa" className="shrink-0 text-zinc-400 transition hover:text-red-300">
            ✕
          </button>
        </div>
      ))}
      <button onClick={add} disabled={saving} className="text-xs font-semibold text-purple-300 transition hover:text-purple-200">
        + Añadir pack / tarifa combinada
      </button>
    </div>
  )
}
