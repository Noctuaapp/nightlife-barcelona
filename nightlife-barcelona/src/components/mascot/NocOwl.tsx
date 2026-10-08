// Noc, el búho de Noctua. SVG propio (sin imágenes externas) con varios estados de ánimo.
export type OwlMood = "happy" | "wink" | "sleepy" | "party" | "wow"

export default function NocOwl({ size = 64, mood = "happy", className = "" }: { size?: number; mood?: OwlMood; className?: string }) {
  const pupilR = mood === "wow" ? 6.5 : 4.5
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Noc, el búho de Noctua"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="noc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
      </defs>

      {/* orejas */}
      <path d="M28 44 L22 12 L50 32 Z" fill="#6d28d9" />
      <path d="M92 44 L98 12 L70 32 Z" fill="#6d28d9" />

      {/* cuerpo y barriga */}
      <ellipse cx="60" cy="70" rx="40" ry="44" fill="url(#noc-body)" />
      <ellipse cx="60" cy="86" rx="22" ry="24" fill="#c4b5fd" opacity="0.35" />

      {/* alas */}
      <path d="M21 72 Q12 96 34 108 Q29 88 32 76 Z" fill="#4c1d95" />
      <path d="M99 72 Q108 96 86 108 Q91 88 88 76 Z" fill="#4c1d95" />

      {/* ojos */}
      <circle cx="44" cy="58" r="16" fill="#fff" />
      <circle cx="76" cy="58" r="16" fill="#fff" />
      <circle cx="44" cy="58" r="10" fill="#fbbf24" />
      <circle cx="44" cy="58" r={pupilR} fill="#1c1033" />
      {mood === "wink" ? (
        <path d="M63 59 Q76 49 89 59" stroke="#1c1033" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="76" cy="58" r="10" fill="#fbbf24" />
          <circle cx="76" cy="58" r={pupilR} fill="#1c1033" />
        </>
      )}
      {mood !== "wink" && <circle cx="47" cy="54" r="2.2" fill="#fff" />}

      {/* párpados si tiene sueño */}
      {mood === "sleepy" && (
        <>
          <path d="M28 58 A16 16 0 0 1 60 58 Z" fill="#6d28d9" />
          <path d="M60 58 A16 16 0 0 1 92 58 Z" fill="#6d28d9" />
        </>
      )}

      {/* pico */}
      {mood === "wow" ? (
        <ellipse cx="60" cy="76" rx="5.5" ry="7" fill="#f59e0b" />
      ) : (
        <path d="M53 68 L67 68 L60 80 Z" fill="#fbbf24" />
      )}

      {/* patas */}
      <ellipse cx="48" cy="114" rx="8" ry="4" fill="#fbbf24" />
      <ellipse cx="72" cy="114" rx="8" ry="4" fill="#fbbf24" />

      {/* gorro de fiesta */}
      {mood === "party" && (
        <>
          <path d="M46 28 L60 -2 L74 28 Z" fill="#f43f5e" />
          <circle cx="60" cy="-2" r="4" fill="#fbbf24" />
          <path d="M50 22 L70 22" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
