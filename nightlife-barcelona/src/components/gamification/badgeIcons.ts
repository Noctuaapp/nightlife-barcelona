import { Moon, Compass, Map, MapPinned, Headphones, NotebookPen, CalendarCheck, Award, ThumbsUp, Flame, type LucideIcon } from "lucide-react"

// Icono de cada insignia y reto (antes eran emojis). Los textos están en badges.* / challenges.*.
export const BADGE_ICONS: Record<string, LucideIcon> = {
  first_step: Moon,
  explorer_3: Compass,
  explorer_10: Map,
  hoods_3: MapPinned,
  sound_3: Headphones,
  voice: NotebookPen,
  planner: CalendarCheck,
}
export const badgeIcon = (key: string): LucideIcon => BADGE_ICONS[key] || Award

export const CHALLENGE_ICONS: Record<number, LucideIcon> = {
  1: Compass, 2: NotebookPen, 3: CalendarCheck, 4: MapPinned, 5: ThumbsUp, 6: Flame,
}
