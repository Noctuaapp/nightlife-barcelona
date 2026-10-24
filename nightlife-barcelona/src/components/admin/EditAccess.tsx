"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useIsAdmin } from "../../lib/useIsAdmin"

// Quién puede editar una ficha directamente desde la página pública (25/10/2026).
//
// Antes solo el admin. Ahora también el dueño vinculado (clubs.owner_user_id / events.owner_user_id):
// ve los mismos lápices, la subida de fotos, la galería y las características de SU ficha, y de
// ninguna otra. La página del servidor envuelve la ficha con <EditAccessProvider ownerUserId=...>.
//
// Esto solo decide qué botones se enseñan. Lo que de verdad protege los datos es Supabase: las
// reglas de la base de datos solo dejan guardar al admin o al dueño de esa fila, y el dueño no puede
// tocar las columnas reservadas a Noctua (verificado, tendencia, valoración, dueño...). Ver
// supabase/3_seguridad.sql y supabase/30_etiquetas_y_duenos.sql.
type Access = { ownerUserId: string | null; userId: string | null }

const EditAccessContext = createContext<Access>({ ownerUserId: null, userId: null })

export function EditAccessProvider({ ownerUserId, children }: { ownerUserId?: string | null; children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!ownerUserId) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setUserId(data.session?.user.id ?? null)
    })
    return () => {
      alive = false
    }
  }, [ownerUserId])

  return <EditAccessContext.Provider value={{ ownerUserId: ownerUserId || null, userId }}>{children}</EditAccessContext.Provider>
}

// true para el admin siempre; para el dueño, solo dentro de la ficha que es suya.
export function useCanEdit(): boolean {
  const isAdmin = useIsAdmin()
  const { ownerUserId, userId } = useContext(EditAccessContext)
  return isAdmin || (!!ownerUserId && !!userId && ownerUserId === userId)
}

// Para textos que solo tienen sentido para el admin (p. ej. "Sin descripción, el público ve...").
export function useIsOwnerOnly(): boolean {
  const isAdmin = useIsAdmin()
  const { ownerUserId, userId } = useContext(EditAccessContext)
  return !isAdmin && !!ownerUserId && ownerUserId === userId
}
