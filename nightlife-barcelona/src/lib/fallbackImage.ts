// Fallback compartido para clubs y eventos sin foto propia.
//
// Antes se usaba un archivo fijo "/clubs/razz.jpg" como placeholder — que ni siquiera existe
// en el repo (daba 404 en cualquier navegador) y además hacía que cualquier club o evento sin
// imagen propia mostrase la misma foto que otro (Razzmatazz). Este SVG en línea (data URI) no
// depende de ningún archivo externo, así que nunca da 404, y es neutro (no es la foto de nadie).
export const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2e1065"/><stop offset="100%" stop-color="#05010a"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><text x="400" y="330" font-size="160" text-anchor="middle" opacity="0.35">🎵</text></svg>`
  )
