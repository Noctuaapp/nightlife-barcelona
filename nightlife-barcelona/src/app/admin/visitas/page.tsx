"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Smartphone, Monitor, ChevronDown, User } from "lucide-react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { isAdminEmail } from "../../../lib/admin"

// Visitas (26/10/2026): «de las 84 sesiones, ¿dónde han entrado y qué han hecho?». Cada visita
// con su origen, dispositivo, página de entrada y el recorrido completo en orden; más las páginas
// por las que más se entra y las más vistas. Incluye a quien no tiene cuenta (sin datos
// personales: solo rutas y clics). Datos: admin_sessions() en supabase/44_recorridos_de_visitas.sql.

type Ev = { t: string; type: string; path: string | null; name: string | null; item_type: string | null; results: number | null; meta?: Record<string, unknown> | null }
type Session = {
  id: string
  /** Código anónimo del día (IP + navegador, ver supabase/50_visitante_anonimo.sql). Null en visitas anteriores. */
  visitor?: string | null
  started_at: string
  minutes: number
  source: string | null
  device: string | null
  username: string | null
  user_id: string | null
  landing: string | null
  pages: number
  actions: number
  events: Ev[] | null
}
type Data = {
  total_sessions: number
  /** Personas distintas (visitas unidas por el código anónimo). Ausente si falta ejecutar el SQL 50. */
  visitors?: number
  returning?: number
  with_account: number
  bounced: number
  avg_pages: number | null
  landings: { path: string; n: number }[]
  top_pages: { path: string; name: string | null; n: number }[]
  sessions: Session[]
}

const SOURCE_LABELS: Record<string, string> = {
  search: "Google",
  direct: "Directo",
  instagram: "Instagram",
  tiktok: "TikTok",
  social: "Redes",
  messaging: "WhatsApp / Telegram",
  invite: "Invitación",
  pwa: "App instalada",
}
const sourceLabel = (s: string | null) => (s ? SOURCE_LABELS[s] || s.replace(/^other:/, "") : "—")

const EVENT_LABELS: Record<string, string> = {
  session_start: "Entra en",
  page_nav: "Va a",
  page_view: "Ve la ficha",
  tickets_click: "Pulsa entradas",
  directions_click: "Pulsa cómo llegar",
  website_click: "Abre la web del local",
  instagram_click: "Abre Instagram",
  tiktok_click: "Abre TikTok",
  share_click: "Comparte",
  favorite_click: "Guarda en favoritos",
  ride_click: "Pide taxi / VTC",
  search: "Busca",
  filter_used: "Usa filtros",
  party_poll_vote: "Vota la encuesta",
  top_pick_click: "Pulsa el Top 3",
  tab_open: "Abre la pestaña",
  nearby_click: "Va a un sitio cercano:",
  related_click: "Va a un local parecido:",
  join_click: "Aviso de registro, pulsa:",
  join_view: "Ve el aviso de registro",
  join_dismiss: "Cierra el aviso de registro",
  signup_view: "Abre el registro",
  signup_email_open: "Elige registrarse con email",
  signup_submit: "Envía el registro",
  signup_ok: "Registro completado",
  signup_error: "Error en el registro:",
  google_click: "Pulsa Continuar con Google",
  confirm_age_view: "Ve la confirmación de edad",
  confirm_age_done: "Confirma su edad",
  next_click: "Sigue la noche:",
  welcome_click: "Reto de bienvenida:",
  install_click: "Pulsa instalar la app",
  install_choice: "Aviso de instalar:",
  app_installed: "Instala la app (confirmado)",
}
const JOIN_TO: Record<string, string> = {
  google: "Continuar con Google", signup: "Crear cuenta con email", login: "Ya tengo cuenta", open: "Abierto ahora", map: "Mapa", plan: "Planifica tu noche", events: "Eventos",
}
const NEXT_TO: Record<string, string> = { hood: "más locales del barrio", style: "más locales del estilo", plan: "Planifica tu noche", events: "todos los eventos" }
const WELCOME_TO: Record<string, string> = { search: "Buscar sitios", month: "Ver mi mes", dismiss: "Ahora no" }
const SIGNUP_REASONS: Record<string, string> = {
  fill_all: "faltan campos", disposable_email: "correo temporal", weak_password: "contraseña débil",
  birth_date: "sin fecha de nacimiento", under_18: "menor de 18", terms: "no acepta los términos", age_check: "no confirma +18",
}

