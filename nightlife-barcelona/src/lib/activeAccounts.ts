// «Quién ha entrado» (Resumen del admin, 20/11/2026): las cuentas con actividad en la web en el periodo, de la más reciente a la
// más antigua. Une admin_users_activity (qué cuentas y cuándo) con la lista de usuarios (su nombre). Datos de personas concretas:
// solo para el admin, igual que Actividad por usuario.

export type ActiveAccount = { id: string; label: string; lastSeen: string | null; days: number; self: boolean }

type UserRow = { id: string; email: string; username: string | null }
type ActivityRow = { user_id: string; last_seen: string | null; active_days?: number | string | null }

export function activeAccounts(users: UserRow[], activity: ActivityRow[], selfEmail: string): ActiveAccount[] {
  const byId = new Map(users.map((u) => [u.id, u]))
  const rows: ActiveAccount[] = []
  for (const a of activity) {
    const u = byId.get(a.user_id)
    if (!u) continue // una cuenta que ya no existe
    rows.push({
      id: u.id,
      label: u.username ? `@${u.username}` : u.email,
      lastSeen: a.last_seen,
      days: Math.max(1, Number(a.active_days) || 1),
      self: u.email === selfEmail,
    })
  }
  return rows.sort((a, b) => (b.lastSeen || "").localeCompare(a.lastSeen || ""))
}

/** «hace 5 min», «hace 3 h», «ayer», «hace 4 días». */
export function lastSeenLabel(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "sin fecha"
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return "sin fecha"
  const min = Math.max(0, Math.round((now - t) / 60000))
  if (min < 1) return "ahora mismo"
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? "ayer" : `hace ${d} días`
}
