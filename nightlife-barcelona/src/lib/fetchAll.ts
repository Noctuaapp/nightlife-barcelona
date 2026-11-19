// Supabase devuelve como mucho 1.000 filas por consulta. Con las paradas de Nitbus (más de mil)
// los esenciales pasan de ese límite y las consultas "trae todo" se cortaban sin avisar: faltaban
// farmacias, cajeros... al azar. Esto pide página a página hasta tenerlo todo.
type Page<T> = { data: T[] | null; error: unknown }

// `parallel` (19/11/2026): cuántas páginas se piden a la vez. Por defecto 1 (de una en una, como siempre). Con una tabla que ya
// se sabe que tiene varias páginas (los esenciales, más de 3.000 filas) se piden varias a la vez en vez de esperar a que acabe
// cada una: en Esenciales la portada pasaba de 4 peticiones seguidas (~1 s con buena conexión, varios segundos en el móvil) a
// una sola espera. El resultado es el mismo y en el mismo orden (las páginas se unen por posición, no por llegada).
export async function fetchAllPages<T>(build: (from: number, to: number) => PromiseLike<Page<T>>, pageSize = 1000, parallel = 1): Promise<T[]> {
  const out: T[] = []
  const width = Math.max(1, Math.floor(parallel))
  for (let from = 0; from < 50000; from += pageSize * width) {
    const batch = await Promise.all(Array.from({ length: width }, (_, i) => build(from + i * pageSize, from + (i + 1) * pageSize - 1)))
    for (const { data, error } of batch) {
      if (error || !data) return out
      out.push(...data)
      if (data.length < pageSize) return out
    }
  }
  return out
}

/**
 * Como fetchAllPages, pero devuelve también el error de la primera página que falle (con él se sabe, por ejemplo, que una
 * columna no existe y se puede repetir la consulta sin ella). Con un error no devuelve datos a medias.
 */
export async function selectAllPages<T>(
  build: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize = 1000
): Promise<{ data: T[] | null; error: unknown }> {
  const out: T[] = []
  for (let from = 0; from < 50000; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) return { data: null, error }
    out.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return { data: out, error: null }
}
