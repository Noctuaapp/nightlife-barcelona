// Texto de cada local EN INGLÉS (10/11/2026). Desde el 10/11/2026 la lógica es común a los cuatro idiomas
// (lib/intl/clubText.ts, con las palabras de cada uno en clubLex.ts); este archivo deja las funciones en inglés
// con los nombres de siempre.

import {
  CLUB_TITLE_MAX,
  capitalize,
  clubMetaDescription,
  clubSummary,
  clubTagline as taglineOf,
  clubTitle,
  dressOf,
  featuresOf,
  firstSlot,
  hoursOf,
  listOf,
  minAgeOf,
  musicOf,
  priceOf,
  ratingOf,
  streetOf,
  venueKindOf,
  type Club,
  type PriceText,
} from "../clubText"

export { CLUB_TITLE_MAX, capitalize, minAgeOf, ratingOf, streetOf }
export type KindEn = { noun: string; plural: string }
export type PriceEn = PriceText

export const listEn = (items: string[]): string => listOf("en", items)
export const venueKindEn = (venueType: string | null | undefined): KindEn => venueKindOf("en", venueType)
export const musicEn = (raw: unknown): string[] => musicOf("en", raw)
export const dressEn = (club: Club): string => dressOf("en", club)
export const hoursEn = (hours: unknown, openDays?: string[] | null): string[] => hoursOf("en", hours, openDays)
export const firstSlotEn = firstSlot
export const priceEn = (raw: unknown): PriceEn | null => priceOf("en", raw)
export const featuresEn = (club: Club): string[] => featuresOf("en", club)
export const clubSummaryEn = (club: Club): string => clubSummary("en", club)
export const clubTitleEn = (club: Club): string => clubTitle("en", club)
export const clubMetaDescriptionEn = (club: Club): string => clubMetaDescription("en", club)
export const clubTagline = (club: Club): string => taglineOf("en", club)
