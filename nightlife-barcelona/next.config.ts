import type { NextConfig } from "next"
 
const nextConfig: NextConfig = {
  // El círculo negro con una "N" abajo a la izquierda es el indicador de desarrollo de Next.js:
  // solo sale con "npm run dev" (en tu ordenador), nunca en la web publicada. Se apaga igualmente
  // para que no tape nada mientras pruebas.
  devIndicators: false,
  // URLs antiguas o inexistentes que Google sigue rastreando (aparecían como 404): se redirigen
  // a la página equivalente en vez de devolver error.
  // Cabeceras de seguridad (26/10/2026, revisión de seguridad). No cambian nada de lo que se ve:
  //   - nadie puede meter Noctua dentro de un iframe de otra web (evita «clickjacking»);
  //   - el navegador no adivina tipos de archivo (evita que un archivo subido se ejecute como código);
  //   - al pinchar un enlace externo solo se envía el dominio, no la URL completa;
  //   - solo Noctua puede pedir la ubicación; cámara y micrófono, desactivados;
  //   - siempre por HTTPS.
  // Auditoría 2/11/2026: la política de contenido (CSP) pasa de solo «frame-ancestors» a incluir
  //   - object-src 'none': nada de plugins ni <object>/<embed> (no se usan);
  //   - base-uri 'self': nadie puede cambiar hacia dónde apuntan los enlaces relativos con un <base>;
  //   - form-action 'self': ningún formulario inyectado puede enviar datos a otra web.
  // No se restringen los scripts (Next.js, Mapbox y Vercel Analytics necesitan los suyos): eso
  // requeriría un CSP con «nonce» y se probaría antes en modo solo-informe.
  async headers() {
    return [
      // El service worker (public/sw.js) no debe quedarse en la caché del navegador ni de Vercel:
      // si algún día cambia, tiene que actualizarse en cuanto se abra la web.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: "/account", destination: "/profile", permanent: true },
      { source: "/ayuda", destination: "/faq", permanent: true },
      { source: "/venue-details", destination: "/clubs", permanent: true },
      // /barrio/barcelona era el cajón de los locales sin barrio concreto (06/11/2026 se repartieron
      // en su barrio real): la página ya no existe y su contenido es el listado general.
      { source: "/barrio/barcelona", destination: "/clubs", permanent: true },
      // La analítica antigua del admin se sustituyó por Actividad por usuario.
      { source: "/admin/analytics", destination: "/admin/actividad", permanent: false },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iabxlqkthdermmxklstq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Fotos de festivales/fiestas mayores sacadas de Wikimedia Commons (licencia libre),
        // enlazadas directamente en vez de subirlas al storage propio.
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/wiki/Special:FilePath/**",
      },
    ],
  },
}
 
export default nextConfig
 