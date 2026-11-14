import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

// Pruebas del script scripts/backup-noctua.mjs con un Supabase de mentira (sin red): el script se carga en dinámico
// porque es un .mjs fuera de src/.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bk: any
let tmp: string

beforeAll(async () => {
  bk = await import(/* @vite-ignore */ pathToFileURL(resolve(process.cwd(), "scripts/backup-noctua.mjs")).href)
  tmp = mkdtempSync(join(tmpdir(), "noctua-bk-"))
})
afterAll(() => rmSync(tmp, { recursive: true, force: true }))

const URL_BASE = "https://api.ejemplo.test"
const CLAVE = "sb_secret_CLAVE_MUY_SECRETA_123"

type Opciones = {
  tablas?: Record<string, Array<Record<string, unknown>>>
  maxFilasPorPagina?: number
  usuarios?: number
  falla?: string[] // tablas que siempre devuelven 500
  fallosPrevios?: number // peticiones iniciales que devuelven 503
  tamanos?: Record<string, number> // tamaño de cada archivo de Storage
}

type Init = { method?: string; headers?: Record<string, string>; body?: string }

/** Un Supabase de mentira: OpenAPI, PostgREST con páginas, usuarios de acceso y Storage. */
function falsoSupabase(op: Opciones = {}) {
  const tablas: Record<string, Array<Record<string, unknown>>> = op.tablas ?? {
    clubs: Array.from({ length: 2500 }, (_, i) => ({ id: i + 1, name: `Club ${i + 1}`, extra: { a: [1, 2] } })),
    events: [{ id: 1, title: "Festival" }],
    vacia: [],
  }
  const tamanos = op.tamanos ?? { "logo.png": 3, "1/0.jpg": 5, "1/ñandú & co.jpg": 4, "1/a:b?.jpg": 2 }
  const peticiones: Array<{ url: string; method: string; headers: Record<string, string> }> = []
  let fallosPrevios = op.fallosPrevios ?? 0

  const json = (cuerpo: unknown, estado = 200, cabeceras: Record<string, string> = {}) =>
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { "content-type": "application/json", ...cabeceras } })

  const fetchFn = async (url: string, init: Init = {}) => {
    const u = new URL(url)
    peticiones.push({ url, method: init.method ?? "GET", headers: init.headers ?? {} })
    if (fallosPrevios > 0) {
      fallosPrevios--
      return new Response("caído", { status: 503 })
    }
    if (u.pathname === "/rest/v1/") {
      const definitions: Record<string, unknown> = {}
      for (const [nombre, filas] of Object.entries(tablas)) {
        const columnas = Object.keys(filas[0] ?? { id: 0 })
        definitions[nombre] = {
          properties: Object.fromEntries(
            columnas.map((c, i) => [c, i === 0 && nombre !== "sinpk" ? { description: "Note:\nThis is a Primary Key.<pk/>" } : { type: "string" }])
          ),
        }
      }
      return json({ swagger: "2.0", definitions })
    }
    if (u.pathname.startsWith("/rest/v1/")) {
      const nombre = decodeURIComponent(u.pathname.slice("/rest/v1/".length))
      if (op.falla?.includes(nombre)) return new Response("error", { status: 500 })
      const filas = tablas[nombre]
      if (!filas) return json({ message: "no existe" }, 404)
      const limite = Math.min(Number(u.searchParams.get("limit")), op.maxFilasPorPagina ?? 1000)
      const desde = Number(u.searchParams.get("offset"))
      const trozo = filas.slice(desde, desde + limite)
      const cabeceras: Record<string, string> = {}
      if ((init.headers ?? {}).Prefer === "count=exact") cabeceras["content-range"] = filas.length === 0 ? "*/0" : `${desde}-${desde + trozo.length - 1}/${filas.length}`
      return json(trozo, 200, cabeceras)
    }
    if (u.pathname === "/auth/v1/admin/users") {
      const pagina = Number(u.searchParams.get("page"))
      const por = Number(u.searchParams.get("per_page"))
      const total = op.usuarios ?? 1500
      const todos = Array.from({ length: total }, (_, i) => ({ id: `u${i}`, email: `u${i}@ejemplo.test` }))
      return json({ users: todos.slice((pagina - 1) * por, pagina * por) })
    }
    if (u.pathname === "/storage/v1/bucket") return json([{ name: "club-photos" }, { name: "vacio" }])
    if (u.pathname === "/storage/v1/object/list/club-photos") {
      const { prefix } = JSON.parse(init.body ?? "{}")
      if (prefix === "") return json([{ name: "1", id: null }, { name: "logo.png", id: "L", metadata: { size: tamanos["logo.png"] } }])
      if (prefix === "1/") {
        return json(
          Object.entries(tamanos)
            .filter(([ruta]) => ruta.startsWith("1/"))
            .map(([ruta, size]) => ({ name: ruta.slice(2), id: ruta, metadata: { size } }))
        )
      }
      return json([])
    }
    if (u.pathname === "/storage/v1/object/list/vacio") return json([])
    if (u.pathname.startsWith("/storage/v1/object/club-photos/")) {
      const ruta = decodeURIComponent(u.pathname.slice("/storage/v1/object/club-photos/".length))
      const size = tamanos[ruta]
      if (size === undefined) return new Response("no", { status: 404 })
      return new Response(Buffer.alloc(size, 7), { status: 200 })
    }
    return new Response("?", { status: 404 })
  }
  return { fetchFn, peticiones }
}

