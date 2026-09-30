// Iconos de línea compartidos por las barras de búsqueda y filtros (clubs/eventos).
// Mismo lenguaje visual que ArrowIcon: trazo currentColor, sin relleno, minimalista.

export function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17 17L13.3 13.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function LocationIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 18s6-5.6 6-10.4A6 6 0 104 7.6C4 12.4 10 18 10 18z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7.6" r="2.1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function FlameIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 18c3.3 0 5.7-2.2 5.7-5.4 0-2.3-1.2-3.7-2.1-5-.2.9-.8 1.8-1.5 2.2.2-2.2-.7-4.5-2.7-5.8.4 1.8-.3 3.2-1.5 4.4-1.1 1.1-2.2 2.4-2.2 4.2C5.7 15.8 6.7 18 10 18z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="4.5" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 8.5H16.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 3V5.5M13 3V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function SlidersIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3 6h8M15 6h2M3 14h2M9 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="11" cy="6" r="2" fill="currentColor" stroke="currentColor" />
      <circle cx="6" cy="14" r="2" fill="currentColor" stroke="currentColor" />
    </svg>
  )
}

export function ChevronDownIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 2.5l2.3 4.8 5.2.7-3.8 3.7.9 5.2L10 14.4l-4.6 2.5.9-5.2-3.8-3.7 5.2-.7L10 2.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
