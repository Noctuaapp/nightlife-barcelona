// En qué páginas sale el aviso de registro de fuera de las fichas (JoinNoctuaPrompt).
//
// Sale en la portada, la lista de clubs y las páginas de barrio, zona y música. Se deja fuera a
// propósito (06/11/2026): Esenciales, porque quien entra ahí suele necesitar ayuda ya (farmacia,
// urgencias, taxi, baño…) y la tarjeta le tapaba el botón «Me ha pasado algo» y los accesos rápidos;
// el mapa (pantalla completa); «Planifica tu noche» (el aviso taparía los botones del asistente: ahí ya
// hay un aviso propio al guardar el plan); el perfil, el login y el registro.

const EXACT = new Set(["/", "/clubs"])
const SECTIONS = ["/barrio", "/zona", "/musica"]

export function joinPromptApplies(pathname: string): boolean {
  if (EXACT.has(pathname)) return true
  return SECTIONS.some((s) => pathname === s || pathname.startsWith(`${s}/`))
}