const AHORA = () => new Date(2026, 10, 14, 13, 30)

function copiar(opciones: Record<string, unknown> = {}, falso = falsoSupabase(), carpeta = join(tmp, `c${Math.random().toString(36).slice(2)}`)) {
  const lineas: string[] = []
  const hecho = bk.copiaDeSeguridad({ url: URL_BASE, clave: CLAVE, carpeta, fetchFn: falso.fetchFn, esperaMs: 0, ahora: AHORA, log: (l: string) => lineas.push(l), ...opciones })
  return { hecho, lineas, falso, carpeta }
}

describe("copia de tablas", () => {
  it("baja todas las filas de una tabla grande y deja un JSON válido", async () => {
    const { hecho, carpeta } = copiar({ sinFotos: true })
    const r = await hecho
    const filas = JSON.parse(readFileSync(join(r.carpeta, "tablas", "clubs.json"), "utf8"))
    expect(filas).toHaveLength(2500)
    expect(filas[0]).toEqual({ id: 1, name: "Club 1", extra: { a: [1, 2] } })
    expect(filas[2499].id).toBe(2500)
    expect(new Set(filas.map((f: { id: number }) => f.id)).size).toBe(2500) // sin duplicados entre páginas
    expect(r.manifiesto.tablas.find((t: { nombre: string }) => t.nombre === "clubs")).toMatchObject({ filas: 2500, totalAlEmpezar: 2500 })
    expect(r.ok).toBe(true)
    expect(r.carpeta.startsWith(carpeta)).toBe(true)
  })

  it("si el servidor recorta el tamaño de página no se pierde ninguna fila", async () => {
    const { hecho } = copiar({ sinFotos: true }, falsoSupabase({ maxFilasPorPagina: 400 }))
    const r = await hecho
    expect(JSON.parse(readFileSync(join(r.carpeta, "tablas", "clubs.json"), "utf8"))).toHaveLength(2500)
    expect(r.manifiesto.advertencias).toEqual([])
  })

  it("una tabla vacía sale como lista vacía y válida", async () => {
    const r = await copiar({ sinFotos: true }).hecho
    expect(JSON.parse(readFileSync(join(r.carpeta, "tablas", "vacia.json"), "utf8"))).toEqual([])
  })

  it("ordena por la clave primaria, o por la primera columna si no hay", async () => {
    const falso = falsoSupabase({ tablas: { clubs: [{ id: 1, name: "a" }], sinpk: [{ zeta: 1, alfa: 2 }] } })
    await copiar({ sinFotos: true }, falso).hecho
    const urls = falso.peticiones.map((p) => p.url)
    expect(urls.some((u) => u.includes("/rest/v1/clubs?") && u.includes("order=id.asc"))).toBe(true)
    expect(urls.some((u) => u.includes("/rest/v1/sinpk?") && u.includes("order=zeta.asc"))).toBe(true)
  })

  it("respeta --sin y --tablas", async () => {
    const a = await copiar({ sinFotos: true, sin: ["clubs", "vacia"] }).hecho
    expect(a.manifiesto.tablas.map((t: { nombre: string }) => t.nombre)).toEqual(["events"])
    const b = await copiar({ sinFotos: true, soloTablas: ["events"] }).hecho
    expect(b.manifiesto.tablas.map((t: { nombre: string }) => t.nombre)).toEqual(["events"])
  })

  it("una tabla que falla no frena las demás y se anota como error", async () => {
    const r = await copiar({ sinFotos: true }, falsoSupabase({ falla: ["events"] })).hecho
    expect(r.ok).toBe(false)
    expect(r.manifiesto.errores.join(" ")).toContain("events")
    expect(existsSync(join(r.carpeta, "tablas", "clubs.json"))).toBe(true)
    expect(r.manifiesto.tablas.find((t: { nombre: string }) => t.nombre === "events")).toHaveProperty("error")
  })

  it("avisa si bajó menos filas de las que tenía la tabla", async () => {
    const tablas = { clubs: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })) }
    const falso = falsoSupabase({ tablas })
    // La tabla «encoge» a la mitad después de la primera página (borrados mientras se copia).
    const original = falso.fetchFn
    let n = 0
    const fetchFn = async (url: string, init?: Init) => {
      if (url.includes("/rest/v1/clubs?") && ++n === 2) return new Response("[]", { status: 200 })
      return original(url, init)
    }
    const r = await copiar({ sinFotos: true }, { ...falso, fetchFn }).hecho
    expect(r.manifiesto.tablas[0].filas).toBeLessThanOrEqual(10)
  })
})

