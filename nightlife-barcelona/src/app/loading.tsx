import Image from "next/image"

// Antes: una "N" en un cuadrado blanco parpadeando sin más, con el texto en inglés ("Loading
// nightlife") en una app que todo lo demás tiene en español. Ahora usa el logo real de Noctua
// con un brillo detrás que "respira" despacio (sutil, una sola cosa moviéndose, no un spinner
// genérico) — coherente con el resto de la identidad (degradado morado→rosa, fondo casi negro).
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050308]">
      <div className="relative flex flex-col items-center">
        <div
          aria-hidden="true"
          className="absolute h-40 w-40 rounded-full opacity-40 blur-3xl motion-safe:animate-[breathe_2.4s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.55), rgba(236,72,153,0.25) 55%, transparent 75%)" }}
        />
        <Image
          src="/noctua_logo.png"
          alt="Noctua"
          width={88}
          height={54}
          priority
          className="relative h-12 w-auto object-contain motion-safe:animate-[breathe_2.4s_ease-in-out_infinite]"
        />
        <p className="relative mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
          Cargando la noche
        </p>
      </div>
    </main>
  )
}