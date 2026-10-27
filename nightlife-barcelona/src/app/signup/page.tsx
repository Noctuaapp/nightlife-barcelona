"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { safeNextPath } from "../../lib/nextPath"
import { track } from "../../lib/track"
import CountrySelect from "../../components/ui/CountrySelect"
import { useLanguage } from "../../context/LanguageContext"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

// Dominios de correo temporal/desechable más usados (10 minutos, buzones de un solo uso, etc.).
// Confirmar el correo ya filtra direcciones inventadas o mal escritas (el enlace nunca llega),
// pero no filtra estas, porque sí reciben el correo de verdad — solo que a nadie que vaya a
// volver. La lista no es exhaustiva (salen dominios nuevos constantemente) pero cubre los que
// más se repiten.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "10minutemail.com", "10minutemail.net", "20minutemail.com",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "guerrillamail.de", "temp-mail.org", "tempmail.com", "tempmail.net", "tempmailo.com",
  "throwawaymail.com", "yopmail.com", "yopmail.net", "yopmail.fr", "trashmail.com",
  "trashmail.net", "getnada.com", "maildrop.cc", "sharklasers.com", "dispostable.com",
  "mytemp.email", "fakeinbox.com", "mailnesia.com", "emailondeck.com", "mohmal.com",
  "moakt.com", "33mail.com", "spamgourmet.com", "mintemail.com", "mail-temporaire.fr",
  "discard.email", "discardmail.com", "tempinbox.com", "fakemailgenerator.com",
  "burnermail.io", "crazymailing.com", "emailtemporario.com.br", "correotemporal.org",
  "tempr.email", "inboxkitten.com", "luxusmail.org", "mailcatch.com", "spam4.me",
])

function isDisposableEmail(value: string): boolean {
  const domain = value.split("@")[1]?.toLowerCase().trim()
  return !!domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)
}

// Comprobar contraseñas filtradas de verdad (contra una lista real, tipo HaveIBeenPwned) es una
// función de pago en Supabase ("Leaked Password Protection", solo a partir del plan Pro). Como
// alternativa gratuita, se bloquean aquí las contraseñas más obvias/repetidas — no es lo mismo,
// pero corta el caso más burdo (y más común) sin coste.
const COMMON_WEAK_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "password123",
  "qwerty123", "qwertyuiop", "11111111", "123123123", "123123123a", "abc123456",
  "iloveyou1", "admin1234", "letmein123", "welcome123", "monkey123", "football1",
  "123456789a", "87654321", "00000000", "zxcvbnm123", "qwerty1234", "1q2w3e4r5t",
  "abcd1234", "trustno1", "sunshine1", "princess1", "dragon123", "superman1",
  "noctua123", "barcelona1",
])

function isWeakPassword(value: string, email: string, username: string): boolean {
  if (value.length < 8) return true
  const lower = value.toLowerCase()
  if (COMMON_WEAK_PASSWORDS.has(lower)) return true
  if (/^\d+$/.test(value)) return true // solo números (12345678, 00000000...)
  if (new Set(lower).size <= 2) return true // aaaaaaaa, abababab...
  const emailLocal = email.split("@")[0]?.toLowerCase().trim()
  if (emailLocal && lower === emailLocal) return true
  if (username && lower === username.toLowerCase().trim()) return true
  return false
}

