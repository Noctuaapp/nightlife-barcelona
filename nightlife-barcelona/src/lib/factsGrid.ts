// Rejilla de «datos prácticos» de las fichas de club, evento y noche de club (29/10/2026).
// Antes era siempre "2 columnas en móvil / 4 en escritorio" sobre un fondo gris claro (así se dibuja
// la línea fina entre celdas): con 1 o 3 datos sobraba una celda y se veía como un recuadro vacío
// gris. Ahora las columnas se ajustan a los datos que hay y, con 3 (o 1) en móvil, la última celda
// ocupa todo el ancho.
export function factsGridClass(n: number): string {
  const mobile = n <= 1 ? "grid-cols-1" : "grid-cols-2"
  const desktop = n >= 4 ? "sm:grid-cols-4" : n === 3 ? "sm:grid-cols-3" : n === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1"
  return `grid ${mobile} ${desktop} gap-px overflow-hidden rounded-card border border-white/10 bg-white/10`
}

export function factCellClass(index: number, n: number): string {
  return n > 1 && n % 2 === 1 && index === n - 1 ? "col-span-2 sm:col-span-1" : ""
}
