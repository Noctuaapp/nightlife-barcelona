"use client"

import { useEffect, useState } from "react"
import { supabase } from "./supabase"

// Interruptor global editable desde /admin/herramientas (tabla club_noctua_settings, ver
// supabase/18_pausar_club_noctua.sql — una tabla propia, no "app_settings": esa ya existía con
// otra estructura y chocaba). Mientras esté en false: no se ve nada de Club Noctua (insignias de
// barrio, niveles, misiones) salvo para el admin, que sí lo sigue viendo para poder decidir
// cuándo activarlo. El único XP que sigue dando algo durante la pausa es invitar amigos
// (/invitar), porque esa recompensa no pasa por award_xp ni por este interruptor.
// Devuelve null mientras se está comprobando, para no enseñar un parpadeo del contenido real.
export function useClubNoctuaEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    supabase
      .from("club_noctua_settings")
      .select("enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setEnabled(data?.enabled === true)
      })
    return () => {
      alive = false
    }
  }, [])

  return enabled
}