export default function SignupPage() {
  const { t, locale } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [country, setCountry] = useState("")
  const [gender, setGender] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [confirmedAge, setConfirmedAge] = useState(false)
  // Si el proyecto de Supabase tiene activado "Confirm email" (Authentication → Providers →
  // Email), signUp() no deja sesión abierta hasta que se pulsa el enlace del correo — antes aquí
  // se redirigía igualmente a la web como si ya hubiera entrado, y la persona se encontraba sin
  // explicación pidiéndole iniciar sesión otra vez. Ahora se detecta y se muestra un aviso claro.
  const [checkEmail, setCheckEmail] = useState(false)

  // Embudo de registro (27/10/2026): cuánta gente abre el formulario, cuántos lo envían, cuántos lo
  // completan y en qué paso se quedan (Admin › Visitas). Solo se anota un código del motivo, nunca
  // lo que la persona ha escrito.
  useEffect(() => {
    track("signup_view", { meta: { next: safeNextPath() } })
  }, [])

  const fail = (reason: string, message: string) => {
    setError(message)
    track("signup_error", { meta: { step: "form", reason } })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // País y género son opcionales (27/10/2026): no se exigen. También se pueden indicar o cambiar
    // después en Perfil.
    if (!email || !password || !username) {
      fail("fill_all", t("signup.error_fill_all"))
      return
    }
    if (isDisposableEmail(email)) {
      fail("disposable_email", "No se admiten correos temporales ni desechables. Usa un correo real al que tengas acceso.")
      return
    }
    if (isWeakPassword(password, email, username)) {
      fail("weak_password", "Esa contraseña es demasiado fácil de adivinar (o está entre las más usadas/filtradas). Usa una distinta, de al menos 8 caracteres, que no sea solo números ni tu usuario o correo.")
      return
    }
    if (!birthDate) {
      fail("birth_date", "Indica tu fecha de nacimiento.")
      return
    }
    // Edad exacta a partir de la fecha completa (con solo el año no se puede saber si alguien de
    // 17 ya cumplió 18). Los menores de 18 no pueden registrarse.
    const bd = new Date(birthDate + "T00:00:00")
    const today = new Date()
    let age = today.getFullYear() - bd.getFullYear()
    if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--
    if (isNaN(age) || age < 18) {
      fail("under_18", "Noctua es solo para mayores de 18 años. No puedes registrarte.")
      return
    }
    if (!acceptedTerms) {
      fail("terms", t("signup.error_terms"))
      return
    }
    if (!confirmedAge) {
      fail("age_check", t("signup.error_age"))
      return
    }

    track("signup_submit")
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Se guarda también en los metadatos de auth (no solo en profiles) porque, si Supabase
        // exige confirmar el correo, el upsert a profiles de más abajo no llega a ejecutarse
        // (no hay sesión todavía) — así el username/país/género no se pierden: confirm-age los
        // recupera de aquí la primera vez que la persona entra tras confirmar.
        data: { username, country, gender },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      track("signup_error", { meta: { step: "auth", reason: signUpError.message.slice(0, 80) } })
      setLoading(false)
      return
    }

    // Con "Confirm email" activado en Supabase, signUp() no abre sesión todavía (hay que pulsar
    // el enlace del correo primero) — data.session viene null. Antes se redirigía igualmente
    // como si ya hubiera entrado, y además este upsert fallaba en silencio (sin sesión, las
    // políticas de la tabla no dejan escribir), así que el perfil (usuario, género, etc.) se
    // perdía para quien tuviera que confirmar el correo. Ahora, si no hay sesión, se avisa de que
    // hay que revisar el correo en vez de seguir como si nada.
    if (!data.session) {
      track("signup_ok", { meta: { confirm_email: true } })
      setLoading(false)
      setCheckEmail(true)
      return
    }
    track("signup_ok", { meta: { confirm_email: false } })

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: username.toLowerCase().trim(),
        gender: gender || null,
        // Se guarda también en profiles (no solo en los metadatos de auth) para que la ficha de
        // usuario en /admin/users pueda mostrarlo.
        country: country || null,
        // Se pide la fecha completa para comprobar la mayoría de edad, pero solo se guarda el año.
        birth_year: bd.getFullYear(),
        terms_accepted_at: new Date().toISOString(),
      })
    }

    window.location.href = safeNextPath()
  }

  const handleGoogle = async () => {
    track("google_click", { meta: { from: "signup" } })
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${safeNextPath()}` },
    })
  }

  if (checkEmail) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center text-white">
          <div className="w-full max-w-md rounded-card border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
            <p className="mb-3 text-xs font-semibold text-purple-400">Un último paso</p>
            <h1 className="mb-3 text-2xl font-bold">Revisa tu correo</h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Te hemos enviado un enlace de confirmación a <span className="font-semibold text-white">{email}</span>. Ábrelo desde el móvil o el ordenador para activar tu cuenta y poder entrar.
            </p>
            <div className="mt-5 rounded-ctl border border-white/10 bg-white/5 px-4 py-3 text-left">
              <p className="text-sm font-semibold text-white">¿No te llega?</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Revisa la carpeta de spam o promociones — muchas veces el correo de confirmación acaba ahí. Si tras unos minutos sigue sin aparecer, prueba a registrarte otra vez.
              </p>
            </div>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="relative overflow-hidden px-4 pt-14 pb-10">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-md text-center">
            <h1 className="text-5xl font-black tracking-tight">{t("signup.title")}</h1>
            <p className="mt-4 text-zinc-400">{t("signup.subtitle")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-md px-4">
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

            {/* Google */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white hover:text-black"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("signup.google")}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-400">{t("signup.or")}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="text"
                placeholder={t("signup.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
              />
              <input
                type="email"
                placeholder={t("signup.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
              />
              <input
                type="password"
                placeholder={t("signup.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition"
              />
              <CountrySelect value={country} onChange={setCountry} locale={locale} placeholder={`${t("signup.country")} (${t("signup.optional")})`} />
              {/* País y género son opcionales (27/10/2026): se pueden dejar vacíos, y la primera opción
                  (vacía) permite volver a quitarlos. */}
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition text-zinc-300"
              >
                <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="">
                  {`${t("signup.gender")} (${t("signup.optional")})`}
                </option>
                <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Hombre">
                  {t("signup.gender_male")}
                </option>
                <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Mujer">
                  {t("signup.gender_female")}
                </option>
                <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="Prefiero no decirlo">
                  {t("signup.gender_unspecified")}
                </option>
              </select>

              <div>
                <label className="mb-2 block px-1 text-xs text-zinc-400">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  required
                  style={{ colorScheme: "dark" }}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition text-zinc-300"
                />
                <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">
                  Los datos del año de nacimiento se usarán para mejorar tus búsquedas.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-purple-500 flex-shrink-0"
                />
                <span className="text-sm text-zinc-400 leading-relaxed">
                  Acepto los{" "}
                  <a href="/terms" className="text-purple-400 hover:text-purple-300 transition">términos y condiciones</a>
                  {" "}y la{" "}
                  <a href="/privacy" className="text-purple-400 hover:text-purple-300 transition">política de privacidad</a>
                  {" "}de Noctua, incluyendo el uso de mi ubicación para mostrar contenido relevante.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedAge}
                  onChange={(e) => setConfirmedAge(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-purple-500 flex-shrink-0"
                />
                <span className="text-sm text-zinc-400 leading-relaxed">
                  Confirmo que soy mayor de 18 años.
                </span>
              </label>

              {error && <p className="text-sm font-bold text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-white py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? t("signup.creating") : t("signup.create")}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              <Link href="/login" className="text-white hover:text-zinc-300 transition">
                {t("signup.existing")}
              </Link>
            </p>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}