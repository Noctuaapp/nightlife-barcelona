"use client"

import Link from "../system/CityLink"
import { stripCityPath } from "../../lib/cities"
import { Home, Shield, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { useIdleVisible } from "../../lib/useIdleVisible"
import { ADMIN_EMAIL } from "../../lib/admin"
import { useViewAsUser } from "../../lib/viewAsUser"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"
import { SECTION_ICONS } from "../../lib/sectionIcons"

// Barra de abajo. 19/11/2026: se quitan los neón y los brillos sueltos. Cápsula de cristal oscuro con borde de luz y botones iguales
// entre sí; la sección en la que estás se llena con una pieza de cristal con volumen que se DESLIZA hasta ella y cambia de color
// según la sección (violeta, magenta, naranja, turquesa, dorado; clases «ui-dock» en globals.css). La activa no depende solo del
// color: también cambia a letra blanca, más peso, icono más grueso y el relleno.

// Color de la pieza activa de cada sección (arriba, abajo, contorno, resplandor). Todos son el mismo cristal con volumen, en tonos
// profundos para que la letra blanca se lea bien. Antes eran neón; ahora son cristal sobrio.
type Tone = [string, string, string, string]
const TONES: Record<string, Tone> = {
  home: ["#8d70ff", "#6a46f5", "#4f2fd0", "rgb(124 92 255 / 0.85)"],
  clubs: ["#d946b0", "#a21caf", "#7a1488", "rgb(217 70 168 / 0.8)"],
  events: ["#ea7a1a", "#b45309", "#85400a", "rgb(245 158 11 / 0.75)"],
  essentials: ["#14b8a6", "#0f766e", "#0b5750", "rgb(45 212 191 / 0.7)"],
  admin: ["#d9a21b", "#a16207", "#774a05", "rgb(234 179 8 / 0.7)"],
}

export default function BottomNav() {
  // Sin el prefijo de ciudad: dentro de /madrid, «/madrid/clubs» cuenta como «/clubs» (los enlaces ya llevan el prefijo, CityLink).
  const pathname = stripCityPath(usePathname())
  const [isAdminAccount, setIsAdmin] = useState(false)
  // «Ver como usuario»: sin la pestaña Admin.
  const viewAsUser = useViewAsUser()
  const isAdmin = isAdminAccount && !viewAsUser
  const { t } = useLanguage()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true)
      }
    }
    checkAdmin()
  }, [])

  // Se esconde a 1,5 s sin interactuar y reaparece al tocar, mover el ratón, hacer scroll o
  // pulsar una tecla.
  const visible = useIdleVisible(1500, pathname)

  const navItems: { label: string; href: string; icon: LucideIcon; tone: Tone }[] = [
    { label: t("nav.home"), href: "/", icon: Home, tone: TONES.home },
    { label: t("nav.clubs"), href: "/clubs", icon: SECTION_ICONS.clubs, tone: TONES.clubs },
    // Con Eventos cerrado (lib/featureFlags.ts) el botón sigue ahí, con la etiqueta «Próximamente», y lleva al aviso.
    { label: t("nav.events"), href: "/events", icon: SECTION_ICONS.events, tone: TONES.events },
    { label: t("nav.essentials"), href: "/essentials", icon: SECTION_ICONS.essentials, tone: TONES.essentials },
    // Al entrar en admin se va directo al dashboard, no a la gestión de clubs (que sigue en /admin).
    ...(isAdmin ? [{ label: "Admin", href: "/admin/dashboard", icon: Shield, tone: TONES.admin }] : []),
  ]

  // Con la pestaña Admin (solo para ti) son cinco botones y ya no caben con el relleno de siempre: se salía el último por la derecha
  // (15/11/2026). Con cinco, cada botón ocupa una quinta parte, con menos relleno y letra algo menor, y una etiqueta muy larga se recorta
  // con «…». Con cuatro (todo el público) la barra queda exactamente como estaba.
  const compact = navItems.length > 4

  // La pieza violeta se desliza hasta la sección activa (se mide el botón, así que da igual cuántos haya). Sin sección activa
  // (p. ej. en /profile) se esconde. La primera colocación no se anima.
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const activeIndex = navItems.findIndex((i) => i.href === pathname)
  const tone = (activeIndex >= 0 ? navItems[activeIndex] : navItems[0]).tone
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null)
  const [animate, setAnimate] = useState(false)
  useLayoutEffect(() => {
    const measure = () => {
      const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null
      setThumb(el ? { x: el.offsetLeft, w: el.offsetWidth } : null)
    }
    measure()
    window.addEventListener("resize", measure)
    const raf = requestAnimationFrame(() => setAnimate(true))
    return () => {
      window.removeEventListener("resize", measure)
      cancelAnimationFrame(raf)
    }
  }, [activeIndex, navItems.length])

  return (
    <nav
      className={`ui-dock fixed bottom-4 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 items-stretch gap-1 p-1.5 transition-[transform,opacity] duration-300 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"}`}
    >
      <span
        aria-hidden="true"
        className="ui-dock-thumb"
        style={
          {
            width: thumb?.w ?? 0,
            transform: `translateX(${thumb?.x ?? 0}px)`,
            opacity: thumb ? 1 : 0,
            transitionDuration: animate ? undefined : "0s",
            "--t1": tone[0],
            "--t2": tone[1],
            "--t3": tone[2],
            "--tg": tone[3],
          } as React.CSSProperties
        }
      />
      {navItems.map((item, idx) => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            ref={(el) => {
              itemRefs.current[idx] = el
            }}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`ui-dock-item relative flex min-w-0 flex-1 flex-col items-center gap-1 py-2 active:scale-[0.97] ${compact ? "px-1 text-[11px]" : "px-2 text-xs"} ${active ? "font-bold" : "font-semibold"}`}
          >
            <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
            {item.href === "/events" && EVENTS_HIDDEN && (
              <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-warn px-1.5 py-px text-[8px] font-bold leading-tight text-night">
                {t("nav.soon")}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
