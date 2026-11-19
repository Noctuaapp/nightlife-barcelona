"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { DataExport, SystemStatus, ago } from "../../../components/admin/SystemStatus"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { toast } from "../../../components/ui/Toast"
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, Segmented, Tag } from "../../../components/admin/ui"
import { SwitchRow } from "../../../components/admin/editor"
import { Bus, CalendarClock, CloudDownload, MapPin, RefreshCw, Search, ShieldAlert, ShoppingBasket, Wrench, type LucideIcon } from "lucide-react"
import { SEASONAL_THEMES, type SeasonalOverride } from "../../../lib/nocSeasonal"
import { useAdminCity } from "../../../components/admin/AdminCity"
import { CITIES, type CityKey } from "../../../lib/cities"
import { ESSENTIAL_AREAS_BY_CITY, NEW_ESSENTIAL_CATS_BY_CITY, OSM_AREAS_BY_CITY, firstAreaOf, isCategoryOfCity, toolsOfCity } from "../../../lib/adminTools"

// Herramientas de mantenimiento. Antes se lanzaban visitando una URL con la clave de admin
// pegada (?secret=...), que quedaba en el historial y en los registros. Ahora cada botón llama al
// endpoint con tu sesión de admin y el servidor comprueba que eres tú (ver src/lib/adminAuth.ts).
//
// 19/11/2026: «una lista larga de herramientas que se parecen mucho y es difícil encontrar lo que uno quiere». Ahora son cuatro
// pestañas (Estado · Ajustes · Tareas · Importar), cada herramienta lleva una frase corta (el texto largo queda en «Más información»)
// y los importadores empiezan SIEMPRE en «Vista previa» (un selector claro en vez de una casilla pequeña). Lo que hace cada
// herramienta, sus rutas y su lógica no cambian.

type Tool = {
  key: string
  path: string
  title: string
  short: string // una frase: qué hace
  description: string // el texto completo (se ve en «Más información»)
  group: "nightly" | "fixes" | "manual" | "import"
  schedule?: string // hora de la tarea automática (UTC, como en vercel.json)
  paid?: boolean // gasta llamadas de pago de Google
  batch?: boolean // devuelve "remaining": se puede repetir hasta que llegue a 0
  osm?: boolean
  osmEssentials?: boolean // zona + categoría + vista previa / importar de verdad
  googleEssentials?: boolean // igual, pero con Google Places (cuesta llamadas de pago)
  nitbus?: boolean // vista previa / importar de verdad, sin zona
  madridBarrios?: boolean // vista previa / aplicar de verdad, con la opción de incluir los importados de OpenStreetMap
  city?: CityKey // herramienta de una sola ciudad (sin esto sirve para todas)
}

const TOOL_ICONS: Record<string, LucideIcon> = {
  "refresh-clubs": RefreshCw,
  "refresh-clubs-madrid": RefreshCw,
  "refresh-events": RefreshCw,
  "refresh-essentials": RefreshCw,
  "advance-events": CalendarClock,
  "assign-place-ids": Search,
  geocode: MapPin,
  "fix-mismatched": ShieldAlert,
  "import-osm": CloudDownload,
  "import-osm-essentials": ShoppingBasket,
  "import-google-essentials": ShoppingBasket,
  "import-nitbus": Bus,
  "assign-madrid-barrios": MapPin,
}

