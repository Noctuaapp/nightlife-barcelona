"use client"

import { useIsAdmin } from "../../lib/useIsAdmin"

type Kind = "club" | "event" | "clubEvent" | "essential"

const EDIT_URL: Record<Kind, (id: number) => string> = {
  club: (id) => `/admin?edit=${id}`,
  event: (id) => `/admin/events?edit=${id}`,
  clubEvent: (id) => `/admin/club-events?edit=${id}`,
  essential: (id) => `/admin/essentials?edit=${id}`,
}

function PencilIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

// Botón "Editar" que solo ve el admin (info@noctuaapp.com). Abre el editor de admin con ese
// elemento ya en modo edición. `inline` lo deja en el flujo de la página (para paneles);
// sin `inline` flota arriba a la derecha de la ficha, debajo de la cabecera.
export default function AdminEditButton({ kind, id, inline = false }: { kind: Kind; id: number; inline?: boolean }) {
  const isAdmin = useIsAdmin()

  if (!isAdmin) return null
  return (
    <a
      href={EDIT_URL[kind](id)}
      aria-label="Editar en el panel de admin"
      className={`inline-flex items-center gap-2 rounded-full font-bold text-white transition hover:scale-105 active:scale-95 ${
        inline ? "px-3.5 py-2 text-xs" : "fixed right-4 top-40 z-40 px-4 py-2.5 text-sm"
      }`}
      style={{ background: "#7c5cff", boxShadow: "0 10px 30px -10px rgba(124,92,255,0.8)" }}
    >
      <PencilIcon className={inline ? "h-3.5 w-3.5" : "h-4 w-4"} />
      Editar
    </a>
  )
}
