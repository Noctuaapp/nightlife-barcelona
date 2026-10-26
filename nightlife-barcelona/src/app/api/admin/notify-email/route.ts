import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { createClient } from "@supabase/supabase-js"
import { isAdminRequest } from "@/lib/adminAuth"
import { sendAdminEmail, isUrgent, noticeSubject, type AdminNotice } from "@/lib/adminEmail"

export const dynamic = "force-dynamic"
export const maxDuration = 15

// Email inmediato de un aviso del admin (26/10/2026).
//   · POST { id }   → lo llama la propia base de datos al crearse un aviso urgente (mensaje,
//                     denuncia, alerta o importante), con la cabecera x-notify-secret.
//                     Ver supabase/46_avisos_por_email.sql.
//   · POST { test } → botón «Enviar email de prueba» de Admin › Avisos (con tu sesión de admin).

function secretOk(req: Request): boolean {
  const secret = process.env.NOTIFY_SECRET
  const got = req.headers.get("x-notify-secret") || ""
  if (!secret || !got) return false
  const a = Buffer.from(got)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  let body: { id?: number; test?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    /* sin cuerpo */
  }

  if (body.test) {
    if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const r = await sendAdminEmail("Prueba de avisos de Noctua", "Si lees esto, los avisos por email funcionan.", [
      {
        id: 0,
        kind: "message",
        important: false,
        title: "Email de prueba",
        body: "Así se verá cada aviso urgente: mensajes de Contáctanos, denuncias y alertas.",
        link: "/admin/avisos",
        created_at: new Date().toISOString(),
      },
    ])
    return NextResponse.json(r, { status: r.ok ? 200 : 500 })
  }

  if (!secretOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = Number(body.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Falta id" }, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase.from("admin_notifications").select("*").eq("id", id).maybeSingle()
  if (error || !data) return NextResponse.json({ error: error?.message || "No existe" }, { status: 404 })
  const n = data as AdminNotice & { emailed_at?: string | null }
  if (n.emailed_at || !isUrgent(n)) return NextResponse.json({ skipped: true })

  const r = await sendAdminEmail(noticeSubject(n), "Acaba de pasar esto en Noctua:", [n])
  if (r.ok) await supabase.from("admin_notifications").update({ emailed_at: new Date().toISOString() }).eq("id", id)
  return NextResponse.json(r, { status: r.ok ? 200 : 500 })
}

// La base de datos espera respuesta rápida; un GET por error no hace nada.
export async function GET() {
  return NextResponse.json({ ok: true })
}