const TOOLS: Tool[] = [
  {
    key: "refresh-clubs",
    group: "nightly",
    short: "Pone al día valoración, reseñas y fotos de los clubs con datos de Google.",
    schedule: "04:00",
    path: "/api/cron/refresh-google-data",
    title: "Actualizar datos de Google (clubs)",
    description: "Valoración y nº de reseñas de Google, fotos (solo a los clubs sin galería) y web o redes si están vacías. No toca los horarios. Se ejecuta solo cada noche a las 04:00.",
    batch: true,
  },
  {
    key: "refresh-clubs-madrid",
    group: "manual",
    short: "Datos de Google solo para los locales de Madrid. Solo se lanza a mano.",
    paid: true,
    path: "/api/cron/refresh-google-data?city=madrid",
    city: "madrid",
    title: "Actualizar datos de Google (clubs de Madrid)",
    description:
      "Como el de arriba, pero solo con los locales de Madrid, aunque la ciudad siga en prelaunch (sigue cerrada al público y sus locales, ocultos). Primero les busca la ficha de Google DENTRO de Madrid (descarta lo que caiga fuera o no se parezca al nombre) y luego baja valoración, fotos (solo a los que no tienen galería) y web o redes si están vacías. Los que Google no encuentra se saltan: revísalos a mano. La tarea de cada noche no lo hace: solo se lanza cuando pulsas aquí. Gasta llamadas de pago: ~1 búsqueda + 1 consulta + hasta 5 fotos por club.",
    batch: true,
  },
  {
    key: "refresh-events",
    group: "nightly",
    short: "Lo mismo para festivales y fiestas de barrio.",
    schedule: "04:30",
    path: "/api/cron/refresh-events-google-data",
    title: "Actualizar datos de Google (eventos)",
    description: "Lo mismo para festivales y fiestas de barrio. Automático a las 04:30.",
    batch: true,
  },
  {
    key: "refresh-essentials",
    group: "nightly",
    short: "Lo mismo para farmacias, cajeros, comida…",
    schedule: "06:00",
    path: "/api/cron/refresh-essentials-google-data",
    title: "Actualizar datos de Google (esenciales)",
    description: "Farmacias, cajeros, comida... Automático a las 06:00.",
    batch: true,
  },
  {
    key: "advance-events",
    group: "nightly",
    short: "Pasa al año siguiente los eventos anuales que ya han pasado.",
    schedule: "05:00",
    path: "/api/cron/advance-past-events",
    title: "Pasar eventos anuales al año siguiente",
    description: "Mueve a la próxima edición los eventos recurrentes que ya han pasado. Automático a las 05:00.",
  },
  {
    key: "assign-place-ids",
    group: "fixes",
    short: "Busca en Google la ficha de los clubs nuevos (15 por tanda).",
    path: "/api/admin/assign-place-ids",
    title: "Asignar ficha de Google a clubs nuevos",
    description: "Busca en Google los clubs que aún no tienen google_place_id (15 por tanda).",
    batch: true,
  },
  {
    key: "geocode",
    group: "fixes",
    short: "Calcula las coordenadas de los clubs que no tienen ubicación.",
    path: "/api/admin/geocode-clubs",
    title: "Poner coordenadas a clubs sin ubicación",
    description: "Calcula latitud y longitud a partir de la dirección.",
    batch: true,
  },
  {
    key: "fix-mismatched",
    group: "fixes",
    short: "Detecta clubs enlazados a una ficha de Google equivocada.",
    path: "/api/admin/fix-mismatched-clubs",
    title: "Revisar fichas de Google mal asignadas",
    description: "Detecta clubs enlazados a un sitio de Google equivocado.",
    batch: true,
  },
  {
    key: "import-osm",
    group: "import",
    short: "Trae locales de una zona desde OpenStreetMap. Entran ocultos.",
    path: "/api/admin/import-osm-clubs",
    title: "Importar locales desde OpenStreetMap",
    description: "Todo entra oculto para revisarlo antes de publicar. Sin marcar «Importar de verdad» solo es una vista previa. Madrid va en dos partes: lanza una y luego la otra.",
    osm: true,
  },
  {
    key: "import-osm-essentials",
    group: "import",
    short: "Trae farmacias, cajeros, comida y más desde OpenStreetMap. Entran ocultos.",
    path: "/api/admin/import-osm-essentials",
    title: "Importar esenciales desde OpenStreetMap",
    description: "Farmacias, cajeros, comida, supermercados, gasolineras y hospitales abiertos las 24 h o hasta la 1:00 o más tarde. Y, de una en una: paradas de taxi, veterinarios de urgencias, aseos, máquinas expendedoras, consignas, comisarías y estaciones de Bicing (sin bicis libres en directo). Todo entra oculto y «sin confirmar» para revisarlo en Esenciales antes de publicar. Necesita el SQL 82. En Barcelona elige una categoría cada vez. Sin marcar «Importar de verdad» solo es una vista previa.",
    osmEssentials: true,
  },
  {
    key: "import-google-essentials",
    group: "import",
    short: "Trae esenciales de noche con el horario de Google.",
    paid: true,
    path: "/api/admin/import-google-essentials",
    city: "barcelona", // solo sabe de los municipios del área de Barcelona
    title: "Importar esenciales de noche desde Google",
    description: "Supermercados, comida, gasolineras y farmacias abiertos las 24 h o hasta la 1:00 o más tarde, con el horario que da Google (OpenStreetMap y Overture no lo traen). Todo entra oculto para revisarlo en Esenciales. OJO: gasta llamadas de pago de Google (unas 6–14 por municipio para súper + comida; 35 $ cada 1.000, con 1.000 gratis al mes) y respeta el tope diario GOOGLE_PLACES_DAILY_LIMIT, que está en 20: para usarla hay que subirlo en Vercel. La vista previa también gasta llamadas: si te fías, marca «Importar de verdad» directamente.",
    googleEssentials: true,
  },
  {
    key: "import-nitbus",
    group: "import",
    short: "Carga las paradas de las líneas N del Nitbus.",
    path: "/api/admin/import-nitbus-stops",
    city: "barcelona", // el Nitbus es de Barcelona
    title: "Cargar paradas de Nitbus (OpenStreetMap)",
    description: "Todas las paradas de las líneas N con sus líneas, para el mapa de Nitbus y las fichas de club. Reemplaza las que se cargaron antes desde aquí (las tuyas a mano no se tocan). Sin marcar «Importar de verdad» solo es una vista previa.",
    nitbus: true,
  },
  {
    key: "assign-madrid-barrios",
    group: "import",
    short: "Pone barrio (Malasaña, Chueca…) a los locales de Madrid según sus coordenadas.",
    path: "/api/admin/assign-madrid-barrios",
    city: "madrid",
    title: "Poner barrio a los locales de Madrid",
    description: "Asigna Malasaña, Chueca, La Latina… (12 zonas, según las coordenadas) a los locales de Madrid que ya importaste. Por defecto solo toca los que tienen el barrio vacío o «Madrid»; lo que hayas escrito a mano se queda. Sin marcar «Aplicar de verdad» solo es una vista previa.",
    madridBarrios: true,
  },
]


