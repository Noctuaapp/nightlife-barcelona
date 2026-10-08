"use client"

import { useEffect, useState } from "react"
import NocOwl, { OwlMood } from "./NocOwl"
import { useLanguage } from "../../context/LanguageContext"
import { madridClock } from "../../lib/clubHours"

// Frase de Noc según la hora y el día en Madrid. Se calcula tras montar (no en el servidor) para
// no provocar un error de hidratación: la hora del servidor y la del navegador no coinciden.
const ES = {
  morning: ["¡Buenos días! La noche duerme, pero yo ya estoy pensando en un plan para hoy.", "Café en mano, buscando planes para esta noche. ¿Te ayudo?"],
  afternoon: ["Se acerca la noche. ¿Te busco plan para hoy?", "Hoy hay noche. ¿Quedamos con un sitio que te sorprenda?"],
  evening: ["¡Esto se anima! ¿Bailar, charlar o algo tranquilo?", "Es la hora. Dime qué te apetece y te busco sitio."],
  weekendEvening: ["¡Hoy se sale! ¿Te sorprendo con un plan?", "Noche de las buenas. ¿Probamos un sitio nuevo?"],
  late: ["Los búhos no dormimos 🦉 ¿Te busco el siguiente sitio?", "Aún hay noche por delante. ¿Probamos otro sitio?"],
  dawn: ["Ya casi amanece. Piensa en la vuelta a casa: te ayudo con el transporte.", "Último tramo de la noche. Cuida la vuelta, que yo te echo una mano."],
}
const EN = {
  morning: ["Good morning! The night is asleep, but I'm already thinking about tonight's plan.", "Coffee in hand, hunting for plans for tonight. Want a hand?"],
  afternoon: ["Night is getting closer. Want me to find you a plan?", "Tonight's on. Shall I surprise you with a spot?"],
  evening: ["Things are heating up! Dance, chat or something chill?", "It's time. Tell me your mood and I'll find a place."],
  weekendEvening: ["It's going down tonight! Want a surprise plan?", "A proper night out. Try somewhere new?"],
  late: ["Owls never sleep 🦉 Want me to find your next spot?", "Plenty of night left. Another place?"],
  dawn: ["Almost sunrise. Think about the way home — I can help with transport.", "Last stretch of the night. Get home safe, I've got your back."],
}

type Slot = keyof typeof ES

function pickSlot(): { slot: Slot; seed: number } {
  const { dow, minutes } = madridClock()
  const h = Math.floor(minutes / 60)
  const weekend = dow === 5 || dow === 6
  let slot: Slot
  if (h >= 6 && h < 12) slot = "morning"
  else if (h >= 12 && h < 19) slot = "afternoon"
  else if (h >= 19 && h < 23) slot = weekend ? "weekendEvening" : "evening"
  else if (h >= 23 || h < 4) slot = "late"
  else slot = "dawn"
  return { slot, seed: dow * 24 + h }
}

const MOOD_BY_SLOT: Record<Slot, OwlMood> = {
  morning: "happy",
  afternoon: "wink",
  evening: "happy",
  weekendEvening: "party",
  late: "wow",
  dawn: "sleepy",
}

export function useNocLine(): { line: string; mood: OwlMood } {
  const { locale } = useLanguage()
  const [state, setState] = useState<{ line: string; mood: OwlMood }>({ line: "", mood: "happy" })
  useEffect(() => {
    const { slot, seed } = pickSlot()
    const pool = (locale === "es" || locale === "ca" ? ES : EN)[slot]
    setState({ line: pool[seed % pool.length], mood: MOOD_BY_SLOT[slot] })
  }, [locale])
  return state
}

// Globo de diálogo con Noc a la izquierda. Si todavía no hay frase (primer render) no pinta nada.
export default function NocSays({ owlSize = 56, className = "" }: { owlSize?: number; className?: string }) {
  const { line, mood } = useNocLine()
  if (!line) return null
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <NocOwl size={owlSize} mood={mood} className="shrink-0" />
      <p className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm leading-snug text-zinc-200">{line}</p>
    </div>
  )
}
