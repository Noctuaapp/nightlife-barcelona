import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAuthorizedCronRequest } from "@/lib/cronAuth"
import { sendAdminEmail, type AdminNotice } from "@/lib/adminEmail"

export const dynamic = "force-dynamic"
export const maxDuration = 20

// Resumen diario por email (26/10/2026, cada mañana a las 9-10 h de Barcelona): todos los avisos
// de las últimas 24 h que no se mandaron ya al momento (usuarios nuevos, opiniones, cambios de
// dueños, «no me dejan entrar»...). Si no ha pasado nada, no se envía nada.
export async function GET(req: Request) {
  if (!(await isAuthorizedCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Sin Resend configurado todavía, no hace nada (y no sale como error en Vercel).
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ sent: false, reason: "email no configurado" })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .is("emailed_at", null)
    .gte("created_at", since)
    .order("important", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = (data || []) as AdminNotice[]
  if (items.length === 0) return NextResponse.json({ sent: false, reason: "nada nuevo" })

  const counts = items.reduce<Record<string, number>>((acc, n) => ((acc[n.kind] = (acc[n.kind] || 0) + 1), acc), {})
  const parts = [
    counts.signup && `${counts.signup} ${counts.signup === 1 ? "usuario nuevo" : "usuarios nuevos"}`,
    counts.review && `${counts.review} ${counts.review === 1 ? "opinión" : "opiniones"}`,
    counts.entry_denial && `${counts.entry_denial} «no me dejan entrar»`,
  ].filter(Boolean)
  const subject = `Resumen de Noctua: ${items.length} ${items.length === 1 ? "aviso" : "avisos"}${parts.length ? ` (${parts.join(", ")})` : ""}`

  const r = await sendAdminEmail(subject.slice(0, 140), "Lo que ha pasado en Noctua en las últimas 24 horas:", items)
  if (r.ok) {
    await supabase
      .from("admin_notifications")
      .update({ emailed_at: new Date().toISOString() })
      .in("id", items.map((n) => n.id))
  }
  return NextResponse.json({ ...r, count: items.length }, { status: r.ok ? 200 : 500 })
}
