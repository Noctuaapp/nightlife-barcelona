// Buscar por código postal (pedido el 23/10/2026: "código postal, asociado a barrio").
//
// Aviso importante sobre esto: en Noctua, el barrio de cada club es texto libre que se escribe a
// mano desde /admin (campo "Barrio"), no viene de ningún catálogo cerrado — así que no hay una
// correspondencia oficial y exacta entre cada código postal y "el" barrio de Noctua. Además los
// códigos postales de Barcelona están pensados por distrito, no por los barrios de toda la vida
// que la gente usa para buscar discotecas (Born, Gòtic, Raval y Barceloneta, por ejemplo, caen
// casi todos en los códigos 08002/08003, y fuentes distintas no siempre coinciden en el detalle).
// Por eso esto es a propósito un emparejamiento "por aproximación, lo mejor que se puede": cada
// código postal apunta a una lista de nombres de zona candidatos, y la búsqueda considera que
// coincide si el barrio del club contiene CUALQUIERA de esos nombres (igual que ya hace la
// búsqueda de texto normal con el nombre del club o el barrio). Si un club no aparece buscando su
// código postal, no es un fallo del dato: es que su barrio está escrito con otro nombre.
export const BARCELONA_POSTAL_AREAS: Record<string, string[]> = {
  "08001": ["Raval"],
  "08002": ["Gòtic", "Gotic", "Raval"],
  "08003": ["Born", "Sant Pere", "Barceloneta", "Ciutat Vella"],
  "08004": ["Poble Sec", "Sant Antoni"],
  "08005": ["Barceloneta", "Vila Olímpica", "Vila Olimpica", "Poblenou"],
  "08006": ["Sant Gervasi", "Galvany"],
  "08007": ["Eixample", "Passeig de Gràcia", "Passeig de Gracia"],
  "08008": ["Eixample", "Diagonal", "Les Corts"],
  "08009": ["Eixample"],
  "08010": ["Eixample", "Fort Pienc"],
  "08011": ["Eixample", "Sant Antoni"],
  "08012": ["Gràcia", "Gracia"],
  "08013": ["Eixample", "Sagrada Família", "Sagrada Familia", "Fort Pienc"],
  "08014": ["Sants", "Hostafrancs"],
  "08015": ["Eixample", "Sant Antoni"],
  "08016": ["Nou Barris"],
  "08017": ["Sarrià", "Sarria", "Pedralbes"],
  "08018": ["Poblenou", "Sant Martí", "Sant Marti"],
  "08019": ["Poblenou", "Vila Olímpica", "Vila Olimpica", "Sant Martí", "Sant Marti"],
  "08020": ["Poblenou", "Sant Martí", "Sant Marti"],
  "08021": ["Sant Gervasi"],
  "08022": ["Sant Gervasi", "Bonanova"],
  "08023": ["Vallcarca", "El Coll", "Gràcia", "Gracia"],
  "08024": ["Gràcia", "Gracia"],
  "08025": ["Sagrada Família", "Sagrada Familia", "Gràcia", "Gracia"],
  "08026": ["El Guinardó", "El Guinardo", "El Carmel", "Horta-Guinardó"],
  "08027": ["Horta", "El Guinardó", "El Guinardo"],
  "08028": ["Les Corts"],
  "08029": ["Eixample", "Sant Antoni"],
  "08030": ["Sant Andreu", "Horta"],
  "08031": ["Horta"],
  "08032": ["Horta-Guinardó", "Horta Guinardo"],
  "08033": ["Sant Andreu"],
  "08034": ["Les Corts", "Pedralbes", "Zona Universitària", "Zona Universitaria"],
  "08035": ["Vallcarca", "Horta-Guinardó", "Horta Guinardo"],
  "08036": ["Eixample", "Sant Antoni"],
  "08037": ["Eixample", "Gràcia", "Gracia"],
  "08038": ["Poble Sec", "Montjuïc", "Montjuic"],
  "08039": ["Poble Sec", "Montjuïc", "Montjuic"],
  "08040": ["Zona Franca", "Montjuïc", "Montjuic"],
  "08041": ["Nou Barris"],
  "08042": ["Nou Barris", "Horta-Guinardó", "Horta Guinardo"],
  // Municipios cercanos (ya cubiertos por la herramienta de importar de OpenStreetMap en /admin).
  "08901": ["Hospitalet", "L'Hospitalet"],
  "08902": ["Hospitalet", "L'Hospitalet"],
  "08903": ["Hospitalet", "L'Hospitalet"],
  "08904": ["Hospitalet", "L'Hospitalet"],
  "08905": ["Hospitalet", "L'Hospitalet"],
  "08906": ["Hospitalet", "L'Hospitalet"],
  "08907": ["Hospitalet", "L'Hospitalet"],
  "08908": ["Hospitalet", "L'Hospitalet"],
  "08911": ["Badalona"],
  "08912": ["Badalona"],
  "08913": ["Badalona"],
  "08914": ["Badalona"],
  "08915": ["Badalona"],
  "08916": ["Badalona"],
  "08917": ["Badalona"],
  "08918": ["Badalona"],
  "08820": ["Prat", "El Prat"],
  "08830": ["Prat", "El Prat"],
}

// Si el texto escrito es un código postal conocido, las zonas candidatas para esa búsqueda;
// si no, null (y la búsqueda sigue su camino normal de texto libre).
export function areasForPostalCode(query: string): string[] | null {
  const trimmed = query.trim()
  if (!/^08\d{3}$/.test(trimmed)) return null
  return BARCELONA_POSTAL_AREAS[trimmed] || null
}
