// Copia de seguridad de Noctua para el plan Free de Supabase, que no hace copias automáticas.
//
// Uso (desde la carpeta del proyecto):   npm run backup      (o:  node scripts/backup-noctua.mjs)
//
// Qué guarda, dentro de backups/noctua-AAAA-MM-DD_HHMM/:
//   - tablas/<tabla>.json   todas las filas de todas las tablas de la API (clubs, eventos, usuarios de la app, opiniones, favoritos…)
//   - usuarios-auth.json    las cuentas de acceso (correo, fechas, proveedor). No incluye contraseñas: Supabase no las entrega.
//   - manifiesto.json       filas por tabla, fotos, avisos y errores
//   - LEEME.txt             qué hay dentro y cómo se usa
// Y, aparte, en backups/storage/<bucket>/…: espejo de las fotos de Storage. Es incremental: solo baja lo que falta o ha
// cambiado, y nunca borra lo que ya tenías (así una foto borrada por error se puede recuperar). Los nombres larguísimos se
// acortan (Windows no admite rutas de más de 260 caracteres) y su equivalencia queda en storage/_nombres-originales.json.
//
// No guarda la estructura de la base de datos (tablas, políticas RLS, funciones): esa vive en supabase/NN_*.sql.
//
// Opciones:
//   --sin-fotos            no toca Storage (la copia sale mucho más rápido)
//   --sin=a,b              tablas que se saltan (p. ej. --sin=analytics,analytics_bots)
//   --tablas=a,b           solo esas tablas
//   --carpeta=RUTA         dónde guardar (por defecto, backups/ dentro del proyecto; conviene un disco externo o una nube)
//
// Claves: lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno o del .env.local del proyecto (las mismas que
// ya usa la web en el servidor). Nunca las imprime ni las guarda. La copia contiene datos personales: backups/ está en
// .gitignore y no debe subirse a GitHub.

