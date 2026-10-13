"use client"

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
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current - 18; y >= current - 90; y--) years.push(y)

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ colorScheme: "dark" }}
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none focus:border-purple-500/50 transition text-zinc-300"
      >
        <option style={{ backgroundColor: "#18181b", color: "#fff" }} value="">
          Año de nacimiento
        </option>
        {years.map((y) => (
          <option key={y} style={{ backgroundColor: "#18181b", color: "#fff" }} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
      {showHelp && (
        <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-500">
          Los datos del año de nacimiento se usarán para mejorar tus búsquedas.
        </p>
      )}
    </div>
  )
}
