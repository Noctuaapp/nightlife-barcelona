import type { NextConfig } from "next"
 
const nextConfig: NextConfig = {
  // URLs antiguas o inexistentes que Google sigue rastreando (aparecían como 404): se redirigen
  // a la página equivalente en vez de devolver error.
  async redirects() {
    return [
      { source: "/account", destination: "/profile", permanent: true },
      { source: "/ayuda", destination: "/faq", permanent: true },
      { source: "/venue-details", destination: "/clubs", permanent: true },
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
    ],
  },
}
 
export default nextConfig
 