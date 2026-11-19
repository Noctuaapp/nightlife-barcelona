import { redirect } from "next/navigation"

// 19/11/2026: «Noches de club» ahora es la pestaña «Con fecha» de «Programación de clubs».
// Esta dirección se queda solo para los marcadores y enlaces antiguos (el botón «Editar» de las fichas públicas viejas llevaba ?edit=ID).
export default async function AdminClubEventsPage({ searchParams }: { searchParams: Promise<{ edit?: string | string[] }> }) {
  const { edit } = await searchParams
  const id = Array.isArray(edit) ? edit[0] : edit
  redirect(`/admin/programacion?tab=fecha${id && /^\d+$/.test(id) ? `&edit=${id}` : ""}`)
}
