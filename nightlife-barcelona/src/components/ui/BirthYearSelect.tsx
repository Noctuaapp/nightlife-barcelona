"use client"

import { useLanguage } from "../../context/LanguageContext"

// Selector de año de nacimiento (solo el año, no la fecha completa: es lo mínimo necesario para
// afinar las búsquedas y recoge menos datos personales). Rango: de hace 18 años a hace 90.
export default function BirthYearSelect({
  value,
  onChange,
  showHelp = true,
}: {
  value: string
  onChange: (v: string) => void
  showHelp?: boolean
}) {
  const { t } = useLanguage()
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current - 18; y >= current - 90; y--) years.push(y)

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t("profilePage.birthYear")}
        style={{ colorScheme: "dark" }}
        className="w-full rounded-ctl border border-white/15 bg-night px-4 py-3.5 text-ink outline-none transition focus:border-brand"
      >
        <option style={{ backgroundColor: "#16141f", color: "#fff" }} value="">
          {t("profilePage.birthYear")}
        </option>
        {years.map((y) => (
          <option key={y} style={{ backgroundColor: "#16141f", color: "#fff" }} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
      {showHelp && (
        <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">
          {t("birthYear.help")}
        </p>
      )}
    </div>
  )
}
