"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import ArrowIcon from "../../components/ui/ArrowIcon"
import TermsText from "../../components/ui/TermsText"
import CountrySelect from "../../components/ui/CountrySelect"
import { useLanguage } from "../../context/LanguageContext"

export default function ConfirmAgePage() {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [confirmedAge, setConfirmedAge] = useState(false)
  const [birthDate, setBirthDate] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  // Quien entra con Google nunca pasa por el formulario de registro (Google no da usuario,
  // género ni país), así que esos campos se quedaban vacíos para siempre. Ahora, si al llegar
  // aquí el perfil todavía no tiene usuario, se piden en esta misma pantalla — igual de
  // obligatorio que la fecha de nacimiento, sea cual sea el método con el que se ha entrado.
  const [needsProfile, setNeedsProfile] = useState(false)
  const [username, setUsername] = useState("")
  const [gender, setGender] = useState("")
  const [country, setCountry] = useState("")

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace("/login")
        return
      }
      const user = data.session.user
      const { data: profile } = await supabase
        .from("profiles")
        .select("terms_accepted_at, birth_year, username, gender, country")
        .eq("id", user.id)
        .maybeSingle()

      // Si el alta fue con email y hubo que confirmar el correo antes de tener sesión, el
      // username/género/país se quedaron solo en los metadatos de auth (signup los guarda ahí
      // además de en profiles, justo para este caso) — se sincronizan aquí, la primera vez que
      // hay sesión, en vez de perderse para siempre.
      const meta = user.user_metadata as { username?: string; country?: string; gender?: string } | null
      let finalUsername = profile?.username || null
      if (meta?.username && !profile?.username) {
        await supabase.from("profiles").upsert({
          id: user.id,
          username: meta.username,
          gender: profile?.gender || meta.gender || null,
          country: profile?.country || meta.country || null,
        })
        finalUsername = meta.username
      }

      // Solo se salta esta pantalla si ya aceptó los términos Y tiene la edad guardada (las cuentas
      // antiguas sin año de nacimiento pasan por aquí una vez para confirmarla).
      if (profile?.terms_accepted_at && profile?.birth_year) {
        router.replace("/")
        return
      }
      // Sin usuario (típico de entrar con Google, que no lo da) — se pide aquí mismo, junto con
      // el resto de datos obligatorios.
      if (!finalUsername) {
        setNeedsProfile(true)
        setGender(profile?.gender || meta?.gender || "")
        setCountry(profile?.country || meta?.country || "")
      }
      setUserId(user.id)
      setChecking(false)
    }
    check()
  }, [router])

  const handleConfirm = async () => {
    setError("")
    if (needsProfile && (!username.trim() || !gender)) {
      setError(t("signup.error_fill_all"))
      return
    }
    if (!acceptedTerms || !confirmedAge) {
      setError(t("consent.checkBoth"))
      return
    }
    if (!birthDate) {
      setError(t("consent.birthDateRequired"))
      return
    }
    const bd = new Date(birthDate + "T00:00:00")
    const today = new Date()
    let age = today.getFullYear() - bd.getFullYear()
    if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--
    if (isNaN(age) || age < 18) {
      setError(t("consent.under18"))
      return
    }
    if (!userId) return
    setSaving(true)
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: userId,
      terms_accepted_at: new Date().toISOString(),
      birth_year: bd.getFullYear(),
      ...(needsProfile
        ? { username: username.toLowerCase().trim(), gender: gender || null, country: country || null }
        : {}),
    })
    setSaving(false)
    if (upsertError) {
      setError(upsertError.message)
      return
    }
    router.replace("/")
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-night text-white">
        <p className="text-sm text-zinc-400">{t("common.loading")}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-night px-4 text-white">
      <div className="w-full max-w-md rounded-card border border-white/10 bg-surface p-8">
        <h1 className="mb-3 text-2xl font-semibold">{t("consent.title")}</h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-300">{t("consent.body")}</p>

        {needsProfile && (
          <div className="mb-5 space-y-3">
            <input
              type="text"
              placeholder={t("signup.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-ink outline-none focus:border-brand transition"
            />
            <CountrySelect value={country} onChange={setCountry} locale={locale} placeholder={t("signup.country")} />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              style={{ colorScheme: "dark" }}
              className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-base text-zinc-300 outline-none focus:border-brand transition"
            >
              <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="" disabled hidden>
                {t("signup.gender")}
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
          </div>
        )}

        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-[#7c5cff]"
            />
            <span className="text-sm leading-relaxed text-zinc-400">
              <TermsText newTab />
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={confirmedAge}
              onChange={(e) => setConfirmedAge(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-[#7c5cff]"
            />
            <span className="text-sm leading-relaxed text-zinc-400">{t("consent.ageConfirm")}</span>
          </label>
        </div>

        <div className="mt-5">
          <label className="mb-2 block px-1 text-sm text-zinc-300">{t("consent.birthDate")}</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            min="1900-01-01"
            max={new Date().toISOString().slice(0, 10)}
            style={{ colorScheme: "dark" }}
            className="w-full rounded-ctl border border-white/15 bg-night px-5 py-4 text-zinc-300 outline-none transition focus:border-brand"
          />
          <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">
            {t("birthYear.help")}
          </p>
        </div>

        {error && <p className="mt-4 text-sm font-semibold text-red-300">{error}</p>}

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-ctl bg-brand py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
        >
          {saving ? t("profile.saving") : (<>{t("consent.continue")} <ArrowIcon className="h-4 w-4" /></>)}
        </button>
      </div>
    </main>
  )
}
