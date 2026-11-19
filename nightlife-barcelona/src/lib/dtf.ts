// Formateadores de fecha reutilizables (19/11/2026).
//
// «new Intl.DateTimeFormat(...)» es caro (decenas o cientos de microsegundos, y bastante más en un móvil), y el listado de clubs lo
// repetía tres veces POR CADA CLUB cada vez que miraba si estaba abierto: con ~370 locales eran más de 1000 formateadores nuevos
// por pasada, y en el móvil eso era la mayor parte del retraso al entrar en /clubs, al filtrar y al cambiar de página. Ahora se
// crea uno, la primera vez que hace falta, y se reutiliza. El resultado es idéntico: el formateador no guarda ningún estado.
export function lazyDtf(locale: string, options: Intl.DateTimeFormatOptions): () => Intl.DateTimeFormat {
  let f: Intl.DateTimeFormat | undefined
  return () => (f ??= new Intl.DateTimeFormat(locale, options))
}
