// Errores de contraseña de Supabase, explicados en el idioma de la persona (06/11/2026).
//
// Supabase tiene sus propias reglas de contraseña (Authentication › Sign In / Providers › Email ›
// Password requirements) y cuando no se cumplen devuelve un texto en inglés del estilo «Password
// should contain at least one character of each: abc…z, ABC…Z, 0123456789, !@#…». La web solo
// comprobaba 8 caracteres, así que esa frase llegaba tal cual a la pantalla de registro y quien la
// leía se iba sin saber qué cambiar. Aquí se reconoce el error y se construye el mensaje a partir de
// lo que pide el servidor (no se fija ninguna regla en la web: si se cambian en Supabase, sigue valiendo).

export type PasswordSet = "lower" | "upper" | "digit" | "symbol"

export type PasswordIssue =
  | { kind: "sets"; needs: PasswordSet[] }
  | { kind: "min"; n: number }
  | { kind: "pwned" }
  | { kind: "same" }

export function parsePasswordIssue(message: string | null | undefined): PasswordIssue | null {
  const m = String(message || "")
  if (/should contain at least one character of each/i.test(m)) {
    const needs: PasswordSet[] = []
    if (m.includes("abcdefghijklmnopqrstuvwxyz")) needs.push("lower")
    if (m.includes("ABCDEFGHIJKLMNOPQRSTUVWXYZ")) needs.push("upper")
    if (m.includes("0123456789")) needs.push("digit")
    if (m.includes("!@#")) needs.push("symbol")
    return needs.length > 0 ? { kind: "sets", needs } : null
  }
  const min = m.match(/password should be at least (\d+) characters/i)
  if (min) return { kind: "min", n: Number(min[1]) }
  if (/known to be weak|easy to guess|has been pwned/i.test(m)) return { kind: "pwned" }
  if (/different from the old/i.test(m)) return { kind: "same" }
  return null
}

// Código corto para la analítica (Admin › Visitas): antes se guardaban los primeros 80 caracteres del
// texto del servidor y la frase quedaba cortada a media lista de letras.
export function passwordIssueCode(issue: PasswordIssue): string {
  return issue.kind === "sets" ? "password_policy" : issue.kind === "min" ? "password_min" : issue.kind === "pwned" ? "password_pwned" : "password_same"
}

function joinList(items: string[], locale: string): string {
  try {
    const LF = (Intl as unknown as { ListFormat?: new (l: string, o: object) => { format: (x: string[]) => string } }).ListFormat
    if (LF) return new LF(locale, { style: "long", type: "conjunction" }).format(items)
  } catch {
    // sin ListFormat: se une con comas
  }
  return items.join(", ")
}

const SET_KEY: Record<PasswordSet, string> = {
  lower: "signup.pwNeedLower",
  upper: "signup.pwNeedUpper",
  digit: "signup.pwNeedDigit",
  symbol: "signup.pwNeedSymbol",
}

export function passwordIssueText(issue: PasswordIssue, t: (key: string) => string, locale: string): string {
  if (issue.kind === "sets") {
    return t("signup.error_password_sets").replace("{list}", joinList(issue.needs.map((s) => t(SET_KEY[s])), locale))
  }
  if (issue.kind === "min") return t("signup.error_password_min").replace("{n}", String(issue.n))
  if (issue.kind === "pwned") return t("signup.error_password_pwned")
  return t("changePassword.errorSame")
}