describe("usuarios de acceso", () => {
  it("los baja por páginas", async () => {
    const r = await copiar({ sinFotos: true }).hecho
    const usuarios = JSON.parse(readFileSync(join(r.carpeta, "usuarios-auth.json"), "utf8"))
    expect(usuarios).toHaveLength(1500)
    expect(r.manifiesto.usuarios).toMatchObject({ filas: 1500 })
  })
})

describe("fotos (Storage)", () => {
  it("espeja los archivos, incluidas las carpetas, y adapta los nombres que Windows no admite", async () => {
    const carpeta = join(tmp, "fotos1")
    const r = await copiar({}, falsoSupabase(), carpeta).hecho
    const raiz = join(carpeta, "storage", "club-photos")
    expect(statSync(join(raiz, "logo.png")).size).toBe(3)
    expect(statSync(join(raiz, "1", "0.jpg")).size).toBe(5)
    // «:» y «?» no valen en Windows: se sustituyen por «_»; los acentos y espacios se conservan
    expect(statSync(join(raiz, "1", "ñandú & co.jpg")).size).toBe(4)
    expect(statSync(join(raiz, "1", "a_b_.jpg")).size).toBe(2)
    expect(r.manifiesto.storage).toMatchObject({ buckets: 2, archivos: 4, descargados: 4, omitidos: 0, bytes: 14 })
    expect(r.ok).toBe(true)
  })

  it("es incremental: en la segunda copia no vuelve a bajar lo que ya está y sí lo que cambió de tamaño", async () => {
    const carpeta = join(tmp, "fotos2")
    await copiar({}, falsoSupabase(), carpeta).hecho
    // Segunda copia, otro minuto para que sea otra carpeta de datos
    const falso2 = falsoSupabase({ tamanos: { "logo.png": 3, "1/0.jpg": 9, "1/ñandú & co.jpg": 4, "1/a:b?.jpg": 2 } })
    const r2 = await copiar({ ahora: () => new Date(2026, 10, 14, 13, 31) }, falso2, carpeta).hecho
    const descargas = falso2.peticiones.filter((p) => p.url.includes("/storage/v1/object/club-photos/"))
    expect(descargas).toHaveLength(1) // solo 1/0.jpg, que pasó de 5 a 9 bytes
    expect(r2.manifiesto.storage).toMatchObject({ descargados: 1, omitidos: 3 })
    expect(statSync(join(carpeta, "storage", "club-photos", "1", "0.jpg")).size).toBe(9)
  })

  it("--sin-fotos no toca Storage", async () => {
    const falso = falsoSupabase()
    await copiar({ sinFotos: true }, falso).hecho
    expect(falso.peticiones.some((p) => p.url.includes("/storage/"))).toBe(false)
  })

  it("un archivo que no se puede bajar se anota y no frena el resto", async () => {
    const falso = falsoSupabase()
    const original = falso.fetchFn
    const fetchFn = async (url: string, init?: Init) =>
      url.includes("/object/club-photos/logo.png") ? new Response("no", { status: 403 }) : original(url, init)
    const r = await copiar({}, { ...falso, fetchFn }).hecho
    expect(r.ok).toBe(false)
    expect(r.manifiesto.storage.errores.join(" ")).toContain("logo.png")
    expect(r.manifiesto.storage.descargados).toBe(3)
  })
})

