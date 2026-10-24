"use client"

import Image from "./SafeImage"

// Foto de portada de las fichas (club, evento, noche de club). Antes la foto se estiraba a todo
// el ancho de la pantalla con object-cover en un hueco muy apaisado (46% del alto de pantalla), así
// que en ordenador una foto normal (4:3 o vertical) se recortaba muchísimo y se ampliaba hasta
// verse borrosa ("adecuar la imagen de portada al tamaño del espacio, si no no se ve bien").
//
// Ahora: la foto entera, nítida, centrada y sin recortar (object-contain), y detrás la misma foto
// ampliada y desenfocada rellenando el resto del hueco, para que no queden bandas negras.
// Las fotos de relleno (sin foto propia) siguen ocupando todo el hueco.
export default function HeroImage({ src, alt, fallback }: { src: string | null | undefined; alt: string; fallback: string }) {
  if (!src) {
    return <Image src={fallback} alt={alt} fill priority sizes="100vw" unoptimized className="object-cover" />
  }
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="scale-110 object-cover opacity-60 blur-2xl"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-night/30" />
      <Image src={src} alt={alt} fill priority sizes="(max-width: 768px) 100vw, 1200px" className="object-contain" />
    </>
  )
}
