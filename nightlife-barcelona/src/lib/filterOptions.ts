// Filtros que solo aparecen si sirven (01/11/2026). Antes se enseñaban todos los botones de filtro
// aunque ningún local o evento cumpliera la condición, y al pulsarlos salía «No hay clubs con estos
// filtros». Ahora un botón sale solo cuando hay al menos un resultado que lo cumple.
//
//  - Un filtro ya elegido (`keep`) se queda visible aunque no tenga datos, para poder quitarlo.
//  - Sin ningún dato cargado (lista vacía: aún cargando, o error de red) no se esconde nada: no hay
//    base para decidir y es peor quedarse sin filtros que enseñarlos todos un momento.

export function optionsWithData<O extends string, I>(
  options: readonly O[],
  items: readonly I[],
  matches: (item: I, option: O) => boolean,
  keep?: ReadonlySet<string>
): O[] {
  if (items.length === 0) return [...options]
  return options.filter((option) => keep?.has(option) || items.some((item) => matches(item, option)))
}