describe("seguridad de la clave", () => {
  it("la clave no aparece en la salida, el manifiesto ni los mensajes de error", async () => {
    const falso = falsoSupabase({ falla: ["events"] })
    const { hecho, lineas } = copiar({}, falso)
    const r = await hecho
    const todo = JSON.stringify(r.manifiesto) + lineas.join("\n") + readFileSync(join(r.carpeta, "LEEME.txt"), "utf8")
    expect(todo).not.toContain(CLAVE)
    expect(todo).not.toContain("CLAVE_MUY_SECRETA")
  })

  it("la clave nueva va solo en «apikey»; la antigua (JWT) también como Bearer", async () => {
    const nueva = falsoSupabase()
    await copiar({ sinFotos: true }, nueva).hecho
    expect(nueva.peticiones.every((p) => p.headers.apikey === CLAVE && p.headers.Authorization === undefined)).toBe(true)

    const jwt = "eyJhbGciOiJIUzI1NiJ9." + Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url") + ".firma"
    const vieja = falsoSupabase()
    await copiar({ sinFotos: true, clave: jwt }, vieja).hecho
    expect(vieja.peticiones.every((p) => p.headers.Authorization === `Bearer ${jwt}`)).toBe(true)
  })

  it("rechaza claves que no sirven: vacía, pública o de otro rol", () => {
    const jwt = (role: string) => "eyJhbGciOiJIUzI1NiJ9." + Buffer.from(JSON.stringify({ role })).toString("base64url") + ".firma"
    expect(bk.problemaConLaClave("")).toMatch(/falta/)
    expect(bk.problemaConLaClave(undefined)).toMatch(/falta/)
    expect(bk.problemaConLaClave("sb_publishable_abc")).toMatch(/pública/)
    expect(bk.problemaConLaClave(jwt("anon"))).toMatch(/anon/)
    expect(bk.problemaConLaClave(jwt("service_role"))).toBeNull()
    expect(bk.problemaConLaClave("sb_secret_abc")).toBeNull()
  })

  it("rutaLocalSegura nunca sale de la carpeta", () => {
    const raiz = join(tmp, "seg")
    mkdirSync(raiz, { recursive: true })
    for (const ruta of ["../../x.jpg", "a/../../../x.jpg", "/abs/x.jpg", "a//b.jpg"]) {
      expect(bk.rutaLocalSegura(raiz, "club-photos", ruta).startsWith(resolve(raiz) + (process.platform === "win32" ? "\\" : "/"))).toBe(true)
    }
  })
})

