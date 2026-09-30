// Antes casi cada botón/enlace de "ir a" usaba el carácter de texto "→" (font-dependent, con
// mal antialiasing en algunos tamaños y pesos de fuente distintos según el navegador — de ahí que
// se viera "cutre" en muchos sitios del sitio). Este SVG es un trazo fino y limpio, nítido a
// cualquier tamaño y con el mismo grosor en todas partes, que además hereda el color del texto
// (currentColor) para funcionar tanto sobre fondo blanco como sobre el círculo degradado morado/
// rosa que ya usamos para los botones circulares de la app.
export default function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 8H13M13 8L9 4M13 8L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
