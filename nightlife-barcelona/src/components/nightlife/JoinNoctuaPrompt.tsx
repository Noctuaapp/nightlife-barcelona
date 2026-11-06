"use client"

import { usePathname } from "next/navigation"
import JoinNoctuaCard from "./JoinNoctuaCard"
import { joinPromptApplies } from "../../lib/joinPrompt"

// Aviso de registro fuera de las fichas (03/11/2026). Las fichas de club y de evento ya llevan el suyo
// (con el nombre del local para medir el embudo); este cubre el resto de páginas por las que entra
// la gente. Qué páginas son, y por qué las demás quedan fuera, está en lib/joinPrompt.ts.
// Va una sola vez en el layout; `key` hace que cada página empiece su cuenta de espera desde cero.

export default function JoinNoctuaPrompt() {
  const pathname = usePathname() || ""
  if (!joinPromptApplies(pathname)) return null
  return <JoinNoctuaCard key={pathname} kind="page" itemId={null} name={pathname} />
}