// Detalle de los eventos nuevos del embudo de registro y de la ficha (null = lo resuelve la cadena de abajo).
function extraDetail(e: Ev): string | null {
  const to = String(e.meta?.to ?? "")
  const reason = String(e.meta?.reason ?? "")
  if (e.type === "next_click") return NEXT_TO[to] || to
  if (e.type === "welcome_click") return WELCOME_TO[to] || to
  if (e.type === "signup_error") return e.meta?.step === "auth" ? `el servidor dice «${reason}»` : SIGNUP_REASONS[reason] || reason
  if (e.type === "signup_ok") return e.meta?.confirm_email ? "(debe confirmar el correo)" : "(ya con sesión)"
  if (e.type === "google_click") return ({ login: "(en Iniciar sesión)", wall: "(en una zona privada)", modal: "(en el aviso de registro)", join: "(en el aviso de la ficha)" } as Record<string, string>)[String(e.meta?.from ?? "")] ?? "(en Crear cuenta)"
  if (e.type === "share_click" && e.meta?.via === "whatsapp") return "por WhatsApp"
  if (e.type === "install_choice") return e.meta?.outcome === "accepted" ? "lo acepta" : "lo rechaza"
  if (e.type === "install_click") return ({ menu: "(desde el menú ☰)", profile: "(desde Perfil)", welcome: "(desde «Tu primer reto»)", join: "(desde «¿Aún no estás dentro?»)" } as Record<string, string>)[String(e.meta?.from ?? "")] ?? ""
  if (e.type.startsWith("signup_") || e.type.startsWith("confirm_age_") || e.type === "join_view" || e.type === "join_dismiss" || e.type === "install_click") return ""
  return null
}

const TAB_LABELS: Record<string, string> = { about: "Información", nights: "Noches", sessions: "Sesiones", location: "Ubicación", reviews: "Opiniones" }

function unslug(s: string) {
  const t = decodeURIComponent(s).replace(/-/g, " ")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Nombre legible de cada ruta.
function pageLabel(path: string | null, names: Map<string, string>): string {
  if (!path) return "—"
  if (names.has(path)) return names.get(path)!
  const p = path.replace(/\/+$/, "") || "/"
  const fixed: Record<string, string> = {
    "/": "Portada", "/clubs": "Lista de clubs", "/events": "Eventos", "/map": "Mapa", "/plan": "Planifica tu noche",
    "/essentials": "Esenciales", "/favorites": "Favoritos", "/profile": "Perfil", "/login": "Iniciar sesión",
    "/signup": "Registro", "/contact": "Contacto", "/faq": "Preguntas frecuentes", "/club-noctua": "Club Noctua",
    "/opinion": "Opinión de la web", "/privacy": "Privacidad", "/terms": "Términos", "/invitar": "Invitar amigos",
    "/recuperar": "Recuperar contraseña", "/confirm-age": "Confirmar edad",
  }
  if (fixed[p]) return fixed[p]
  const m = p.match(/^\/(clubs|event|club-event|barrio|musica|essentials|plan)\/(.+)$/)
  if (m) {
    const kind = { clubs: "Club", event: "Evento", "club-event": "Noche de club", barrio: "Barrio", musica: "Música", essentials: "Esenciales", plan: "Plan compartido" }[m[1]]
    return m[1] === "club-event" || m[1] === "plan" ? `${kind} ${m[2]}` : `${kind}: ${unslug(m[2])}`
  }
  return p
}

const PERIODS = [
  { key: 1, label: "Hoy" },
  { key: 7, label: "7 días" },
  { key: 30, label: "30 días" },
]

const madridDay = (offset: number) => new Date(Date.now() - offset * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })

export default function AdminVisitsPage() {
  const [checking, setChecking] = useState(true)
  const [days, setDays] = useState(7)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [onlyActive, setOnlyActive] = useState(false)
  const [source, setSource] = useState("all")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!isAdminEmail(data.session?.user.email)) {
        window.location.href = "/"
        return
      }
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (checking) return
    setData(null)
    setError(false)
    supabase.rpc("admin_sessions", { p_from: madridDay(days - 1), p_to: madridDay(0), p_limit: 400 }).then(({ data, error }) => {
      if (error) setError(true)
      else setData(data as Data)
    })
  }, [checking, days])

  // Nombres reales de las fichas (vienen en los eventos page_view).
  const names = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of data?.sessions || []) for (const e of s.events || []) if (e.type === "page_view" && e.path && e.name) m.set(e.path, e.name)
    for (const p of data?.top_pages || []) if (p.name) m.set(p.path, p.name)
    return m
  }, [data])

  // Embudo de registro (27/10/2026): en cuántas visitas ocurre cada paso, sacado de los eventos de
  // cada visita (no hace falta SQL nuevo). Un paso no incluye al anterior: p. ej. se puede abrir el
  // registro sin haber visto el bloque (enlace directo, menú, Google).
  const funnel = useMemo(() => {
    const sessions = data?.sessions || []
    const has = (s: Session, type: string, pred?: (e: Ev) => boolean) => (s.events || []).some((e) => e.type === type && (!pred || pred(e)))
    const count = (type: string, pred?: (e: Ev) => boolean) => sessions.filter((s) => has(s, type, pred)).length
    const errors = new Map<string, number>()
    for (const s of sessions)
      for (const e of s.events || []) {
        if (e.type !== "signup_error") continue
        const reason = String(e.meta?.reason ?? "")
        const label = e.meta?.step === "auth" ? `Servidor: ${reason}` : SIGNUP_REASONS[reason] || reason
        errors.set(label, (errors.get(label) || 0) + 1)
      }
    // Instalar la app (27/10/2026). Android da el recuento real ("appinstalled"); iPhone no avisa, solo
    // se ve cuando alguien abre la web desde el icono (origen "pwa").
    const install = [
      { label: "Pulsan «Instalar»", n: count("install_click") },
      { label: "Aceptan el aviso del navegador", n: count("install_choice", (e) => e.meta?.outcome === "accepted") },
      { label: "Rechazan el aviso", n: count("install_choice", (e) => e.meta?.outcome === "dismissed") },
      { label: "App instalada (lo confirma el móvil)", n: count("app_installed") },
      { label: "Abren la web desde el icono de la app", n: sessions.filter((s) => s.source === "pwa").length },
    ]
    return {
      install,
      rows: [
        { label: "Ven el aviso de registro (ficha)", n: count("join_view") },
        { label: "Lo cierran (cruz o «Ahora no»)", n: count("join_dismiss") },
        { label: "Pulsan «Continuar con Google» en el aviso", n: count("join_click", (e) => e.meta?.to === "google") },
        { label: "Pulsan «Crear cuenta con email» en el aviso", n: count("join_click", (e) => e.meta?.to === "signup") },
        { label: "Abren el formulario de registro", n: count("signup_view") },
        { label: "Pulsan «Continuar con Google»", n: count("google_click") },
        { label: "Eligen registrarse con email", n: count("signup_email_open") },
        { label: "Envían el formulario", n: count("signup_submit") },
        { label: "Registro completado", n: count("signup_ok") },
        { label: "Confirman la edad (tras el correo o Google)", n: count("confirm_age_done") },
      ],
      errors: Array.from(errors, ([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n),
    }
  }, [data])

  const sources = useMemo(() => Array.from(new Set((data?.sessions || []).map((s) => s.source || "direct"))), [data])
  const list = (data?.sessions || []).filter(
    (s) => (!onlyActive || s.pages > 1 || s.actions > 0) && (source === "all" || (s.source || "direct") === source)
  )

  // Visitas de la misma persona (mismo código anónimo del día) en una sola fila. El orden es el de la
  // visita más reciente de cada persona; dentro de cada grupo, de la más antigua a la más reciente.
  const byKey = new Map<string, Session[]>()
  for (const s of list) {
    const key = s.visitor || `solo:${s.id}:${s.started_at}`
    const g = byKey.get(key)
    if (g) g.push(s)
    else byKey.set(key, [s])
  }
  const groups = Array.from(byKey.values()).map((g) => [...g].reverse())

  if (checking) {
    return (
      <AdminShell title="Visitas">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? "bg-white text-black" : "border border-white/10 text-zinc-300 hover:bg-white/5"}`
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

  return (
    <AdminShell title="Visitas" subtitle="Cada visita a la web, con o sin cuenta: de dónde llega, por qué página entra y qué hace después.">
      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" className={chip(days === p.key)} onClick={() => setDays(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-warn/40 bg-warn/10 p-5 text-sm text-warn">
          Falta ejecutar supabase/44_recorridos_de_visitas.sql en Supabase.
        </div>
      )}

      {!data && !error ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />
      ) : data ? (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {data.visitors !== undefined ? (
              <Kpi label="Personas distintas" value={String(data.visitors)} sub={`${data.total_sessions} visitas · ${data.returning ?? 0} con varias visitas`} />
            ) : (
              <Kpi label="Visitas" value={String(data.total_sessions)} />
            )}
            <Kpi label="Con cuenta" value={`${data.with_account}`} sub={`${pct(data.with_account, data.total_sessions)} % de las visitas`} />
            <Kpi label="Se van sin hacer nada" value={`${pct(data.bounced, data.total_sessions)} %`} sub={`${data.bounced} visitas de una sola página`} />
            <Kpi label="Páginas por visita" value={data.avg_pages ? String(data.avg_pages).replace(".", ",") : "—"} />
          </dl>
          <p className="mt-2 text-xs text-zinc-500">
            {data.visitors !== undefined
              ? "«Persona» = visitas unidas por un código anónimo del día (IP + navegador, sin guardar nada en el móvil de nadie). Si alguien cambia de wifi a datos cuenta como otra; si dos personas comparten IP y navegador, como una. Las visitas anteriores al 29/10/2026 no tienen código y cuentan una a una. "
              : "Para unir las visitas de la misma persona falta ejecutar supabase/50_visitante_anonimo.sql en Supabase. "}
            El recorrido página a página se guarda desde el 26/10/2026: las visitas anteriores solo muestran la página de entrada, las fichas vistas y los clics.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <TopList title="Por dónde entran" rows={data.landings.map((l) => ({ label: pageLabel(l.path, names), n: l.n }))} total={data.total_sessions} />
            <TopList title="Páginas más vistas (visitas que pasan por ellas)" rows={data.top_pages.map((p) => ({ label: pageLabel(p.path, names), n: p.n }))} total={data.total_sessions} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TopList title="Registro: dónde se cae la gente (visitas)" rows={funnel.rows} total={data.total_sessions} />
            <TopList title="Por qué fallan los registros" rows={funnel.errors} total={Math.max(1, ...funnel.errors.map((r) => r.n))} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TopList title="Instalar la app (visitas)" rows={funnel.install} total={data.total_sessions} />
            <p className="self-center text-xs leading-relaxed text-zinc-500">
              Android avisa cuando alguien instala la app ("App instalada"). iPhone no avisa de nada: allí solo se ve cuando la persona abre la web desde el
              icono. Cuenta desde que se publica este cambio (27/10/2026) y no incluye tus propias visitas.
            </p>
          </div>
          {data.total_sessions > data.sessions.length && (
            <p className="mt-2 text-xs text-zinc-500">El embudo cuenta las {data.sessions.length} visitas más recientes de las {data.total_sessions}.</p>
          )}

          <div className="mb-3 mt-8 flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-base font-black">Visita a visita</h2>
            <button type="button" className={chip(source === "all")} onClick={() => setSource("all")}>
              Todas
            </button>
            {sources.map((s) => (
              <button key={s} type="button" className={chip(source === s)} onClick={() => setSource(s)}>
                {sourceLabel(s)}
              </button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-300">
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="accent-[#8b5cf6]" />
              Solo las que hacen algo
            </label>
          </div>

          {list.length === 0 ? (
            <p className="rounded-2xl border border-white/10 p-8 text-center text-sm text-zinc-400">No hay visitas con estos filtros.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10">
              {groups.map((g) => (
                <VisitRow key={g[0].id + g[0].started_at} sessions={g} days={days} names={names} open={open} setOpen={setOpen} />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </AdminShell>
  )
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })
const dayShort = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" })

// Recorrido de una visita: qué hizo, en orden.
function Timeline({ s, names }: { s: Session; names: Map<string, string> }) {
  return (
    <>
      {s.user_id && (
        <Link href={`/admin/actividad?user=${s.user_id}`} className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-soft hover:underline">
          <User size={13} /> Ver toda la actividad de @{s.username || "este usuario"}
        </Link>
      )}
      <ol className="relative ml-2 space-y-2 border-l border-white/10 pl-4">
        {(s.events || []).map((e, i) => (
          <li key={i} className="text-xs">
            <span className="absolute -left-[4.5px] mt-1.5 h-2 w-2 rounded-full bg-brand/70" aria-hidden="true" />
            <span className="tabular-nums text-zinc-500">
              {new Date(e.t).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>{" "}
            <span className="text-zinc-300">{EVENT_LABELS[e.type] || e.type}</span>{" "}
            <span className="font-semibold text-ink">
              {extraDetail(e) ?? (e.type === "tab_open"
                ? `${TAB_LABELS[String(e.meta?.tab)] || String(e.meta?.tab || "")} (${e.name || ""})`
                : e.type === "join_click" && e.meta?.to
                  ? JOIN_TO[String(e.meta.to)] || String(e.meta.to)
                : (e.type === "nearby_click" || e.type === "related_click") && e.meta?.to
                  ? String(e.meta.to) === "map" ? "el mapa" : String(e.meta.to) === "events" ? "todos los eventos" : String(e.meta.to)
                  : e.type === "search" || e.type === "filter_used"
                ? e.name
                  ? `«${e.name}»${e.results !== null ? ` (${e.results} resultados)` : ""}`
                  : ""
                : e.type.endsWith("_click") || e.type === "page_view"
                  ? e.name || pageLabel(e.path, names)
                  : pageLabel(e.path, names))}
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

// Una fila de "Visita a visita": una visita suelta o, si varias comparten el código anónimo del día
// (la misma persona saltando de un local a otro, volviendo desde Google...), todas juntas.
function VisitRow({
  sessions, days, names, open, setOpen,
}: {
  sessions: Session[]
  days: number
  names: Map<string, string>
  open: string | null
  setOpen: (k: string | null) => void
}) {
  const first = sessions[0]
  const last = sessions[sessions.length - 1]
  const many = sessions.length > 1
  const key = (many ? "g:" : "") + first.id + first.started_at
  const isOpen = open === key
  const Dev = last.device === "mobile" ? Smartphone : Monitor
  const pages = sessions.reduce((n, x) => n + x.pages, 0)
  const actions = sessions.reduce((n, x) => n + x.actions, 0)
  const sourcesTxt = Array.from(new Set(sessions.map((x) => sourceLabel(x.source)))).join(" + ")
  const username = sessions.find((x) => x.username)?.username
  const spanMin = (new Date(last.started_at).getTime() - new Date(first.started_at).getTime()) / 60000
  // «A (×2) → B»: las entradas seguidas a la misma página se juntan.
  const parts: { n: string; c: number }[] = []
  for (const x of sessions) {
    const n = pageLabel(x.landing, names)
    const prev = parts[parts.length - 1]
    if (prev && prev.n === n) prev.c++
    else parts.push({ n, c: 1 })
  }
  const title = many ? parts.map((x) => (x.c > 1 ? `${x.n} (×${x.c})` : x.n)).join(" → ") : pageLabel(last.landing, names)
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(isOpen ? null : key)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <span className="w-14 shrink-0 text-xs tabular-nums text-zinc-500">
          {hhmm(last.started_at)}
          {days > 1 && <span className="block">{dayShort(last.started_at)}</span>}
        </span>
        <Dev size={16} className="shrink-0 text-zinc-400" aria-label={last.device === "mobile" ? "Móvil" : "Ordenador"} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{title}</span>
          <span className="block truncate text-xs text-zinc-400">
            {many ? (
              <>
                {sourcesTxt} · {sessions.length} visitas · {pages} {pages === 1 ? "página" : "páginas"}
                {actions > 0 && ` · ${actions} ${actions === 1 ? "acción" : "acciones"}`}
                {spanMin >= 1 ? ` · de ${hhmm(first.started_at)} a ${hhmm(last.started_at)}` : ` · en el mismo minuto`}
              </>
            ) : (
              <>
                {sourceLabel(last.source)} · {last.pages} {last.pages === 1 ? "página" : "páginas"}
                {last.actions > 0 && ` · ${last.actions} ${last.actions === 1 ? "acción" : "acciones"}`}
                {last.minutes >= 1 && ` · ${Math.round(last.minutes)} min`}
              </>
            )}
            {username && ` · @${username}`}
          </span>
        </span>
        {many && (
          <span className="shrink-0 rounded-full bg-brand/20 px-2 py-0.5 text-[11px] font-bold text-brand-soft" title="Varias visitas de la misma persona">
            <span className="sm:hidden">×{sessions.length}</span>
            <span className="hidden sm:inline">Misma persona</span>
          </span>
        )}
        <ChevronDown size={16} className={`shrink-0 text-zinc-500 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="bg-black/20 px-4 pb-4 pt-1">
          {many ? (
            <>
              <p className="pb-1 pt-2 text-[11px] leading-snug text-zinc-500">
                Mismo código anónimo del día{first.visitor ? ` (${first.visitor.slice(0, 6)})` : ""}: misma IP y mismo navegador. Si cambió de wifi a datos aparecería como otra persona.
              </p>
              {sessions.map((x) => (
                <div key={x.id + x.started_at} className="mt-3 first:mt-1">
                  <p className="mb-2 text-xs font-bold text-zinc-300">
                    {hhmm(x.started_at)} · {pageLabel(x.landing, names)}{" "}
                    <span className="font-normal text-zinc-500">
                      ({sourceLabel(x.source)}, {x.pages} {x.pages === 1 ? "página" : "páginas"})
                    </span>
                  </p>
                  <Timeline s={x} names={names} />
                </div>
              ))}
            </>
          ) : (
            <Timeline s={first} names={names} />
          )}
        </div>
      )}
    </li>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-1 font-display text-2xl tabular-nums text-ink">{value}</dd>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
    </div>
  )
}

function TopList({ title, rows, total }: { title: string; rows: { label: string; n: number }[]; total: number }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-black">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Todavía nada.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 10).map((r, i) => (
            <li key={r.label + i}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate text-zinc-200">{r.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-400">{r.n}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-purple-400/70" style={{ width: `${total ? Math.max(3, (r.n / total) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