import { createHash } from "node:crypto"
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Entorno ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Lee un archivo .env (CLAVE=valor, con comillas y comentarios opcionales). */
export function leerEnv(texto) {
  const salida = {}
  for (const linea of String(texto).split(/\r?\n/)) {
    const m = linea.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    const valor = m[2].trim()
    // Con comillas, vale lo de dentro (y lo que venga detrás, p. ej. un comentario, se ignora); sin comillas, se quita el «# comentario».
    const entreComillas = valor.match(/^(["'])(.*?)\1\s*(?:#.*)?$/)
    salida[m[1]] = entreComillas ? entreComillas[2] : valor.replace(/\s+#.*$/, "")
  }
  return salida
}

/** Devuelve el motivo si la clave no sirve para copiar (p. ej. es la pública), o null si parece correcta. */
export function problemaConLaClave(clave) {
  if (!clave) return "falta SUPABASE_SERVICE_ROLE_KEY"
  if (clave.startsWith("sb_publishable_")) return "esa es la clave pública (publishable); hace falta la de servicio (secret)"
  if (clave.startsWith("eyJ")) {
    try {
      const carga = JSON.parse(Buffer.from(clave.split(".")[1], "base64url").toString("utf8"))
      if (carga.role && carga.role !== "service_role") return `la clave es del rol «${carga.role}»; hace falta la de servicio (service_role)`
    } catch {
      // No se puede leer por dentro: se prueba tal cual y, si no vale, la API contestará 401.
    }
  }
  return null
}

// ─── Cliente HTTP con reintentos ────────────────────────────────────────────────────────────────────────────────────

export function crearCliente({ url, clave, fetchFn = fetch, esperaMs = 800, intentos = 4 }) {
  const base = url.replace(/\/+$/, "")
  const cabeceras = { apikey: clave, "User-Agent": "noctua-backup/1.0" }
  // Las claves nuevas (sb_secret_…) van solo en «apikey»; las antiguas son un JWT y también van como Bearer.
  if (clave.startsWith("eyJ")) cabeceras.Authorization = `Bearer ${clave}`

  async function pedir(ruta, { metodo = "GET", cuerpo, extra = {} } = {}) {
    let ultimoError = "sin respuesta del servidor"
    for (let i = 0; i < intentos; i++) {
      try {
        const res = await fetchFn(base + ruta, {
          method: metodo,
          headers: { ...cabeceras, ...(cuerpo ? { "Content-Type": "application/json" } : {}), ...extra },
          body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        })
        if (res.status !== 429 && res.status < 500) return res
        ultimoError = `HTTP ${res.status}`
      } catch {
        ultimoError = "sin respuesta del servidor"
      }
      if (i < intentos - 1) await dormir(esperaMs * 2 ** i)
    }
    // El mensaje lleva solo la ruta (sin parámetros) y nunca la clave.
    throw new Error(`${ultimoError} en ${ruta.split("?")[0]}`)
  }

  return { pedir, base }
}

// ─── Tablas ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Lista las tablas (y vistas) que expone la API, con la columna por la que ordenar (la clave primaria, si la hay). */
export async function descubrirTablas(cliente) {
  const res = await cliente.pedir("/rest/v1/", { extra: { Accept: "application/openapi+json" } })
  if (!res.ok) {
    throw new Error(`No pude leer la lista de tablas (HTTP ${res.status}). Comprueba que SUPABASE_SERVICE_ROLE_KEY es la clave de servicio.`)
  }
  const doc = await res.json()
  const definiciones = doc.definitions || doc.components?.schemas || {}
  const tablas = Object.entries(definiciones).map(([nombre, def]) => {
    const props = def?.properties || {}
    const pk = Object.entries(props)
      .filter(([, p]) => typeof p?.description === "string" && p.description.includes("<pk/>"))
      .map(([columna]) => columna)
    return { nombre, orden: pk.length ? pk : Object.keys(props).slice(0, 1) }
  })
  if (tablas.length === 0) throw new Error("La API no devolvió ninguna tabla.")
  return tablas.sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** Baja todas las filas de una tabla, página a página, y las escribe como un JSON válido (una fila por línea). */
export async function exportarTabla(cliente, { nombre, orden }, archivo, { pagina = 1000 } = {}) {
  const ordenParam = orden.length ? `&order=${orden.map((c) => `${encodeURIComponent(c)}.asc`).join(",")}` : ""
  writeFileSync(archivo, "[\n")
  let filas = 0
  let total = null
  while (true) {
    const extra = filas === 0 ? { Prefer: "count=exact" } : {}
    const res = await cliente.pedir(`/rest/v1/${encodeURIComponent(nombre)}?select=*${ordenParam}&limit=${pagina}&offset=${filas}`, { extra })
    if (res.status === 416) break // pasado el final
    if (!res.ok) throw new Error(`HTTP ${res.status} leyendo la tabla ${nombre}`)
    if (filas === 0) {
      const m = (res.headers.get("content-range") || "").match(/\/(\d+)$/)
      if (m) total = Number(m[1])
    }
    const lote = await res.json()
    if (!Array.isArray(lote)) throw new Error(`Respuesta inesperada en la tabla ${nombre}`)
    if (lote.length === 0) break
    // Cada fila lleva la coma delante, salvo la primera de toda la tabla.
    appendFileSync(archivo, lote.map((fila, i) => (filas + i === 0 ? "" : ",\n") + JSON.stringify(fila)).join(""))
    filas += lote.length
    // Se sigue hasta una página vacía o hasta llegar al total: el servidor puede recortar el tamaño de página.
    if (total !== null && filas >= total) break
  }
  appendFileSync(archivo, "\n]\n")
  return { filas, total }
}

// ─── Usuarios de acceso ─────────────────────────────────────────────────────────────────────────────────────────────

export async function exportarUsuarios(cliente, archivo, { porPagina = 1000 } = {}) {
  const todos = []
  for (let pagina = 1; ; pagina++) {
    const res = await cliente.pedir(`/auth/v1/admin/users?page=${pagina}&per_page=${porPagina}`)
    if (!res.ok) throw new Error(`HTTP ${res.status} leyendo los usuarios de acceso`)
    const cuerpo = await res.json()
    const usuarios = Array.isArray(cuerpo) ? cuerpo : cuerpo.users || []
    todos.push(...usuarios)
    if (usuarios.length < porPagina) break
  }
  writeFileSync(archivo, JSON.stringify(todos, null, 1))
  return { filas: todos.length }
}

// ─── Storage (fotos) ────────────────────────────────────────────────────────────────────────────────────────────────

const CARACTERES_NO_VALIDOS = /[<>:"|?*\u0000-\u001f]/g
// Windows no guarda rutas de más de 260 caracteres y algunas fotos (las de event-photos) tienen nombres de 400. Todo trozo de
// ruta de más de MAX_TROZO caracteres se acorta a «principio~huella.ext»; es estable (mismo nombre => mismo resultado), así
// que la copia incremental sigue funcionando, y las equivalencias quedan en storage/_nombres-originales.json.
const MAX_TROZO = 80
const MAX_RUTA = 240
const huellaDe = (texto, n) => createHash("sha1").update(texto).digest("hex").slice(0, n)
const extensionDe = (nombre) => (nombre.match(/\.[A-Za-z0-9]{1,5}$/) || [""])[0]

function acortar(trozo) {
  if (trozo.length <= MAX_TROZO) return trozo
  return `${trozo.slice(0, 50)}~${huellaDe(trozo, 10)}${extensionDe(trozo)}`
}

/** Ruta local dentro de la carpeta de fotos; nunca sale de ella aunque el nombre del objeto lleve «..» o caracteres raros. */
export function rutaLocalSegura(raiz, bucket, ruta) {
  const limpiar = (s) => s.replace(CARACTERES_NO_VALIDOS, "_").replace(/[. ]+$/, "_")
  const trozos = [bucket, ...ruta.split("/")].filter((s) => s && s !== "." && s !== "..").map(limpiar).map(acortar)
  let destino = resolve(raiz, ...trozos)
  // Si aun así la ruta completa es larguísima (carpetas muy anidadas), el archivo pasa a llamarse solo por su huella.
  if (destino.length > MAX_RUTA && trozos.length > 1) {
    const ultimo = trozos[trozos.length - 1]
    destino = resolve(raiz, ...trozos.slice(0, -1), `${huellaDe(trozos.join("/"), 16)}${extensionDe(ultimo)}`)
  }
  const base = resolve(raiz) + sep
  if (!destino.startsWith(base)) throw new Error("Ruta de archivo fuera de la carpeta de copia")
  return destino
}

async function listarCarpeta(cliente, bucket, prefijo, salida) {
  for (let offset = 0; ; ) {
    const res = await cliente.pedir(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      metodo: "POST",
      cuerpo: { prefix: prefijo, limit: 1000, offset, sortBy: { column: "name", order: "asc" } },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} listando el bucket ${bucket}`)
    const elementos = await res.json()
    for (const el of elementos) {
      if (el.id == null) await listarCarpeta(cliente, bucket, `${prefijo}${el.name}/`, salida) // carpeta
      else salida.push({ ruta: `${prefijo}${el.name}`, tamano: el.metadata?.size ?? null })
    }
    if (elementos.length < 1000) break
    offset += elementos.length
  }
}

async function enParalelo(elementos, n, fn) {
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, elementos.length) }, async () => {
      while (i < elementos.length) await fn(elementos[i++])
    })
  )
}

/** Espejo incremental de Storage: baja lo que falta o ha cambiado de tamaño; no borra nada. */
export async function sincronizarStorage(cliente, raiz, { log = () => {}, paralelo = 4 } = {}) {
  const res = await cliente.pedir("/storage/v1/bucket")
  if (!res.ok) throw new Error(`HTTP ${res.status} listando los buckets de Storage`)
  const buckets = (await res.json()).map((b) => b.name)
  const resumen = { buckets: buckets.length, archivos: 0, descargados: 0, omitidos: 0, bytes: 0, renombrados: 0, errores: [] }
  const archivoNombres = join(raiz, "_nombres-originales.json")
  let nombres = {}
  try {
    nombres = JSON.parse(readFileSync(archivoNombres, "utf8"))
  } catch {
    // Primera copia: todavía no hay equivalencias.
  }
  for (const bucket of buckets) {
    const archivos = []
    await listarCarpeta(cliente, bucket, "", archivos)
    resumen.archivos += archivos.length
    const pendientes = []
    for (const a of archivos) {
      const local = rutaLocalSegura(raiz, bucket, a.ruta)
      const relativa = relative(raiz, local).split(sep).join("/")
      if (relativa !== `${bucket}/${a.ruta}`) {
        nombres[relativa] = `${bucket}/${a.ruta}`
        resumen.renombrados++
      }
      if (a.tamano !== null && existsSync(local) && statSync(local).size === a.tamano) resumen.omitidos++
      else pendientes.push({ ...a, local })
    }
    log(`  fotos ${bucket}: ${archivos.length} archivos, ${pendientes.length} por bajar`)
    await enParalelo(pendientes, paralelo, async (a) => {
      try {
        const ruta = a.ruta.split("/").map(encodeURIComponent).join("/")
        const r = await cliente.pedir(`/storage/v1/object/${encodeURIComponent(bucket)}/${ruta}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const datos = Buffer.from(await r.arrayBuffer())
        mkdirSync(dirname(a.local), { recursive: true })
        writeFileSync(a.local, datos)
        resumen.descargados++
        resumen.bytes += datos.length
      } catch (e) {
        // Los errores de disco traen la ruta entera en el mensaje (a veces de 400 caracteres): solo se guarda el código.
        resumen.errores.push(`${bucket}/${a.ruta}: ${e.code ? `no se pudo guardar en disco (${e.code})` : e.message}`)
      }
    })
  }
  if (Object.keys(nombres).length > 0) {
    mkdirSync(raiz, { recursive: true })
    writeFileSync(archivoNombres, JSON.stringify(nombres, null, 1))
  }
  return resumen
}

// ─── Copia completa ─────────────────────────────────────────────────────────────────────────────────────────────────

const dos = (n) => String(n).padStart(2, "0")
export const etiquetaDeFecha = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}_${dos(d.getHours())}${dos(d.getMinutes())}`

const LEEME = `Copia de seguridad de Noctua

tablas/            Una tabla por archivo (JSON). Cada archivo es una lista con todas las filas tal como estaban.
usuarios-auth.json Cuentas de acceso (correo, fechas, proveedor). Supabase no entrega las contraseñas.
manifiesto.json    Filas por tabla, fotos, avisos y errores de esta copia.

Las fotos están en ../storage/<bucket>/, comunes a todas las copias (se van completando, no se borra nada).
La estructura de la base de datos (tablas, políticas de seguridad, funciones) no está aquí: está en supabase/NN_*.sql del proyecto.

Contiene datos personales: no la subas a GitHub ni la compartas. Guarda además una copia fuera de este ordenador.
`

/** Hace la copia completa y devuelve el manifiesto; \`ok\` es false si alguna parte falló. */
export async function copiaDeSeguridad({
  url,
  clave,
  carpeta,
  sinFotos = false,
  sin = [],
  soloTablas = null,
  fetchFn = fetch,
  esperaMs,
  ahora = () => new Date(),
  log = console.log,
}) {
  const cliente = crearCliente({ url, clave, fetchFn, esperaMs })
  // Primero se lee la lista de tablas: si la clave no vale, falla aquí y no queda una carpeta vacía.
  const todas = await descubrirTablas(cliente)
  const fecha = ahora()
  let destino = join(carpeta, `noctua-${etiquetaDeFecha(fecha)}`)
  for (let n = 2; existsSync(destino); n++) destino = join(carpeta, `noctua-${etiquetaDeFecha(fecha)}-${n}`)
  mkdirSync(join(destino, "tablas"), { recursive: true })

  const manifiesto = {
    fecha: fecha.toISOString(),
    servidor: new URL(url).host,
    tablas: [],
    usuarios: null,
    storage: null,
    advertencias: [],
    errores: [],
  }

  const elegidas = todas.filter((t) => (!soloTablas || soloTablas.includes(t.nombre)) && !sin.includes(t.nombre))
  log(`Tablas: ${elegidas.length}`)
  for (const tabla of elegidas) {
    const archivo = join("tablas", `${tabla.nombre}.json`)
    try {
      const { filas, total } = await exportarTabla(cliente, tabla, join(destino, archivo))
      manifiesto.tablas.push({ nombre: tabla.nombre, filas, totalAlEmpezar: total, archivo })
      log(`  ${tabla.nombre}: ${filas} filas`)
      if (total !== null && filas < total) {
        manifiesto.advertencias.push(`${tabla.nombre}: se bajaron ${filas} filas de ${total} (si la tabla recibe borrados mientras se copia, es normal; si no, repite la copia)`)
      }
    } catch (e) {
      manifiesto.tablas.push({ nombre: tabla.nombre, error: e.message })
      manifiesto.errores.push(`tabla ${tabla.nombre}: ${e.message}`)
      log(`  ${tabla.nombre}: ERROR (${e.message})`)
    }
  }

  try {
    const { filas } = await exportarUsuarios(cliente, join(destino, "usuarios-auth.json"))
    manifiesto.usuarios = { filas, archivo: "usuarios-auth.json" }
    log(`Usuarios de acceso: ${filas}`)
  } catch (e) {
    manifiesto.usuarios = { error: e.message }
    manifiesto.errores.push(`usuarios de acceso: ${e.message}`)
    log(`Usuarios de acceso: ERROR (${e.message})`)
  }

  if (sinFotos) {
    log("Fotos: saltadas (--sin-fotos)")
  } else {
    try {
      log("Fotos (Storage):")
      manifiesto.storage = await sincronizarStorage(cliente, join(carpeta, "storage"), { log })
      for (const e of manifiesto.storage.errores) manifiesto.errores.push(`foto ${e}`)
    } catch (e) {
      manifiesto.storage = { error: e.message }
      manifiesto.errores.push(`fotos: ${e.message}`)
      log(`  ERROR (${e.message})`)
    }
  }

  writeFileSync(join(destino, "manifiesto.json"), JSON.stringify(manifiesto, null, 2))
  writeFileSync(join(destino, "LEEME.txt"), LEEME)
  return { carpeta: destino, manifiesto, ok: manifiesto.errores.length === 0 }
}

// ─── Línea de comandos ──────────────────────────────────────────────────────────────────────────────────────────────

export function leerArgumentos(argv) {
  const opciones = { sinFotos: false, sin: [], soloTablas: null, carpeta: null, ayuda: false }
  const lista = (v) => v.split(",").map((s) => s.trim()).filter(Boolean)
  for (const a of argv) {
    if (a === "--sin-fotos") opciones.sinFotos = true
    else if (a === "--ayuda" || a === "--help" || a === "-h") opciones.ayuda = true
    else if (a.startsWith("--sin=")) opciones.sin = lista(a.slice(6))
    else if (a.startsWith("--tablas=")) opciones.soloTablas = lista(a.slice(9))
    else if (a.startsWith("--carpeta=")) opciones.carpeta = a.slice(10)
    else throw new Error(`Opción desconocida: ${a} (prueba con --ayuda)`)
  }
  return opciones
}

async function main() {
  const proyecto = join(dirname(fileURLToPath(import.meta.url)), "..")
  let opciones
  try {
    opciones = leerArgumentos(process.argv.slice(2))
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
  if (opciones.ayuda) {
    // La ayuda es el bloque de comentarios del principio del propio archivo.
    const lineas = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n")
    const fin = lineas.findIndex((l) => !l.startsWith("//"))
    console.log(lineas.slice(0, fin).map((l) => l.slice(3)).join("\n"))
    return
  }

  // El entorno manda; los archivos .env.local / .env del proyecto solo rellenan lo que falte.
  for (const nombre of [".env.local", ".env"]) {
    const archivo = join(proyecto, nombre)
    if (!existsSync(archivo)) continue
    for (const [k, v] of Object.entries(leerEnv(readFileSync(archivo, "utf8")))) if (process.env[k] === undefined) process.env[k] = v
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL (ponla en .env.local o en las variables de entorno).")
    process.exit(1)
  }
  if (!/^https:\/\//.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)) {
    console.error("NEXT_PUBLIC_SUPABASE_URL debe empezar por https://")
    process.exit(1)
  }
  const problema = problemaConLaClave(clave)
  if (problema) {
    console.error(`No puedo empezar: ${problema}. Debe estar en .env.local o en las variables de entorno; el script no la muestra ni la guarda.`)
    process.exit(1)
  }

  const carpeta = resolve(opciones.carpeta || join(proyecto, "backups"))
  console.log(`Copia de seguridad de ${new URL(url).host} → ${carpeta}`)
  const t0 = Date.now()
  const r = await copiaDeSeguridad({ url, clave, carpeta, sinFotos: opciones.sinFotos, sin: opciones.sin, soloTablas: opciones.soloTablas })
  const m = r.manifiesto
  const filas = m.tablas.reduce((s, t) => s + (t.filas || 0), 0)
  console.log(`\nListo en ${Math.round((Date.now() - t0) / 1000)} s: ${m.tablas.length} tablas (${filas} filas)${m.usuarios?.filas != null ? `, ${m.usuarios.filas} usuarios de acceso` : ""}.`)
  if (m.storage?.archivos != null) console.log(`Fotos: ${m.storage.archivos} archivos (${m.storage.descargados} nuevos, ${m.storage.omitidos} ya estaban).`)
  for (const a of m.advertencias) console.log(`Aviso: ${a}`)
  for (const e of m.errores.slice(0, 10)) console.log(`ERROR: ${e}`)
  if (m.errores.length > 10) console.log(`… y ${m.errores.length - 10} errores más (están todos en manifiesto.json)`)
  console.log(`Copia en: ${r.carpeta}`)
  console.log("Guarda además una copia fuera de este ordenador (disco externo o nube).")
  process.exit(r.ok ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(`La copia falló: ${e.message}`)
    process.exit(1)
  })
}
