// Tipos y datos comunes de la pantalla «Programación de clubs» (admin, 19/11/2026): une las dos pantallas que había,
// «Sesiones semanales» (tabla club_sessions) y «Noches de club» (tabla club_events).

export type Club = {
  id: number
  name: string
  city?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

export type ClubSession = {
  id: number
  club_id: number
  club_name?: string
  day_of_week: string | null
  name: string
  music: string | null
  price: string | null
  dresscode: string | null
  image: string | null
  sort_order: number | null
}

export type ClubEvent = {
  id: number
  club_id: number | null
  club_name: string | null
  title: string
  artist: string | null
  music: string | null
  date: string | null
  start_time: string | null
  end_time: string | null
  price: string | null
  ticket_url: string | null
  image: string | null
  description: string | null
  featured: boolean | null
  sold_out: boolean | null
  age_min: number | null
}

export const DAY_OPTIONS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