describe("reintentos y carpetas", () => {
  it("reintenta ante un 503 y sigue", async () => {
    const falso = falsoSupabase({ fallosPrevios: 2 })
    const r = await copiar({ sinFotos: true }, falso).hecho
    expect(r.ok).toBe(true)
    expect(JSON.parse(readFileSync(join(r.carpeta, "tablas", "events.json"), "utf8"))).toHaveLength(1)
  })

  it("si el servidor no se recupera, falla con un mensaje claro y sin la clave", async () => {
    const cliente = bk.crearCliente({ url: URL_BASE, clave: CLAVE, fetchFn: async () => new Response("", { status: 503 }), esperaMs: 0, intentos: 3 })
    await expect(cliente.pedir("/rest/v1/clubs?select=*&secreto=1")).rejects.toThrow("HTTP 503 en /rest/v1/clubs")
    await expect(cliente.pedir("/rest/v1/clubs?select=*")).rejects.not.toThrow(CLAVE)
  })

  it("dos copias en el mismo minuto no se pisan", async () => {
    const carpeta = join(tmp, "mismo-minuto")
    const a = await copiar({ sinFotos: true }, falsoSupabase(), carpeta).hecho
    const b = await copiar({ sinFotos: true }, falsoSupabase(), carpeta).hecho
    expect(a.carpeta).not.toBe(b.carpeta)
    expect(a.carpeta.endsWith("noctua-2026-11-14_1330")).toBe(true)
    expect(b.carpeta.endsWith("noctua-2026-11-14_1330-2")).toBe(true)
  })

  it("si la API no devuelve tablas, avisa de la clave en vez de dar una copia vacía", async () => {
    const fetchFn = async () => new Response("", { status: 401 })
    await expect(copiar({}, { fetchFn, peticiones: [] } as never).hecho).rejects.toThrow(/clave de servicio/)
  })
})

describe("entorno y argumentos", () => {
  it("lee un .env con comillas, comentarios y export", () => {
    const env = bk.leerEnv(`# comentario\nNEXT_PUBLIC_SUPABASE_URL="https://x.supabase.co"\nexport SUPABASE_SERVICE_ROLE_KEY='abc=def' # clave\nVACIA=\nRARA = valor con espacios \r\n`)
    expect(env).toEqual({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "abc=def", VACIA: "", RARA: "valor con espacios" })
  })

  it("entiende las opciones y rechaza las desconocidas", () => {
    expect(bk.leerArgumentos(["--sin-fotos", "--sin=analytics, analytics_bots", "--tablas=clubs", "--carpeta=D:\\Copias"])).toEqual({
      sinFotos: true,
      sin: ["analytics", "analytics_bots"],
      soloTablas: ["clubs"],
      carpeta: "D:\\Copias",
      ayuda: false,
    })
    expect(() => bk.leerArgumentos(["--borrar"])).toThrow(/desconocida/)
  })

  it("el manifiesto solo guarda el servidor, no la dirección completa ni claves", async () => {
    const r = await copiar({ sinFotos: true }).hecho
    expect(r.manifiesto.servidor).toBe("api.ejemplo.test")
    writeFileSync(join(tmp, "ok.txt"), "ok")
  })
})

