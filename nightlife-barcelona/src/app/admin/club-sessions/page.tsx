import { redirect } from "next/navigation"

// 19/11/2026: «Sesiones semanales» ahora es la pestaña «Cada semana» de «Programación de clubs».
// Esta dirección se queda solo para los marcadores y enlaces antiguos.
export default function AdminClubSessionsPage() {
  redirect("/admin/programacion?tab=semana")
}
