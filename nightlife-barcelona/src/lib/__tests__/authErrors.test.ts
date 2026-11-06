import { describe, it, expect } from "vitest"
import { parsePasswordIssue, passwordIssueCode, passwordIssueText } from "../authErrors"

const FULL =
  "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};':\"|<>?,./`~."

const dict: Record<string, string> = {
  "signup.pwNeedLower": "una minúscula",
  "signup.pwNeedUpper": "una mayúscula",
  "signup.pwNeedDigit": "un número",
  "signup.pwNeedSymbol": "un símbolo",
  "signup.error_password_sets": "Tiene que incluir {list}.",
  "signup.error_password_min": "Al menos {n} caracteres.",
  "signup.error_password_pwned": "Muy conocida.",
  "changePassword.errorSame": "Distinta de la anterior.",
}
const t = (k: string) => dict[k] ?? k

describe("parsePasswordIssue", () => {
  it("reconoce la regla de caracteres con los cuatro grupos", () => {
    expect(parsePasswordIssue(FULL)).toEqual({ kind: "sets", needs: ["lower", "upper", "digit", "symbol"] })
  })
  it("solo pide lo que el servidor lista", () => {
    expect(parsePasswordIssue("Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, 0123456789.")).toEqual({
      kind: "sets",
      needs: ["lower", "digit"],
    })
  })
  it("longitud mínima", () => {
    expect(parsePasswordIssue("Password should be at least 10 characters.")).toEqual({ kind: "min", n: 10 })
  })
  it("contraseña filtrada y contraseña repetida", () => {
    expect(parsePasswordIssue("Password is known to be weak and easy to guess, please choose a different one.")).toEqual({ kind: "pwned" })
    expect(parsePasswordIssue("New password should be different from the old password.")).toEqual({ kind: "same" })
  })
  it("deja pasar lo que no es de contraseña", () => {
    expect(parsePasswordIssue("User already registered")).toBeNull()
    expect(parsePasswordIssue("")).toBeNull()
    expect(parsePasswordIssue(null)).toBeNull()
    expect(parsePasswordIssue("Password should contain at least one character of each:")).toBeNull()
  })
})

describe("passwordIssueText / passwordIssueCode", () => {
  it("compone la lista con el idioma pedido", () => {
    const issue = parsePasswordIssue(FULL)!
    expect(passwordIssueText(issue, t, "es")).toBe("Tiene que incluir una minúscula, una mayúscula, un número y un símbolo.")
    expect(passwordIssueText(issue, t, "en")).toContain("una minúscula, una mayúscula, un número, and un símbolo")
    expect(passwordIssueCode(issue)).toBe("password_policy")
  })
  it("longitud, filtrada y repetida", () => {
    expect(passwordIssueText({ kind: "min", n: 12 }, t, "es")).toBe("Al menos 12 caracteres.")
    expect(passwordIssueText({ kind: "pwned" }, t, "es")).toBe("Muy conocida.")
    expect(passwordIssueText({ kind: "same" }, t, "es")).toBe("Distinta de la anterior.")
    expect(passwordIssueCode({ kind: "min", n: 8 })).toBe("password_min")
    expect(passwordIssueCode({ kind: "pwned" })).toBe("password_pwned")
    expect(passwordIssueCode({ kind: "same" })).toBe("password_same")
  })
})
