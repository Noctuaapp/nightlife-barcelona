import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { EVENTS_PREVIEW_COOKIE, eventsRedirectTarget } from "./lib/featureFlags"

// Mientras «Eventos» está cerrado (ver lib/featureFlags.ts), quien abra la ficha de un evento (/event/...)
// va a /events, donde sale el aviso «Próximamente». Es una redirección temporal (307): Google conserva las
// direcciones y vuelve a mirarlas cuando se abra Eventos. El admin pasa porque lleva la marca
// EVENTS_PREVIEW_COOKIE.
export function proxy(request: NextRequest) {
  const target = eventsRedirectTarget(request.nextUrl.pathname, request.cookies.get(EVENTS_PREVIEW_COOKIE)?.value)
  if (target) return NextResponse.redirect(new URL(target, request.url), 307)
  return NextResponse.next()
}

// Solo estas rutas pasan por aquí: el resto de la web no se toca.
export const config = {
  matcher: ["/event/:path*"],
}
