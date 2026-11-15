// Supabase devuelve como mucho 1.000 filas por consulta. Con las paradas de Nitbus (más de mil)
// los esenciales pasan de ese límite y las consultas "trae todo" se cortaban sin avisar: faltaban
// farmacias, cajeros... al azar. Esto pide página a página hasta tenerlo todo.
type Page<T> = { data: T[] | null; error: unknown }

export async function fetchAllPages<T>(build: (from: number, to: number) => PromiseLike<Page<T>>, pageSize = 1000): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < 50000; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error || !data) break
    out.push(...data)
    if (data.length < pageSize) break
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
