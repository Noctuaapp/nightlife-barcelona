import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 10

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BATCH_SIZE = 15

// Suma un año a una fecha "YYYY-MM-DD" (o cualquier formato que entienda Date).
function addOneYear(dateStr: string): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: pastEvents, error } = await supabase
    .from("events")
    .select("id, title, date, recurring, hidden")
    .not("date", "is", null)
    .lt("date", today)
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!pastEvents || pastEvents.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0, results: [] })
  }

  const results: any[] = []

  for (const ev of pastEvents) {
    // Evento puntual (no recurrente): se oculta y no se vuelve a tocar.
    if (ev.recurring === false) {
      await supabase.from("events").update({ hidden: true }).eq("id", ev.id)
      results.push({ event: ev.title, status: "archived" })
      continue
    }

    // Evento recurrente: se avanza al año siguiente y se oculta hasta que lo revises
    // (el cartel, precio o artistas pueden cambiar de una edición a otra).
    const newDate = addOneYear(ev.date as string)

    await supabase
      .from("events")
      .update({
        date: newDate,
        hidden: true,
        sold_out: false,
        featured: false,
      })
      .eq("id", ev.id)

    results.push({ event: ev.title, status: "advanced", newDate })
  }

  const { count: remaining } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .not("date", "is", null)
    .lt("date", today)

  return NextResponse.json({ processed: results.length, remaining: remaining || 0, results })
}
