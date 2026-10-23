import { redirect } from "next/navigation"

// La antigua pantalla de Analytics (no salía en el menú y repetía, peor, lo que ya hace
// /admin/datos) se ha sustituido por /admin/actividad, la actividad detallada por usuario.
// Se deja esta redirección para que los enlaces o marcadores viejos sigan funcionando.
export default function AdminAnalyticsRedirect() {
  redirect("/admin/actividad")
}
