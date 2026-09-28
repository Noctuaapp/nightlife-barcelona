// Slug compartido para clubs y eventos (usado tanto al construir el link como al buscar el
// club/evento correspondiente en la página de detalle).
//
// Antes cada archivo tenía su propia copia de esta función, y todas solo quitaban acentos y
// convertían espacios en guiones — cualquier otro carácter especial (como el "&" de un club
// llamado "NIGHT & DAY BCN") se quedaba tal cual en el slug. Eso en sí no debería romper nada,
// pero es fragil (cualquier paso intermedio que no trate bien el "&" rompe el link) y da URLs
// feas. Ahora se quita cualquier carácter que no sea letra/número, así el slug queda limpio
// siempre ("night-day-bcn") y es imposible que un nombre con símbolos genere un link roto.
export const createSlug = (text: string | null | undefined) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-") // cualquier símbolo (&, ', ., ¡, etc.) -> guion
    .replace(/^-+|-+$/g, "") // sin guiones sueltos al principio/final
