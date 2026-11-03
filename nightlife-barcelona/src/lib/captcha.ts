// Verificación anti-robots (Cloudflare Turnstile) para registro, inicio de sesión y recuperar
// contraseña (auditoría 2/11/2026). Es opcional y está apagada hasta que se configure:
//   · sin NEXT_PUBLIC_TURNSTILE_SITE_KEY no se pinta nada y la web funciona exactamente igual;
//   · con la clave puesta en Vercel, el formulario carga el widget y manda el token a Supabase.
// Para que Supabase lo EXIJA hay que activarlo allí (Authentication › Attack Protection › Enable
// CAPTCHA protection › Turnstile, con la clave secreta). Orden seguro: primero desplegar la web con
// la clave pública, y solo después activarlo en Supabase (al revés, nadie podría entrar).
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""

export function captchaEnabled(siteKey: string = TURNSTILE_SITE_KEY): boolean {
  return siteKey.trim().length > 0
}

// Opciones que se añaden a signUp / signInWithPassword / resetPasswordForEmail de Supabase.
export function captchaOptions(token: string | null | undefined): { captchaToken?: string } {
  return token ? { captchaToken: token } : {}
}

export const CAPTCHA_PENDING_MESSAGE =
  "Espera un momento a que termine la verificación anti-robots y vuelve a pulsar. Si no llega a aparecer, desactiva el bloqueador de anuncios o entra con Google."