describe("nombres de foto larguísimos (Windows no admite rutas de más de 260 caracteres)", () => {
  const largo = (marca: string) => `${"Aa-ngM" + marca}${"x_-".repeat(140)}.jpg` // unos 430 caracteres

  it("se acortan, se guardan igualmente y dejan la equivalencia con el nombre original", async () => {
    const n1 = largo("A")
    const tamanos = { "logo.png": 3, [`1/${n1}`]: 6 }
    const carpeta = join(tmp, "largos1")
    const falso = falsoSupabase({ tamanos })
    const r = await copiar({}, falso, carpeta).hecho
    expect(r.ok).toBe(true)
    expect(r.manifiesto.storage).toMatchObject({ archivos: 2, descargados: 2, renombrados: 1, errores: [] })
    const equivalencias = JSON.parse(readFileSync(join(carpeta, "storage", "_nombres-originales.json"), "utf8"))
    const [local, original] = Object.entries(equivalencias)[0] as [string, string]
    expect(original).toBe(`club-photos/1/${n1}`)
    expect(local.split("/").every((t) => t.length <= 80)).toBe(true)
    expect(local.endsWith(".jpg")).toBe(true)
    expect(statSync(join(carpeta, "storage", ...local.split("/"))).size).toBe(6)
  })

  it("es estable: la segunda copia no vuelve a bajarlo y las equivalencias se conservan", async () => {
    const tamanos = { "logo.png": 3, [`1/${largo("B")}`]: 6 }
    const carpeta = join(tmp, "largos2")
    await copiar({}, falsoSupabase({ tamanos }), carpeta).hecho
    const falso2 = falsoSupabase({ tamanos })
    const r2 = await copiar({ ahora: () => new Date(2026, 10, 14, 13, 31) }, falso2, carpeta).hecho
    expect(falso2.peticiones.filter((p) => p.url.includes("/storage/v1/object/club-photos/"))).toHaveLength(0)
    expect(r2.manifiesto.storage).toMatchObject({ descargados: 0, omitidos: 2 })
    expect(Object.keys(JSON.parse(readFileSync(join(carpeta, "storage", "_nombres-originales.json"), "utf8")))).toHaveLength(1)
  })

  it("dos nombres largos que empiezan igual no se pisan entre sí", () => {
    const raiz = join(tmp, "colision")
    const a = bk.rutaLocalSegura(raiz, "event-photos", `157/${largo("C")}`)
    const b = bk.rutaLocalSegura(raiz, "event-photos", `157/${largo("D")}`)
    expect(a).not.toBe(b)
    expect(bk.rutaLocalSegura(raiz, "event-photos", `157/${largo("C")}`)).toBe(a) // mismo nombre, mismo resultado
  })

  it("con carpetas muy anidadas el archivo pasa a llamarse por su huella y la ruta no se dispara", () => {
    const raiz = join(tmp, "anidado")
    const hondo = Array.from({ length: 12 }, (_, i) => `carpeta-numero-${i}-con-nombre-largo`).join("/")
    const ruta = bk.rutaLocalSegura(raiz, "club-photos", `${hondo}/${largo("E")}`)
    expect(ruta.length).toBeLessThan(resolve(raiz).length + 12 * 40 + 60)
    expect(ruta.endsWith(".jpg")).toBe(true)
    expect(bk.rutaLocalSegura(raiz, "club-photos", `${hondo}/${largo("E")}`)).toBe(ruta)
  })

  it("un fallo al escribir en disco no vuelca la ruta entera en el mensaje de error", async () => {
    const carpeta = join(tmp, "sin-permiso")
    mkdirSync(join(carpeta, "storage"), { recursive: true })
    // Un archivo donde debería ir la carpeta del bucket: crear la ruta falla con un error de disco.
    writeFileSync(join(carpeta, "storage", "club-photos"), "no soy una carpeta")
    const r = await copiar({}, falsoSupabase(), carpeta).hecho
    expect(r.ok).toBe(false)
    const mensajes: string[] = r.manifiesto.storage.errores
    expect(mensajes.length).toBeGreaterThan(0)
    expect(mensajes.every((m) => m.length < 160 && !m.includes(tmp))).toBe(true)
  })
})
