"use client"

import { useId } from "react"
import { currentSeasonalTheme, useNocSeasonalOverride } from "../../lib/nocSeasonal"

// Noc, el búho de Noctua. SVG propio (sin imágenes externas) con varios estados de ánimo.
export type OwlMood = "happy" | "wink" | "sleepy" | "party" | "wow"

// Noc estacional (pedido el 23/10/2026, rehecho el mismo día a petición de Jordi: nada de iconos
// genéricos — cosas de verdad reconocibles por fecha: una calabaza en Halloween, gorro+barba+saco
// en Navidad, un antifaz de carnaval real, rosa+libro en Sant Jordi, fuegos detrás en Sant Joan,
// bandera en la mano en Pride, gafas+crema+sol en verano, un gegant en la Mercè, ojos de
// enamorado+bombones en San Valentín, una cruz en Semana Santa y un vestido de flamenca en la
// Feria de Abril). Por fecha, Noc se pone solo lo que toca — y desde /admin/herramientas se puede
// forzar una temporada concreta antes de que llegue, o apagarlas todas, sin tocar código. Las
// fechas y la lista de temporadas viven en lib/nocSeasonal.ts (una sola fuente de verdad, que
// también usa el desplegable de admin).

// Oscurece un color hex un poco, para el degradado de la barriga (igual que el morado de
// siempre tenía un tono claro y uno oscuro). Si el valor no es un hex válido, lo deja tal cual.
function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.max(0, ((n >> 16) & 255) - amount)
  const g = Math.max(0, ((n >> 8) & 255) - amount)
  const b = Math.max(0, (n & 255) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

// Un corazoncito simple centrado en (cx, cy), para los ojos de San Valentín.
function heart(cx: number, cy: number, s = 1): string {
  return `M${cx} ${cy + 4 * s} C${cx - 6 * s} ${cy - 2 * s} ${cx - 3 * s} ${cy - 7 * s} ${cx} ${cy - 3 * s} C${cx + 3 * s} ${cy - 7 * s} ${cx + 6 * s} ${cy - 2 * s} ${cx} ${cy + 4 * s} Z`
}

// Un petardo de fuegos artificiales en (cx, cy): resplandor de fondo + 8 chispas en estrella
// (alternando largas y cortas) rematadas con un puntito, y un centro blanco brillante. Antes San
// Juan solo tenía unas pocas líneas rectas sueltas, que Jordi dijo que "no parecen fuegos
// artificiales" — con el resplandor y las chispas rematadas se reconoce mejor como petardo.
function burst(cx: number, cy: number, r1: number, r2: number, color: string) {
  const n = 8
  const sparks = []
  for (let k = 0; k < n; k++) {
    const a = (Math.PI * 2 * k) / n
    const len = k % 2 === 0 ? r2 : r2 * 0.65
    const x2 = cx + Math.cos(a) * len
    const y2 = cy + Math.sin(a) * len
    const x1 = cx + Math.cos(a) * r1
    const y1 = cy + Math.sin(a) * r1
    sparks.push(
      <line key={`l${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.6} strokeLinecap="round" />,
      <circle key={`c${k}`} cx={x2} cy={y2} r={1.1} fill={color} />
    )
  }
  return (
    <>
      <circle cx={cx} cy={cy} r={r2 + 3} fill={color} opacity={0.18} />
      {sparks}
      <circle cx={cx} cy={cy} r={1.8} fill="#fff" />
    </>
  )
}

// levelColor: color del nivel actual (LEVELS.color en lib/xp.ts) para que Noc cambie de Bronce a
// Élite — el cuerpo usa ese color, y orejas/alas una versión oscurecida del mismo (darken() no
// baja de 0, así que un color ya oscuro como el de Élite simplemente se queda cerca del negro en
// vez de dar números negativos). Sin levelColor (login, invitar...) se usa un gris neutro — antes
// era un morado (#8b5cf6) casi idéntico al de Élite (#7c5cff), así que en Élite parecía que Noc
// "no cambiaba de color" cuando en realidad sí lo hacía, solo que al mismo morado de siempre.
export default function NocOwl({
  size = 64,
  mood = "happy",
  className = "",
  levelColor,
  seasonal = true,
}: {
  size?: number
  mood?: OwlMood
  className?: string
  levelColor?: string
  // Por si algún día hace falta un Noc "neutro" en una pantalla concreta (p. ej. un print o una
  // captura para la tienda de apps) sin tocar el resto de la web.
  seasonal?: boolean
}) {
  const pupilR = mood === "wow" ? 6.5 : 4.5
  // "auto" (normal) | "none" (apagadas todas, puesto desde admin) | una temporada forzada a mano.
  const override = useNocSeasonalOverride()
  const dateTheme = currentSeasonalTheme()
  const resolvedTheme = override === "none" ? null : override === "auto" ? dateTheme : override
  // El gorro de fiesta (mood="party") es explícito y gana siempre; el estacional solo entra si no
  // se ha pedido otro gorro ya.
  const theme = seasonal && mood !== "party" ? resolvedTheme : null
  const loveEyes = theme === "sanValentin" && mood !== "wow"
  const bodyTop = levelColor || "#71717a"
  const bodyBottom = levelColor ? darken(levelColor, 40) : "#3f3f46"
  const accent = levelColor ? darken(levelColor, 20) : "#52525b"
  const wing = levelColor ? darken(levelColor, 55) : "#27272a"
  // Id único por instancia: con varios Noc a la vez en pantalla (p. ej. de niveles distintos),
  // un id de gradiente fijo compartido haría que todos usaran el color del último def pintado.
  // Se reutiliza también para los degradados/máscaras de los disfraces de temporada.
  const uid = useId()
  const gradientId = `noc-body-${uid}`
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      // Varios disfraces de temporada (el gorro de Navidad, los fuegos de San Juan, la bandera del
      // Pride) dibujan por encima de y=0 a propósito, para que el accesorio no quede pegado a la
      // cabeza. Sin este "overflow: visible" el navegador recorta todo lo que queda fuera del
      // viewBox por defecto — así que esa parte del disfraz (la pompa del gorro, el remate de los
      // fuegos...) se veía invisible o cortada a medias, aunque el SVG en sí estuviera bien
      // dibujado. Este fue el motivo real de que el gorro de Navidad se viera mal encajado.
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Noc, el búho de Noctua"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bodyTop} />
          <stop offset="100%" stopColor={bodyBottom} />
        </linearGradient>
      </defs>

      {/* fuegos artificiales de la Noche de San Juan, detrás del búho — rehechos para que se
          reconozcan como petardos (resplandor + chispas rematadas), no unas líneas sueltas */}
      {theme === "sanJuan" && (
        <g opacity="0.95">
          <path d="M10 45 Q9 25 10 12" stroke="#fbbf24" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
          {burst(10, 8, 3, 11, "#fbbf24")}
          <path d="M108 42 Q107 22 106 8" stroke="#f472b6" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
          {burst(106, 2, 3, 12, "#f472b6")}
          <path d="M62 30 Q61 10 60 -6" stroke="#2dd4bf" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
          {burst(60, -12, 2.5, 9, "#2dd4bf")}
        </g>
      )}

      {/* orejas */}
      <path d="M28 44 L22 12 L50 32 Z" fill={accent} />
      <path d="M92 44 L98 12 L70 32 Z" fill={accent} />

      {/* cuerpo y barriga */}
      <ellipse cx="60" cy="70" rx="40" ry="44" fill={`url(#${gradientId})`} />
      <ellipse cx="60" cy="86" rx="22" ry="24" fill="#c4b5fd" opacity="0.35" />

      {/* alas */}
      <path d="M21 72 Q12 96 34 108 Q29 88 32 76 Z" fill={wing} />
      <path d="M99 72 Q108 96 86 108 Q91 88 88 76 Z" fill={wing} />

      {/* vestido de flamenca (Feria de Abril), por debajo de la cara para que no tape los ojos */}
      {theme === "feriaAbril" && (
        <>
          <defs>
            <linearGradient id={`fa-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor={darken("#dc2626", 30)} />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="82" rx="34" ry="32" fill={`url(#fa-${uid})`} />
          <path d="M28 76 Q34 84 42 76 Q48 84 56 76 Q62 84 70 76 Q78 84 86 76 Q92 84 92 76" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M22 106 Q30 116 40 106 Q48 116 56 106 Q64 116 72 106 Q80 116 90 106 Q98 116 98 104" stroke={darken("#dc2626", 10)} strokeWidth="7" fill="none" strokeLinecap="round" />
          <circle cx="48" cy="82" r="2.3" fill="#fff" opacity="0.85" />
          <circle cx="70" cy="80" r="2.3" fill="#fff" opacity="0.85" />
          <circle cx="58" cy="96" r="2.3" fill="#fff" opacity="0.85" />
          <circle cx="38" cy="98" r="2" fill="#fff" opacity="0.85" />
          <circle cx="80" cy="98" r="2" fill="#fff" opacity="0.85" />
          <g transform="translate(60,72)">
            <path d="M-10 0 L0 -6 L10 0 L0 4 Z" fill="#fde68a" />
            <circle cx="0" cy="-1" r="3" fill="#fbbf24" />
          </g>
        </>
      )}

      {/* ojos */}
      <circle cx="44" cy="58" r="16" fill="#fff" />
      <circle cx="76" cy="58" r="16" fill="#fff" />
      <circle cx="44" cy="58" r="10" fill="#fbbf24" />
      {loveEyes ? (
        <path d={heart(44, 58, 1.15)} fill="#ef4444" />
      ) : (
        <circle cx="44" cy="58" r={pupilR} fill="#1c1033" />
      )}
      {mood === "wink" ? (
        <path d="M63 59 Q76 49 89 59" stroke="#1c1033" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="76" cy="58" r="10" fill="#fbbf24" />
          {loveEyes ? (
            <path d={heart(76, 58, 1.15)} fill="#ef4444" />
          ) : (
            <circle cx="76" cy="58" r={pupilR} fill="#1c1033" />
          )}
        </>
      )}
      {mood !== "wink" && <circle cx="47" cy="54" r="2.2" fill="#fff" />}

      {/* párpados si tiene sueño */}
      {mood === "sleepy" && (
        <>
          <path d="M28 58 A16 16 0 0 1 60 58 Z" fill={accent} />
          <path d="M60 58 A16 16 0 0 1 92 58 Z" fill={accent} />
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

      {/* caja de bombones (San Valentín, 14 de febrero) — los ojos de corazón van en la sección de arriba */}
      {theme === "sanValentin" && (
        <g transform="translate(100,92) rotate(8)">
          <rect x="-12" y="-8" width="24" height="16" rx="2" fill="#991b1b" />
          <rect x="-10" y="-6" width="20" height="4" fill="#7f1d1d" opacity="0.4" />
          <path d={heart(-4, 0, 0.9)} fill="#fca5a5" />
          <path d={heart(6, 0, 0.9)} fill="#fca5a5" />
          <path d="M-12 -10 Q0 -17 12 -10" stroke="#fde68a" strokeWidth="2.5" fill="none" />
          <circle cx="0" cy="-10" r="3" fill="#fde68a" />
        </g>
      )}

      {/* antifaz de Carnaval (aprox. 1 feb – 5 mar) */}
      {theme === "carnaval" && (
        <>
          <defs>
            <mask id={`cnmask-${uid}`}>
              <rect x="0" y="0" width="120" height="120" fill="white" />
              <circle cx="44" cy="58" r="17" fill="black" />
              <circle cx="76" cy="58" r="17" fill="black" />
            </mask>
            <linearGradient id={`cn-${uid}`} x1="0" y1="0" x2="1" y2="0.3">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <g mask={`url(#cnmask-${uid})`}>
            <path d="M18 30 Q28 20 36 38 Q48 28 60 46 Q72 28 84 38 Q92 20 102 30 Q98 50 94 64 Q78 76 60 66 Q42 76 26 64 Q22 50 18 30 Z" fill={`url(#cn-${uid})`} />
          </g>
          <path d="M18 30 Q11 22 8 14" stroke="#8b5cf6" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M102 30 Q109 22 112 14" stroke="#ec4899" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="43" r="3.2" fill="#fde68a" />
          <circle cx="38" cy="40" r="2" fill="#fde68a" opacity="0.9" />
          <circle cx="82" cy="40" r="2" fill="#fde68a" opacity="0.9" />
          <rect x="14" y="10" width="4.5" height="4.5" fill="#f472b6" transform="rotate(20 16 12)" />
          <rect x="98" y="8" width="4.5" height="4.5" fill="#22c55e" transform="rotate(-15 100 10)" />
          <circle cx="28" cy="2" r="2.3" fill="#facc15" />
          <circle cx="94" cy="0" r="2.3" fill="#60a5fa" />
        </>
      )}

      {/* cruz de Semana Santa (varía cada año, ver lib/nocSeasonal.ts) */}
      {theme === "semanaSanta" && (
        <g transform="translate(102,88)">
          <rect x="-2.5" y="-16" width="5" height="32" rx="1.5" fill="#78350f" />
          <rect x="-10" y="-8" width="20" height="5" rx="1.5" fill="#78350f" />
        </g>
      )}

      {/* vestido de flamenca: flor junto a la oreja (Feria de Abril) */}
      {theme === "feriaAbril" && (
        <>
          <circle cx="23" cy="37" r="7" fill="#dc2626" />
          <circle cx="17" cy="34" r="5" fill="#ef4444" />
          <circle cx="29" cy="33" r="5" fill="#ef4444" />
          <circle cx="23" cy="30" r="5" fill="#f87171" />
          <circle cx="23" cy="35" r="2.3" fill="#fde68a" />
        </>
      )}

      {/* rosa y libro de Sant Jordi (23 de abril) */}
      {theme === "santJordi" && (
        <>
          <path d="M10 70 Q8 90 14 102" stroke="#16a34a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M10 84 Q1 82 -1 73 Q8 73 10 84 Z" fill="#16a34a" />
          <circle cx="10" cy="63" r="10" fill="#dc2626" />
          <circle cx="2" cy="68" r="7" fill="#ef4444" />
          <circle cx="18" cy="68" r="7" fill="#ef4444" />
          <circle cx="10" cy="56" r="7" fill="#f87171" />
          <g transform="translate(101,96) rotate(10)">
            <rect x="-11" y="-8" width="22" height="16" rx="1.5" fill="#1d4ed8" />
            <rect x="-9" y="-6" width="18" height="12" fill="#fde68a" />
            <rect x="-11" y="-8" width="3" height="16" rx="1.5" fill="#1e3a8a" />
          </g>
        </>
      )}

      {/* bandera del orgullo en la mano (Pride Barcelona, 15–30 de junio) */}
      {theme === "pride" && (
        <g transform="translate(98,74)">
          <rect x="-1.5" y="0" width="3" height="32" rx="1.5" fill="#d6d3d1" />
          <defs>
            <clipPath id={`flag-${uid}`}>
              <path d="M1.5 -2 Q15 1 26 -4 Q21 5 26 13 Q15 8 1.5 13 Z" />
            </clipPath>
          </defs>
          <g clipPath={`url(#flag-${uid})`}>
            <rect x="0" y="-6" width="28" height="3.3" fill="#ef4444" />
            <rect x="0" y="-2.7" width="28" height="3.3" fill="#f97316" />
            <rect x="0" y="0.6" width="28" height="3.3" fill="#facc15" />
            <rect x="0" y="3.9" width="28" height="3.3" fill="#22c55e" />
            <rect x="0" y="7.2" width="28" height="3.3" fill="#3b82f6" />
            <rect x="0" y="10.5" width="28" height="3.3" fill="#8b5cf6" />
          </g>
        </g>
      )}

      {/* gafas de sol, crema y sol de verano (1 jul – 31 ago) */}
      {theme === "summer" && (
        <>
          <defs>
            <linearGradient id={`sm-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="76" rx="28" ry="5" fill="#000" opacity="0.15" />
          <rect x="27" y="43" width="34" height="30" rx="14" fill={`url(#sm-${uid})`} />
          <rect x="59" y="43" width="34" height="30" rx="14" fill={`url(#sm-${uid})`} />
          <rect x="58" y="54" width="4" height="8" rx="2" fill="#0f172a" />
          <rect x="27" y="43" width="34" height="30" rx="14" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
          <rect x="59" y="43" width="34" height="30" rx="14" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
          <path d="M34 50 Q40 46 48 49" stroke="#93c5fd" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.75" />
          <path d="M66 50 Q72 46 80 49" stroke="#93c5fd" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.75" />
          <circle cx="104" cy="8" r="9" fill="#fbbf24" />
          <g stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round">
            <path d="M104 -6 L104 -10" />
            <path d="M104 22 L104 26" />
            <path d="M118 8 L122 8" />
            <path d="M90 8 L86 8" />
            <path d="M114 -2 L117 -5" />
            <path d="M94 18 L91 21" />
            <path d="M114 18 L117 21" />
            <path d="M94 -2 L91 -5" />
          </g>
          <g transform="translate(98,94) rotate(10)">
            <rect x="-5" y="-12" width="10" height="20" rx="3" fill="#fde68a" />
            <rect x="-3" y="-15" width="6" height="4" rx="1.5" fill="#f97316" />
            <rect x="-4" y="-5" width="8" height="5" fill="#ef4444" opacity="0.85" />
          </g>
        </>
      )}

      {/* un gegant, al lado de Noc (Fiestas de la Mercè, 20–24 de septiembre) — rehecho con más
          detalle (faja, mangas, gemas en la corona, mejillas) porque Jordi dijo que era "muy
          mejorable" */}
      {theme === "merce" && (
        <>
          <defs>
            <linearGradient id={`gg1-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor={darken("#1d4ed8", 35)} />
            </linearGradient>
            <linearGradient id={`gg2-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
          <ellipse cx="18" cy="113" rx="15" ry="4" fill="#000" opacity="0.22" />
          <g transform="translate(18,64)">
            <path d="M-13 48 Q-17 8 0 -4 Q17 8 13 48 Z" fill={`url(#gg1-${uid})`} />
            <path d="M-13 48 Q-17 8 0 -4 L0 48 Z" fill="#000" opacity="0.14" />
            <path d="M-5 -2 Q0 44 0 48 L5 48 Q5 44 5 -2 Z" fill={`url(#gg2-${uid})`} opacity="0.9" />
            <path d="M-13 10 Q-17 8 -16 2" stroke={`url(#gg2-${uid})`} strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M13 10 Q17 8 16 2" stroke={`url(#gg2-${uid})`} strokeWidth="4" fill="none" strokeLinecap="round" />
            <rect x="-13" y="24" width="26" height="6" fill="#fbbf24" />
            <circle cx="0" cy="27" r="3.5" fill="#b45309" />
            <circle cx="0" cy="-12" r="10" fill="#f3d4ae" />
            <circle cx="-7" cy="-9" r="2.2" fill="#fca5a5" opacity="0.7" />
            <circle cx="7" cy="-9" r="2.2" fill="#fca5a5" opacity="0.7" />
            <circle cx="-4" cy="-13" r="1.4" fill="#1c1033" />
            <circle cx="4" cy="-13" r="1.4" fill="#1c1033" />
            <path d="M-3.5 -6 Q0 -3.5 3.5 -6" stroke="#92400e" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M-5 -4.5 Q-7 -2 -9 -3" stroke="#78350f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M5 -4.5 Q7 -2 9 -3" stroke="#78350f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M-10 -17 Q-10 -29 0 -32 Q10 -29 10 -17 Q6 -21 3 -19 Q0 -23 -3 -19 Q-6 -21 -10 -17 Z" fill={`url(#gg2-${uid})`} />
            <circle cx="-10" cy="-17" r="2.4" fill="#ef4444" />
            <circle cx="0" cy="-32" r="2.6" fill="#22c55e" />
            <circle cx="10" cy="-17" r="2.4" fill="#3b82f6" />
          </g>
        </>
      )}

      {/* calabaza y gorro de bruja de Halloween (24 oct – 2 nov). El gorro: ala ancha apoyada
          en la cabeza entre las orejas, cono de lados rectos con la punta doblada, cinta naranja
          con hebilla — el sombrero de bruja de toda la vida. */}
      {theme === "halloween" && (
        <>
          <defs>
            <linearGradient id={`pk-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor={darken("#f97316", 35)} />
            </linearGradient>
            <linearGradient id={`witch-${uid}`} gradientUnits="userSpaceOnUse" x1="60" y1="-24" x2="60" y2="30">
              <stop offset="0%" stopColor="#4c2a85" />
              <stop offset="100%" stopColor="#241238" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="30" rx="37" ry="7" fill="#1a0f2b" />
          <path d="M40 29 L56 -10 L74 -20 L64 -6 L80 29 Z" fill={`url(#witch-${uid})`} />
          <path d="M43.5 21 L76.5 21 L79 28 L41 28 Z" fill="#f97316" />
          <rect x="56" y="20.5" width="8" height="8" rx="1" fill="none" stroke="#fde68a" strokeWidth="1.8" />
          <ellipse cx="100" cy="106" rx="13" ry="3" fill="#000" opacity="0.2" />
          <ellipse cx="100" cy="104" rx="14" ry="11" fill={`url(#pk-${uid})`} />
          <path d="M93 97 Q100 93 107 97" stroke="#c2410c" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M89 104 Q100 109 111 104" stroke="#c2410c" strokeWidth="1.5" fill="none" opacity="0.5" />
          <rect x="98" y="90" width="4" height="7" rx="2" fill="#15803d" transform="rotate(-10 100 93)" />
          <path d="M96 100 L99 104 L96 107 Z" fill="#fde68a" />
          <path d="M104 100 L107 104 L104 107 Z" fill="#fde68a" />
          <path d="M95 109 Q100 112.5 105 109 Q100 111.5 95 109 Z" fill="#fde68a" />
        </>
      )}

      {/* gorro, barba y saco de Papá Noel (Navidad, 15 dic – 6 ene) — tercer intento, esta vez lo
          más simple y literal posible: un triángulo de lados RECTOS (nada de curvas que puedan
          leerse raro), apoyado entre las orejas e inclinado hacia un lado, pompa en la punta y una
          banda recta en la base. El gorro de Papá Noel de toda la vida, sin más. */}
      {theme === "christmas" && (
        <>
          <defs>
            <linearGradient id={`xm-${uid}`} gradientUnits="userSpaceOnUse" x1="60" y1="-14" x2="60" y2="30">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id={`sack-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor={darken("#b45309", 30)} />
            </linearGradient>
          </defs>
          <path d="M36 30 L98 -14 L82 30 Z" fill={`url(#xm-${uid})`} />
          <circle cx="98" cy="-14" r="8.5" fill="#f8fafc" />
          <circle cx="96" cy="-17" r="2.2" fill="#fff" opacity="0.6" />
          <rect x="32" y="24" width="56" height="10" rx="5" fill="#f8fafc" />
          <path
            d="M33 80 Q31 88 35 92 Q33 96 39 97 Q39 101 45 100 Q47 104 53 101 Q57 105 61 101
               Q65 105 67 101 Q73 104 75 100 Q81 101 81 97 Q87 96 85 92 Q89 88 87 80
               Q75 90 60 90 Q45 90 33 80 Z"
            fill="#f8fafc"
          />
          <ellipse cx="22" cy="107" rx="14" ry="10" fill={`url(#sack-${uid})`} />
          <path d="M14 99 Q22 93 30 99" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="16" y="97" width="6" height="6" rx="1" fill="#dc2626" transform="rotate(15 19 100)" />
        </>
      )}
    </svg>
  )
}
