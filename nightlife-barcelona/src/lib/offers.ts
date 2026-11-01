// Ofertas y descuentos (01/11/2026). Los dueños rellenan en «Mi club» dos campos de texto libre:
// «Promoción de hoy» (discount_info) y «Entrada gratis» (free_entry_info). Un local «tiene oferta» si
// tiene cualquiera de los dos. El filtro «Ofertas» de /clubs y la casilla de Planifica tu noche solo
// aparecen cuando al menos un local la tiene (ver lib/filterOptions.ts).

export const OFFERS_FILTER = "Ofertas"

const hasText = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0

export function hasOffer(club: { discount_info?: unknown; free_entry_info?: unknown }): boolean {
  return hasText(club.discount_info) || hasText(club.free_entry_info)
}
