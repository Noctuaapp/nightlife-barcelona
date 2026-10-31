// Emails de avisos al admin (26/10/2026). Se envían con Resend (resend.com, plan gratis: 3.000
// emails al mes, 100 al día), con una simple llamada HTTP: no hace falta instalar nada.
//
// Variables en Vercel:
//   RESEND_API_KEY      clave de Resend (obligatoria)
//   ADMIN_NOTIFY_EMAIL  a dónde llegan (por defecto info@noctuaapp.com)
//   NOTIFY_FROM         remitente; por defecto el de pruebas de Resend, que solo puede escribir
//                       al email con el que creaste la cuenta de Resend. Cuando verifiques
//                       noctuaapp.com en Resend, pon por ejemplo "Noctua <avisos@noctuaapp.com>".
//   NOTIFY_SECRET       clave que usa la base de datos para avisar a la web (la genera el SQL 46)

import { ADMIN_EMAIL } from "./admin"

export type AdminNotice = {
  id: number
  kind: string
  important: boolean
  title: string
  body: string | null
  link: string | null
  created_at: string
}

const SITE = "https://www.noctuaapp.com"

const KIND_LABEL: Record<string, string> = {
  alert: "⚠️ Alerta",
  message: "💬 Mensaje",
  report: "🚩 Denuncia",
  entry_denial: "🚫 No dejan entrar",
  feedback: "⭐ Opinión de la web",
  review: "🗣️ Opinión de un local",
  review_reply: "↩️ Respuesta de un dueño",
  owner_message: "📩 Mensaje de un dueño",
  essential_suggestion: "💡 Sugerencia de esencial",
  signup: "👋 Usuario nuevo",
  owner_change: "✏️ Cambio de un dueño",
}

// Lo que se manda al momento; el resto va en el resumen diario.
export function isUrgent(n: Pick<AdminNotice, "kind" | "important">): boolean {
  return n.important || n.kind === "message" || n.kind === "report" || n.kind === "alert"
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function noticeHtml(n: AdminNotice): string {
  const href = n.link ? (n.link.startsWith("http") ? n.link : SITE + n.link) : `${SITE}/admin/avisos`
  return `
    <div style="padding:14px 16px;border:1px solid #e4e4e7;border-radius:12px;margin:0 0 10px">
      <div style="font-size:12px;color:#71717a">${esc(KIND_LABEL[n.kind] || n.kind)}${n.important ? " · <b style=\"color:#b45309\">Importante</b>" : ""}</div>
      <div style="font-size:15px;font-weight:700;color:#18181b;margin-top:4px">${esc(n.title)}</div>
      ${n.body ? `<div style="font-size:14px;color:#3f3f46;margin-top:4px">${esc(n.body)}</div>` : ""}
      <a href="${esc(href)}" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:700;color:#7c3aed">Ver y gestionar →</a>
    </div>`
}

function wrap(intro: string, items: AdminNotice[]): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="font-size:18px;font-weight:900;color:#18181b">Noctua · Avisos</div>
    <p style="font-size:14px;color:#52525b">${esc(intro)}</p>
    ${items.map(noticeHtml).join("")}
    <p style="font-size:12px;color:#a1a1aa;margin-top:18px">Todos los avisos en <a href="${SITE}/admin/avisos" style="color:#7c3aed">${SITE.replace("https://", "")}/admin/avisos</a></p>
  </div></body></html>`
}

export async function sendAdminEmail(subject: string, intro: string, items: AdminNotice[]): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: "Falta RESEND_API_KEY en Vercel" }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM || "Noctua <onboarding@resend.dev>",
      to: [process.env.ADMIN_NOTIFY_EMAIL || ADMIN_EMAIL],
      subject,
      html: wrap(intro, items),
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` }
  }
  return { ok: true }
}

export function noticeSubject(n: AdminNotice): string {
  return `${n.important ? "⚠️ " : ""}${n.title}`.slice(0, 140)
}
