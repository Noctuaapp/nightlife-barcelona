import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ACCENT_PATTERN = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g")

const STOPWORDS = new Set([
  "the", "bar", "club", "sala", "disco", "discoteca", "pub", "lounge",
  "de", "del", "la", "el", "los", "las", "en", "y", "and", "of",
])

function normalizeWords(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(ACCENT_PATTERN, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

function namesLikelyMatch(clubName: string, googleName: string): boolean {
  const a = normalizeWords(clubName)
  const b = normalizeWords(googleName)
  if (a.length === 0 || b.length === 0) return true
  return a.some((w) => b.includes(w)) || b.some((w) => a.includes(w))
}

// EJECUTAR UNA VEZ (necesita la columna nueva de la nota de abajo) para limpiar de golpe los
// clubs que se emparejaron mal con el sitio equivocado de Google (p.ej. "Costa Breve" con fotos
// de "Costa Brava"). Visita esta URL repetidamente hasta que "remaining" salga en 0 — igual que
// hiciste con las otras dos herramientas. A partir de ahí el cron diario ya evita este error solo.
// https://TU_DOMINIO/api/admin/fix-mismatched-clubs?secret=TU_ADMIN_SECRET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!
  const BATCH_SIZE = 15

  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("id, name, image, google_place_id")
    .not("google_place_id", "is", null)
    .order("google_verified_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count: totalWithPlaceId } = await supabase
    .from("clubs")
    .select("*", { count: "exact", head: true })
    .not("google_place_id", "is", null)

  const { count: alreadyVerified } = await supabase
    .from("clubs")
    .select("*", { count: "exact", head: true })
    .not("google_place_id", "is", null)
    .not("google_verified_at", "is", null)

  const results = await Promise.all(
    (clubs || []).map(async (club) => {
      try {
        const res = await fetch(`https://places.googleapis.com/v1/places/${club.google_place_id}`, {
          headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "displayName" },
        })
        const data = await res.json()
        const googleName = data?.displayName?.text || ""

        if (googleName && !namesLikelyMatch(club.name, googleName)) {
          const wasFromGoogle = typeof club.image === "string" && club.image.includes("club-photos")
          await supabase
            .from("clubs")
            .update({
              google_place_id: null,
              google_last_refreshed_at: null,
              google_verified_at: new Date().toISOString(),
              gallery: null,
              // Nunca dejamos "image" a null: si venía de Google (foto del sitio equivocado),
              // volvemos al placeholder para que la tarjeta nunca se quede sin imagen.
              ...(wasFromGoogle ? { image: "/clubs/razz.jpg" } : {}),
            })
            .eq("id", club.id)
          return { club: club.name, googleSaid: googleName, status: "reset_mismatch" }
        }

        await supabase
          .from("clubs")
          .update({ google_verified_at: new Date().toISOString() })
          .eq("id", club.id)
        return { club: club.name, matchedAs: googleName, status: "ok_match" }
      } catch (e: any) {
        return { club: club.name, status: "error", message: e.message }
      }
    })
  )

  const remaining = (totalWithPlaceId ?? 0) - (alreadyVerified ?? 0) - results.length
  return NextResponse.json({
    processed: results.length,
    remaining: remaining < 0 ? 0 : remaining,
    results,
  })
}
