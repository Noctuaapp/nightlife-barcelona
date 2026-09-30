// El sistema de traducciones (LanguageContext.t) solo devuelve strings, no arrays ni JSX. Estos
// helpers permiten guardar listas y enlaces dentro de un único string traducido:
//
// - Una lista simple: un item por línea.
// - Una lista de "Etiqueta: descripción": cada línea es "Etiqueta::descripción" (separador "::"
//   para no confundirlo con los dos puntos normales que puede llevar el texto).
// - Un enlace dentro de una frase: se marca con {token} en el texto traducido (ej. "escríbenos a
//   {email}") y se sustituye por un <a> real al renderizar.

export function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export function splitLabelItems(text: string): { label: string; desc: string }[] {
  return splitLines(text).map((line) => {
    const idx = line.indexOf("::")
    if (idx === -1) return { label: "", desc: line }
    return { label: line.slice(0, idx).trim(), desc: line.slice(idx + 2).trim() }
  })
}

type LinkDef = { href: string; label: string; external?: boolean }

export function renderWithLinks(text: string, links: Record<string, LinkDef>) {
  const parts = text.split(/(\{\w+\})/g)
  return parts.map((part, i) => {
    const match = part.match(/^\{(\w+)\}$/)
    if (match && links[match[1]]) {
      const link = links[match[1]]
      return (
        <a
          key={i}
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          {link.label}
        </a>
      )
    }
    return part
  })
}
