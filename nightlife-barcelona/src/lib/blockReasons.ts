// Motivos y duraciones de bloqueo de cuenta, compartidos entre /admin/users y /admin/notas
// (antes solo vivían dentro de admin/users/page.tsx; se separan aquí para no duplicarlos).

export const BLOCK_REASONS: { code: string; label: string }[] = [
  { code: "spam", label: "Spam o publicidad no autorizada" },
  { code: "offensive", label: "Contenido ofensivo o acoso a otros usuarios" },
  { code: "false_reports", label: "Reportes o información falsa reiterada" },
  { code: "impersonation", label: "Suplantación de identidad" },
  { code: "fake_checkins", label: "Check-ins o asistencias falsas" },
  { code: "xp_abuse", label: "Abuso del sistema de puntos (XP)" },
  { code: "threats", label: "Amenazas o contenido violento" },
  { code: "illegal", label: "Actividad o contenido ilegal" },
  { code: "other", label: "Incumplimiento de los términos de servicio" },
]

export type BlockDuration = "1d" | "1w" | "1m" | "1y" | "forever"

export const BLOCK_DURATIONS: { code: BlockDuration; label: string }[] = [
  { code: "forever", label: "Para siempre" },
  { code: "1d", label: "1 día" },
  { code: "1w", label: "1 semana" },
  { code: "1m", label: "1 mes" },
  { code: "1y", label: "1 año" },
]

// Devuelve el ISO string de cuándo termina el bloqueo, o null si es "para siempre".
export function computeBlockedUntil(duration: BlockDuration, from: Date = new Date()): string | null {
  const d = new Date(from)
  switch (duration) {
    case "1d": d.setDate(d.getDate() + 1); break
    case "1w": d.setDate(d.getDate() + 7); break
    case "1m": d.setMonth(d.getMonth() + 1); break
    case "1y": d.setFullYear(d.getFullYear() + 1); break
    case "forever": return null
  }
  return d.toISOString()
}

// Un bloqueo "para siempre" no caduca; uno con fecha deja de contar si ya pasó (is_blocked_user()
// en Postgres hace la misma comprobación — esto es solo para que el panel de admin no diga
// "Bloqueado" de alguien a quien ya no se le aplica).
export function isBlockActive(isBlocked: boolean, blockedUntil: string | null): boolean {
  if (!isBlocked) return false
  if (!blockedUntil) return true
  return new Date(blockedUntil).getTime() > Date.now()
}
