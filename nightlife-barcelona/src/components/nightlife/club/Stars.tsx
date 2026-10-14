import Icon from "../../ui/Icon"

// Estrellas de valoración, siempre en ámbar (el color reservado para valoraciones y avisos).
export default function Stars({ rating, size = "h-3.5 w-3.5" }: { rating: number; size?: string }) {
  const rounded = Math.round(rating)
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" className={`${size} text-warn ${n <= rounded ? "" : "opacity-25"}`} />
      ))}
    </span>
  )
}
