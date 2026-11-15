import type { Metadata } from "next"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import SharedPlanClient from "@/components/plan/SharedPlanClient"
import { supabase } from "../../../lib/supabase"

// Los planes compartidos son privados de hecho (solo quien tiene el enlace): no se indexan.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  let title = "Plan de la noche en Barcelona"
  let description = "Te han invitado a un plan. Apúntate sin crear cuenta."
  try {
    // Los planes antiguos tienen 8 caracteres; los nuevos, 12 (más difíciles de adivinar).
    if (/^[a-f0-9]{8,12}$/.test(code)) {
      const [{ data }, { data: pollState }] = await Promise.all([
        supabase.rpc("get_night_plan", { p_code: code }),
        supabase.rpc("night_plan_poll_state", { p_code: code, p_token: null }),
      ])
      if (data?.title) {
        title = data.title
        // Votación entre sitios (supabase/119): se enseñan separados por «·» y se invita a votar, no a apuntarse.
        const isPoll = pollState?.mode === "vote"
        const names = (data.stops || []).map((s: any) => s.title).filter(Boolean).slice(0, isPoll ? 5 : 4).join(isPoll ? " · " : " → ")
        if (names) description = isPoll ? `Elige entre: ${names}. Vota sin crear cuenta.` : `${names}. Apúntate sin crear cuenta.`
      }
    }
  } catch {}
  return {
    title: `${title} · Noctua`,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website" },
  }
}

export default async function SharedPlanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return (
    <div className="flex min-h-screen flex-col bg-night">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-24">
        <SharedPlanClient code={code} />
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
