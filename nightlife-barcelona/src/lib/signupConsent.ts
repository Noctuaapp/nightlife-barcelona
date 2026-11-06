// Consentimiento de términos + mayoría de edad (06/11/2026).
//
// Tres piezas pequeñas y sin dependencias para poder probarlas:
//  · consentMetadata / readSignupConsent: lo que el formulario de registro deja apuntado en los
//    metadatos de auth. Con «Confirm email» activado, signUp() no abre sesión y por eso no se puede
//    escribir en `profiles` en ese momento: antes la aceptación (la casilla es obligatoria en el
//    formulario) se perdía y el admin veía «Sin aceptar términos» en gente que sí la había marcado.
//  · consentComplete: cuándo un perfil tiene términos y edad.
//  · isConsentExempt / confirmAgeUrl: a qué páginas no se les corta el paso y cómo se vuelve.

export type SignupConsent = { termsAcceptedAt: string; birthYear: number }

// Páginas que se pueden ver sin haber aceptado todavía: la propia pantalla de confirmación, la de
// cuenta bloqueada y los textos legales (hay que poder leer lo que se acepta).
export const CONSENT_EXEMPT_PATHS = ["/confirm-age", "/blocked", "/terms", "/privacy"]

export function isConsentExempt(pathname: string): boolean {
  return CONSENT_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export function consentMetadata(birthYear: number, now: Date = new Date()) {
  return { terms_accepted_at: now.toISOString(), birth_year: birthYear }
}

// Lee lo que dejó el registro. Devuelve null si falta algo o no es creíble (fecha futura, menor de
// 18, año imposible): en ese caso la persona pasa por «Antes de continuar» como cualquier otra.
export function readSignupConsent(meta: unknown, now: Date = new Date()): SignupConsent | null {
  if (!meta || typeof meta !== "object") return null
  const m = meta as Record<string, unknown>
  const at = m.terms_accepted_at
  const year = Number(m.birth_year)
  if (typeof at !== "string") return null
  const t = Date.parse(at)
  if (!Number.isFinite(t) || t > now.getTime() + 5 * 60 * 1000) return null
  if (!Number.isInteger(year) || year < 1900 || year > now.getFullYear() - 18) return null
  return { termsAcceptedAt: new Date(t).toISOString(), birthYear: year }
}

export function consentComplete(
  profile: { terms_accepted_at?: string | null; birth_year?: number | null } | null | undefined
): boolean {
  return !!profile?.terms_accepted_at && !!profile?.birth_year
}

// URL de «Antes de continuar» con la página a la que volver al terminar. Desde /login y /signup
// se vuelve a donde indicara ?next= (fallbackNext); desde cualquier otra, a la misma página.
export function confirmAgeUrl(pathname: string, search: string, fallbackNext: string): string {
  const back = pathname === "/login" || pathname === "/signup" ? fallbackNext : pathname + search
  return back && back !== "/" ? `/confirm-age?next=${encodeURIComponent(back)}` : "/confirm-age"
}
