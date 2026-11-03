"use client"

import { usePathname } from "next/navigation"
import JoinNoctuaCard from "./JoinNoctuaCard"

// Aviso de registro fuera de las fichas (03/11/2026). Las fichas de club y de evento ya llevan el suyo
// (con el nombre del local para medir el embudo); este cubre el resto de páginas por las que entra
// la gente: portada, lista de clubs, esenciales y las de barrio, zona y música. Se deja fuera a
// propósito el mapa (pantalla completa), «Planifica tu noche» (el aviso taparía los botones del
// asistente; ahí ya hay un aviso propio al guardar el plan), el perfil, el login y el registro.
// Va una sola vez en el layout; `key` hace que cada página empiece su cuenta de espera desde cero.

const EXACT = new Set(["/", "/clubs"])
const SECTIONS = ["/essentials", "/barrio", "/zona", "/musica"]

export function joinPromptApplies(pathname: string): boolean {
  if (EXACT.has(pathname)) return true
  return SECTIONS.some((s) => pathname === s || pathname.startsWith(`${s}/`))
}

export default function JoinNoctuaPrompt() {
  const pathname = usePathname() || ""
  if (!joinPromptApplies(pathname)) return null
  return <JoinNoctuaCard key={pathname} kind="page" itemId={null} name={pathname} />
}