// Qué campo del estado del sistema guarda la última vez que corrió cada tarea de Google (admin_system_status).
const LAST_RUN_KEY: Record<string, "last_google_clubs" | "last_google_events" | "last_google_essentials" | undefined> = {
  "refresh-clubs": "last_google_clubs",
  "refresh-events": "last_google_events",
  "refresh-essentials": "last_google_essentials",
}

// Tareas de vercel.json que no se lanzan desde aquí (no tienen botón a propósito: borran datos o mandan correos).
const AUTO_ONLY = [
  { title: "Resumen diario por correo", what: "Te manda los avisos de las últimas 24 h que no llegaron ya al momento. Si no ha pasado nada, no envía nada.", when: "Cada día · 08:00 UTC" },
  { title: "Limpieza de analítica", what: "Borra el detalle de las visitas de más de 13 meses.", when: "Lunes · 03:30 UTC" },
  { title: "Limpieza de mensajes de contacto", what: "Borra los mensajes de Contacto de más de 12 meses, el plazo que promete la política de Privacidad.", when: "Lunes · 03:45 UTC" },
]

const MAX_ROUNDS = 40

type ToolResult = { remaining?: number; error?: string; [key: string]: unknown }
type RunState = { running: boolean; rounds: number; result: ToolResult | null; error: string | null }

type ToolsTab = "estado" | "ajustes" | "tareas" | "importar"
const TAB_HINT: Record<ToolsTab, string> = {
  estado: "Cuánto ocupa la web, qué se ha gastado en Google y copias de seguridad de tus datos.",
  ajustes: "Interruptores que valen para toda la web, en todas las ciudades a la vez.",
  tareas: "Las tareas de datos: las de cada noche se lanzan solas; aquí puedes adelantarlas o arreglar fichas de clubs.",
  importar: "Traer locales y esenciales de fuera. Cada importador empieza en «Vista previa» y no escribe nada hasta que lo cambias.",
}

