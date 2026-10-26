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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
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
 