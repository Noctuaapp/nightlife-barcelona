"use client"

import { Fragment, useState, type ReactNode } from "react"
import VenueReviews from "./VenueReviews"

// Bloque «Opiniones» de la ficha de un club o de un evento (11/11/2026): opiniones de Noctua + las de Google.
// Si nadie ha opinado todavía en Noctua, primero va lo que sí tiene contenido (las de Google) y la invitación
// a ser el primero queda debajo, corta. Con opiniones de Noctua, van arriba como siempre.
// Los hijos son secciones sueltas: la raya que las separa se pinta aquí, así no sobra ninguna si una no se dibuja.
export default function ReviewsBlock({
  venueType,
  venueId,
  isOwner = false,
  google,
}: {
  venueType: "club" | "event"
  venueId: number
  isOwner?: boolean
  /** Las reseñas de Google (<ClubReviews embedded … />). */
  google: ReactNode
}) {
  const [noctuaCount, setNoctuaCount] = useState<number | null>(null)
  const noctua = <VenueReviews key="noctua" venueType={venueType} venueId={venueId} isOwner={isOwner} onLoaded={setNoctuaCount} />
  const googleBlock = <Fragment key="google">{google}</Fragment>
  return (
    <div className="flex flex-col gap-8 [&>*+*]:border-t [&>*+*]:border-white/10 [&>*+*]:pt-8">
      {noctuaCount === 0 ? [googleBlock, noctua] : [noctua, googleBlock]}
    </div>
  )
}