export default function AdminToolsPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [tab, setTab] = useState<ToolsTab>("estado")
  const [status, setStatus] = useState<{ last_google_clubs?: string | null; last_google_events?: string | null; last_google_essentials?: string | null } | null>(null)
  // Admin por ciudad (15/11/2026): los importadores y su zona dependen de la ciudad elegida en el menú; los interruptores de la web
  // (mantenimiento, Club Noctua, temporada de Noc) y el estado del sistema son de toda la web y no cambian.
  const [city] = useAdminCity()
  const cityName = CITIES[city].name
  const tools = useMemo(() => toolsOfCity(TOOLS, city), [city])
  const [state, setState] = useState<Record<string, RunState>>({})
  const [osmArea, setOsmArea] = useState("barcelona")
  const [osmReal, setOsmReal] = useState(false)
  const [essArea, setEssArea] = useState("badalona")
  const [essCat, setEssCat] = useState("all")
  const [essReal, setEssReal] = useState(false)
  const [allNewRunning, setAllNewRunning] = useState(false)
  const [allNewLog, setAllNewLog] = useState<string[]>([])
  const [gArea, setGArea] = useState("badalona")
  const [gCat, setGCat] = useState("supermarket,food")
  const [gReal, setGReal] = useState(false)
  const [nitbusReal, setNitbusReal] = useState(false)
  const [mbReal, setMbReal] = useState(false)
  const [mbOsm, setMbOsm] = useState(false)
  const stopRef = useRef<Record<string, boolean>>({})

  // Al cambiar de ciudad, las zonas y categorías elegidas se ponen en las de la ciudad nueva (una zona de Madrid no se puede lanzar
  // desde Barcelona ni al revés), y se apagan los «de verdad» para no lanzar nada real sin querer.
  const prevCity = useRef(city)
  useEffect(() => {
    if (prevCity.current === city) return
    prevCity.current = city
    setOsmArea(firstAreaOf(city))
    setEssArea(firstAreaOf(city))
    setOsmReal(false)
    setEssReal(false)
    setMbReal(false)
    setEssCat((c) => (isCategoryOfCity(c, city) ? c : "all"))
  }, [city])

  // Interruptor de Club Noctua (pedido el 23/10/2026): mientras está en false, nadie gana XP por
  // check-in/racha/login/misiones (solo invitar amigos sigue dando algo) y nadie salvo tú ve
  // misiones, insignias ni la lista de niveles en /club-noctua. Ver supabase/18_pausar_club_noctua.sql.
  const [noctuaEnabled, setNoctuaEnabled] = useState<boolean | null>(null)
  const [savingToggle, setSavingToggle] = useState(false)

  // Temporada de Noc (pedido el 23/10/2026): "auto" es el valor normal, de verdad — Noc decide
  // por la fecha sin que haga falta tocar nada aquí. Esto es solo para forzar una temporada antes
  // de que llegue (probarla) o apagarlas todas, sin esperar al calendario. Ver
  // supabase/20_noc_estacional.sql y src/lib/nocSeasonal.ts.
  const [nocMode, setNocMode] = useState<SeasonalOverride | null>(null)
  const [savingNocMode, setSavingNocMode] = useState(false)

  // Modo mantenimiento: antes era lo primero del Resumen (el botón más peligroso del admin en el
  // sitio más visible). Ahora vive aquí, con los otros interruptores de la web.
  const [maintenance, setMaintenance] = useState<boolean | null>(null)
  const [savingMaintenance, setSavingMaintenance] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  // Pestaña inicial desde la dirección (?tab=estado|ajustes|tareas|importar).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab")
    if (t === "estado" || t === "ajustes" || t === "tareas" || t === "importar") setTab(t)
  }, [])
  const changeTab = (t: ToolsTab) => {
    setTab(t)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", t)
      window.history.replaceState(null, "", url.toString())
    } catch {
      // Sin historial: la pestaña cambia igual, solo no se refleja en la dirección.
    }
  }

  useEffect(() => {
    if (checkingAdmin) return
    supabase.rpc("admin_system_status").then(({ data }) => setStatus((data as typeof status) || null))
    supabase
      .from("club_noctua_settings")
      .select("enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setNoctuaEnabled(data?.enabled === true))
    supabase
      .from("noc_seasonal_settings")
      .select("mode")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setNocMode(((data?.mode as SeasonalOverride) || "auto")))
    supabase
      .from("app_settings")
      .select("maintenance_mode")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => setMaintenance(!!data?.maintenance_mode))
  }, [checkingAdmin])

  const toggleMaintenance = async () => {
    if (maintenance === null) return
    const next = !maintenance
    if (next && !window.confirm("¿Activar el modo mantenimiento? Nadie excepto tú podrá usar la web hasta que lo desactives.")) return
    setSavingMaintenance(true)
    const { error } = await supabase.from("app_settings").update({ maintenance_mode: next }).eq("id", true)
    setSavingMaintenance(false)
    if (error) {
      toast("No se pudo cambiar el modo mantenimiento: " + error.message)
      return
    }
    setMaintenance(next)
  }

  const toggleClubNoctua = async () => {
    if (noctuaEnabled === null) return
    setSavingToggle(true)
    const next = !noctuaEnabled
    const { error } = await supabase
      .from("club_noctua_settings")
      .update({ enabled: next, updated_at: new Date().toISOString() })
      .eq("id", 1)
    setSavingToggle(false)
    if (error) {
      toast("No se pudo cambiar: " + error.message)
      return
    }
    setNoctuaEnabled(next)
  }

  const changeNocMode = async (next: SeasonalOverride) => {
    setSavingNocMode(true)
    const { error } = await supabase
      .from("noc_seasonal_settings")
      .update({ mode: next, updated_at: new Date().toISOString() })
      .eq("id", 1)
    setSavingNocMode(false)
    if (error) {
      toast("No se pudo cambiar: " + error.message)
      return
    }
    setNocMode(next)
  }

  const EMPTY: RunState = { running: false, rounds: 0, result: null, error: null }
  const update = (key: string, patch: Partial<RunState>) =>
    setState((s) => ({ ...s, [key]: { ...EMPTY, ...s[key], ...patch } }))

  const callOnce = async (tool: Tool): Promise<ToolResult> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error("Sesión caducada: vuelve a iniciar sesión.")
    const url = tool.osm
      ? `${tool.path}?area=${osmArea}${osmReal ? "&dry=0" : ""}`
      : tool.osmEssentials
      ? `${tool.path}?area=${essArea}&cat=${essCat}${essReal ? "&dry=0" : ""}`
      : tool.googleEssentials
      ? `${tool.path}?area=${gArea}&cat=${gCat}${gReal ? "&dry=0" : ""}`
      : tool.nitbus
      ? `${tool.path}${nitbusReal ? "?dry=0" : ""}`
      : tool.madridBarrios
      ? `${tool.path}?osm=${mbOsm ? 1 : 0}${mbReal ? "&dry=0" : ""}`
      : tool.path
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const json: ToolResult = await res.json().catch(() => ({ error: `Respuesta no válida (${res.status})` }))
    if (!res.ok) throw new Error(json?.error || `Error ${res.status}`)
    return json
  }

  // «Importar lo que falta» (06/11/2026): las categorías nuevas, una detrás de otra, en todas las áreas. Es lo mismo que
  // elegir cada área y categoría a mano e «Importar de verdad», pero sin tener que hacerlo 70 veces. Es seguro repetirlo:
  // el importador se salta lo que ya existe, y todo entra OCULTO para que lo revises y lo publiques.
  const NEW_ESS_CATS = NEW_ESSENTIAL_CATS_BY_CITY[city]
  const ESS_AREAS = ESSENTIAL_AREAS_BY_CITY[city]
  const runAllNewEssentials = async () => {
    if (!window.confirm(`Se importarán las ${NEW_ESS_CATS.length} categorías nuevas de ${cityName} en ${ESS_AREAS.length === 1 ? "su zona" : `las ${ESS_AREAS.length} zonas`}, una detrás de otra (unos minutos). Todo entra oculto. ¿Seguir?`)) return
    stopRef.current["all-new-ess"] = false
    setAllNewRunning(true)
    setAllNewLog([])
    const log = (line: string) => setAllNewLog((l) => [...l, line])
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    try {
      for (const [cat, catName] of NEW_ESS_CATS) {
        for (const [area, areaName] of ESS_AREAS) {
          if (stopRef.current["all-new-ess"]) { log("Parado."); return }
          let done = false
          for (let attempt = 1; attempt <= 2 && !done; attempt++) {
            try {
              const { data } = await supabase.auth.getSession()
              const token = data.session?.access_token
              if (!token) throw new Error("Sesión caducada: vuelve a iniciar sesión.")
              const res = await fetch(`/api/admin/import-osm-essentials?area=${area}&cat=${cat}&dry=0`, { headers: { Authorization: `Bearer ${token}` } })
              const json = await res.json().catch(() => ({ error: `Respuesta no válida (${res.status})` }))
              if (!res.ok) throw new Error(json?.error || `Error ${res.status}`)
              log(`✓ ${catName} · ${areaName}: ${json.insertados ?? 0} nuevos`)
              done = true
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Error"
              if (attempt === 2 || /Sesión caducada/.test(msg)) { log(`✗ ${catName} · ${areaName}: ${msg}`); done = true }
              else await sleep(8000) // Overpass a veces responde «ocupado»: se reintenta una vez
            }
          }
          await sleep(1500) // sin ir a toda prisa contra Overpass
        }
      }
      log("Terminado. Revisa y publica en Admin › Esenciales.")
    } finally {
      setAllNewRunning(false)
    }
  }

  const run = async (tool: Tool, repeat: boolean) => {
    stopRef.current[tool.key] = false
    update(tool.key, { running: true, rounds: 0, error: null, result: null })
    try {
      let rounds = 0
      let json: ToolResult | null = null
      do {
        json = await callOnce(tool)
        rounds++
        update(tool.key, { rounds, result: json })
      } while (
        repeat &&
        rounds < MAX_ROUNDS &&
        !stopRef.current[tool.key] &&
        typeof json?.remaining === "number" &&
        json.remaining > 0
      )
      update(tool.key, { running: false })
    } catch (e) {
      update(tool.key, { running: false, error: e instanceof Error ? e.message : "Error desconocido" })
    }
  }

  if (checkingAdmin) {
    return (
      <AdminShell title="Ajustes y herramientas">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const selectCls = "ui-input ui-input-flat !min-h-[40px] !w-auto max-w-full"
  const byGroup = (g: Tool["group"]) => tools.filter((t) => t.group === g)

  // Para cada herramienta con «vista previa / de verdad»: en qué modo está, cómo se cambia y cómo se llama el modo real.
  const modeOf = (tool: Tool): { real: boolean; set: (v: boolean) => void; label: string } | null => {
    if (tool.osm) return { real: osmReal, set: setOsmReal, label: "Importar de verdad" }
    if (tool.osmEssentials) return { real: essReal, set: setEssReal, label: "Importar de verdad" }
    if (tool.googleEssentials) return { real: gReal, set: setGReal, label: "Importar de verdad" }
    if (tool.nitbus) return { real: nitbusReal, set: setNitbusReal, label: "Importar de verdad" }
    if (tool.madridBarrios) return { real: mbReal, set: setMbReal, label: "Aplicar de verdad" }
    return null
  }

  const renderTool = (tool: Tool, step?: number) => {
    const st = state[tool.key]
    const remaining = typeof st?.result?.remaining === "number" ? st.result.remaining : null
    const mode = modeOf(tool)
    const Icon = TOOL_ICONS[tool.key] ?? Wrench
    const lastKey = LAST_RUN_KEY[tool.key]
    const lastAt = lastKey && status ? status[lastKey] : undefined
    const lastStale = lastAt ? (Date.now() - new Date(lastAt).getTime()) / 3600000 >= 36 : true
    return (
      <div key={tool.key} className="ui-card min-w-0 p-5">
        <div className="flex items-start gap-3.5">
          <span className="ui-icon mt-0.5"><Icon size={15} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h3 className="text-[15px] font-extrabold leading-snug text-white">{tool.title}</h3>
              {step != null && <Tag tone="violet">Paso {step}</Tag>}
              {tool.schedule && <Tag>Cada noche · {tool.schedule} UTC</Tag>}
              {tool.paid && <Tag tone="amber">Gasta llamadas de pago</Tag>}
            </div>
            <p className="mt-1 text-sm text-zinc-300/85">{tool.short}</p>
            {lastKey && status && (
              <p className={`mt-1.5 text-xs font-semibold ${lastStale ? "text-amber-300" : "text-emerald-300"}`}>
                Última vez: {lastAt ? ago(lastAt) : "nunca"}{lastStale ? " ⚠" : ""}
              </p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-bold text-brand-soft">Más información</summary>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300/80">{tool.description}</p>
            </details>
          </div>
        </div>

        {(tool.osm || tool.osmEssentials || tool.googleEssentials) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {tool.osm && (
              <select value={osmArea} onChange={(e) => setOsmArea(e.target.value)} aria-label="Zona" className={selectCls}>
                {OSM_AREAS_BY_CITY[city].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            )}
            {tool.osmEssentials && (
              <>
                <select value={essArea} onChange={(e) => setEssArea(e.target.value)} aria-label="Zona" className={selectCls}>
                  {OSM_AREAS_BY_CITY[city].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={essCat} onChange={(e) => setEssCat(e.target.value)} aria-label="Categoría" className={selectCls}>
                  <option value="all">Todas las categorías</option>
                  <option value="pharmacy">Farmacias</option>
                  <option value="atm">Cajeros</option>
                  <option value="food">Comida</option>
                  <option value="supermarket">Supermercados</option>
                  <option value="gas">Gasolineras</option>
                  <option value="hospital">Hospitales</option>
                  {isCategoryOfCity("parking", city) && <option value="parking">Parkings gratuitos (aparte, no entra en «Todas»)</option>}
                  <optgroup label="Nuevas (de una en una, no entran en «Todas»)">
                    <option value="taxi">Paradas de taxi</option>
                    <option value="veterinary">Veterinarios de urgencias</option>
                    <option value="toilets">Aseos públicos</option>
                    <option value="vending">Máquinas expendedoras</option>
                    <option value="luggage">Consignas</option>
                    <option value="police">Comisarías y policía</option>
                    {isCategoryOfCity("bicing", city) && <option value="bicing">Estaciones de Bicing</option>}
                    {isCategoryOfCity("bicimad", city) && <option value="bicimad">Estaciones de BiciMAD</option>}
                    {isCategoryOfCity("tobacco", city) && <option value="tobacco">Estancos</option>}
                  </optgroup>
                </select>
              </>
            )}
            {tool.googleEssentials && (
              <>
                <select value={gArea} onChange={(e) => setGArea(e.target.value)} aria-label="Municipio" className={selectCls}>
                  <option value="hospitalet">L&apos;Hospitalet</option>
                  <option value="badalona">Badalona</option>
                  <option value="elprat">El Prat</option>
                  <option value="santacoloma">Santa Coloma de Gramenet</option>
                  <option value="cornella">Cornellà de Llobregat</option>
                  <option value="santadria">Sant Adrià de Besòs</option>
                  <option value="esplugues">Esplugues de Llobregat</option>
                  <option value="santfeliu">Sant Feliu de Llobregat</option>
                  <option value="santboi">Sant Boi de Llobregat</option>
                </select>
                <select value={gCat} onChange={(e) => setGCat(e.target.value)} aria-label="Categoría" className={selectCls}>
                  <option value="supermarket,food">Supermercados + comida</option>
                  <option value="supermarket">Solo supermercados</option>
                  <option value="food">Solo comida</option>
                  <option value="gas">Gasolineras</option>
                  <option value="pharmacy">Farmacias 24 h</option>
                  <option value="all">Todas</option>
                </select>
              </>
            )}
          </div>
        )}

        {tool.madridBarrios && (
          <label className="mt-4 flex items-start gap-2.5 text-sm text-zinc-200">
            <input type="checkbox" checked={mbOsm} onChange={(e) => setMbOsm(e.target.checked)} className="mt-1" />
            Incluir también los importados de OpenStreetMap (aunque ya traigan otro barrio)
          </label>
        )}

        {mode && (
          <div className="mt-4">
            <Segmented<"preview" | "real">
              label="Qué hace al lanzarlo"
              value={mode.real ? "real" : "preview"}
              onChange={(v) => mode.set(v === "real")}
              options={[{ value: "preview", label: "Vista previa" }, { value: "real", label: mode.label }]}
            />
            <p className="mt-1.5 text-xs text-zinc-300/70">{mode.real ? "Escribe en la base de datos." : tool.paid ? "No escribe nada, pero la vista previa también gasta llamadas de Google." : "Solo enseña lo que haría; no escribe nada."}</p>
          </div>
        )}

        {tool.osmEssentials && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-bold text-white">Importar lo que falta</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300/80">
              Las {NEW_ESS_CATS.length} categorías nuevas (taxi, veterinarios, aseos, máquinas, consignas, policía{city === "madrid" ? ", BiciMAD y estancos" : " y Bicing"}) en{" "}
              {ESS_AREAS.length === 1 ? "su zona" : `las ${ESS_AREAS.length} zonas`} de {cityName}, una detrás de otra. Se salta lo que ya está importado y todo entra oculto.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={runAllNewEssentials} disabled={allNewRunning} className={BTN_PRIMARY}>
                {allNewRunning ? "Importando…" : "Importar lo que falta"}
              </button>
              {allNewRunning && (
                <button onClick={() => (stopRef.current["all-new-ess"] = true)} className={BTN_GHOST}>Parar</button>
              )}
            </div>
            {allNewLog.length > 0 && (
              <ul className="mt-3 max-h-56 overflow-auto rounded-lg bg-black/50 p-3 text-xs leading-relaxed text-zinc-300">
                {allNewLog.map((l, i) => (
                  <li key={i} className={l.startsWith("✗") ? "text-red-300" : ""}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => run(tool, false)} disabled={st?.running} className={BTN_PRIMARY}>
            {st?.running ? "Ejecutando…" : mode ? (mode.real ? mode.label : "Ver vista previa") : "Lanzar ahora"}
          </button>
          {tool.batch && (
            <button onClick={() => run(tool, true)} disabled={st?.running} className={BTN_GHOST}>Repetir hasta terminar</button>
          )}
          {st?.running && tool.batch && (
            <button onClick={() => (stopRef.current[tool.key] = true)} className={BTN_DANGER}>Parar</button>
          )}
        </div>

        {(st?.rounds || 0) > 0 && (
          <p className="mt-3 text-xs text-zinc-300/80">
            {st!.rounds} {st!.rounds === 1 ? "tanda" : "tandas"}
            {remaining !== null ? ` · quedan ${remaining}` : ""}
            {!st!.running && remaining === 0 ? " · terminado" : ""}
          </p>
        )}
        {st?.error && <p className="mt-3 text-sm text-red-300">{st.error}</p>}
        {st?.result && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-bold text-zinc-300">Ver respuesta</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/50 p-3 text-xs leading-relaxed text-zinc-300">
              {JSON.stringify(st.result, null, 2)}
            </pre>
          </details>
        )}
      </div>
    )
  }

  return (
    <AdminShell title="Ajustes y herramientas" subtitle="Estado de la web, interruptores y tareas de mantenimiento de datos.">
      {maintenance && (
        <div className="ui-card mb-6 flex flex-wrap items-center gap-3 !border-red-400/45 !bg-red-500/[0.09] px-5 py-4">
          <p className="min-w-0 flex-1 text-sm font-semibold text-red-100">La web está en modo mantenimiento: nadie la ve salvo tú.</p>
          {tab !== "ajustes" && <button type="button" onClick={() => changeTab("ajustes")} className={`${BTN_GHOST} ui-btn-sm`}>Ir al interruptor</button>}
        </div>
      )}

      <Segmented<ToolsTab>
        label="Sección de herramientas"
        value={tab}
        onChange={changeTab}
        className="mb-3"
        options={[
          { value: "estado", label: "Estado" },
          { value: "ajustes", label: "Ajustes" },
          { value: "tareas", label: "Tareas" },
          { value: "importar", label: "Importar" },
        ]}
      />
      <p className="mb-6 text-sm text-zinc-300/80">
        {tab === "importar" ? `${TAB_HINT.importar} Aquí salen los de ${cityName}.` : TAB_HINT[tab]}
      </p>

      {tab === "estado" && (
        <>
          <SystemStatus />
          <DataExport />
        </>
      )}

      {tab === "ajustes" && (
        <div className="ui-card p-5 sm:p-6">
          <div className="grid gap-3">
            <SwitchRow
              tone="red"
              checked={!!maintenance}
              disabled={maintenance === null || savingMaintenance}
              onChange={() => void toggleMaintenance()}
              title="Modo mantenimiento"
              hint={maintenance === null ? "Cargando…" : maintenance ? "Activo: la web está cerrada para todos menos para ti." : "Apagado: la web funciona con normalidad para todo el mundo."}
            />
            <SwitchRow
              tone="green"
              checked={!!noctuaEnabled}
              disabled={noctuaEnabled === null || savingToggle}
              onChange={() => void toggleClubNoctua()}
              title="Club Noctua"
              hint={noctuaEnabled === null ? "Cargando…" : noctuaEnabled ? "Activo: todo el mundo gana XP y ve misiones, insignias y niveles." : "En pausa: solo se gana XP invitando amigos. Nadie ve misiones, insignias ni niveles salvo tú."}
            />
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">Temporada de Noc</p>
                <p className="mt-0.5 text-xs leading-snug text-zinc-300/80">
                  {nocMode === "auto" || nocMode === null
                    ? "Automático: Noc se pone el accesorio que toque según la fecha, sin tocar nada."
                    : nocMode === "none"
                    ? "Apagado: Noc se ve siempre normal, sin accesorios de temporada."
                    : `Forzado a mano: ${SEASONAL_THEMES.find((s) => s.key === nocMode)?.label || nocMode}, aunque no sea la fecha.`}
                </p>
              </div>
              <select
                value={nocMode ?? "auto"}
                disabled={nocMode === null || savingNocMode}
                onChange={(e) => changeNocMode(e.target.value as SeasonalOverride)}
                aria-label="Temporada de Noc"
                className="ui-input ui-input-flat !min-h-[40px] w-full sm:!w-auto"
              >
                <option value="auto">🗓️ Automático (según la fecha)</option>
                <option value="none">🙈 Ninguno (Noc normal)</option>
                {SEASONAL_THEMES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label} — {s.dateHint}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === "tareas" && (
        <>
          <ToolGroup title="Se ejecutan solas cada noche" hint="No tienes que hacer nada. «Lanzar ahora» solo sirve para adelantarlas. Las horas son UTC, como en Vercel.">
            {byGroup("nightly").map((t) => renderTool(t))}
          </ToolGroup>

          <section className="mb-9">
            <div className="mb-4 border-b border-white/10 pb-2.5">
              <h2 className="text-[15px] font-extrabold tracking-tight text-white">Otras tareas automáticas</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-300/80">Funcionan solas y no tienen botón: no hace falta lanzarlas.</p>
            </div>
            <ul className="ui-card divide-y divide-white/10">
              {AUTO_ONLY.map((a) => (
                <li key={a.title} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{a.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-300/80">{a.what}</p>
                  </div>
                  <Tag className="self-start sm:self-center">{a.when}</Tag>
                </li>
              ))}
            </ul>
          </section>

          <ToolGroup title="Arreglar fichas de clubs" hint="Para cuando añades clubs nuevos o ves datos mal: mejor en este orden.">
            {byGroup("fixes").map((t, i) => renderTool(t, i + 1))}
          </ToolGroup>

          {byGroup("manual").length > 0 && (
            <ToolGroup title="Solo cuando tú lo pides" hint="No se ejecuta nunca solo, y gasta llamadas de pago de Google.">
              {byGroup("manual").map((t) => renderTool(t))}
            </ToolGroup>
          )}
        </>
      )}

      {tab === "importar" && (
        <ToolGroup title={`Importadores de ${cityName}`} hint="Los locales y esenciales importados entran ocultos: revísalos y publícalos desde Clubs o Esenciales.">
          {byGroup("import").map((t) => renderTool(t))}
        </ToolGroup>
      )}
    </AdminShell>
  )
}

// Un bloque de herramientas con su título, su explicación y las tarjetas en dos columnas.
function ToolGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-9 last:mb-0">
      <div className="mb-4 border-b border-white/10 pb-2.5">
        <h2 className="text-[15px] font-extrabold tracking-tight text-white">{title}</h2>
        {hint && <p className="mt-1 text-xs leading-relaxed text-zinc-300/80">{hint}</p>}
      </div>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">{children}</div>
    </section>
  )
}
