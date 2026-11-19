// «Dónde han pulsado» en entradas (Resumen del admin, 20/11/2026): los clubs y eventos con más clics en el botón de entradas.
// Los datos salen de admin_data_items (la misma fuente que Datos); aquí solo se filtran por ciudad y se ordenan.

export type TicketTop = { key: string; kind: "club" | "event"; name: string; clicks: number }

type Item = { id: number | string; name?: string | null; title?: string | null; tickets?: number | string | null }

export function topTicketClicks(
  clubs: Item[] | null | undefined,
  events: Item[] | null | undefined,
  keep: { club: (id: string) => boolean; event: (id: string) => boolean },
  limit = 8
): TicketTop[] {
  const rows: TicketTop[] = []
  for (const c of clubs || []) {
    const clicks = Number(c.tickets) || 0
    if (clicks > 0 && keep.club(String(c.id))) rows.push({ key: `club-${c.id}`, kind: "club", name: c.name || c.title || `Club ${c.id}`, clicks })
  }
  for (const e of events || []) {
    const clicks = Number(e.tickets) || 0
    if (clicks > 0 && keep.event(String(e.id))) rows.push({ key: `event-${e.id}`, kind: "event", name: e.name || e.title || `Evento ${e.id}`, clicks })
  }
  return rows.sort((a, b) => b.clicks - a.clicks || a.name.localeCompare(b.name, "es")).slice(0, limit)
}
