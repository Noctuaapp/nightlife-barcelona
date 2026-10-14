// Errores para depurar en desarrollo. Antes había ~50 console.log("... ERROR:", e) que en
// producción llenaban la consola del navegador de cualquier visitante con datos internos.
export function logError(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "production") console.error(...args)
}
