"use client"

import { useLanguage } from "../../context/LanguageContext"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"

export default function TermsPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-3">{t("terms.title")}</h1>
          <p className="text-white/40 text-sm">{t("terms.last_updated")}</p>
        </div>
        <div className="space-y-10 text-white/65 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. Aceptación de los términos</h2>
            <p>Al acceder o usar Noctua (&quot;la Plataforma&quot;), aceptas quedar vinculado por estos Términos de Servicio. Si no estás de acuerdo con estos términos, por favor no uses la Plataforma. Nos reservamos el derecho de actualizar estos términos en cualquier momento; el uso continuado constituye la aceptación de cualquier cambio.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. Descripción del servicio</h2>
            <p>Noctua es una plataforma de descubrimiento de vida nocturna que ofrece información sobre clubs, eventos y ocio nocturno en Barcelona. Somos una plataforma informativa — no operamos locales, organizamos eventos ni vendemos entradas directamente.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. Cuentas de usuario</h2>
            <p className="mb-3">Al crear una cuenta, aceptas:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Proporcionar información precisa y completa.",
                "Mantener tu contraseña segura y confidencial.",
                "Notificarnos inmediatamente de cualquier uso no autorizado de tu cuenta.",
                "Ser responsable de toda actividad que ocurra bajo tu cuenta.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">Debes tener al menos 18 años para crear una cuenta en Noctua, acorde a la naturaleza del contenido de ocio nocturno.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. Uso aceptable</h2>
            <p className="mb-3">Aceptas no:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Usar la Plataforma con fines ilícitos.",
                "Extraer, copiar o reproducir contenido sin permiso.",
                "Intentar acceder sin autorización a cualquier parte de la Plataforma.",
                "Enviar información falsa, engañosa o difamatoria.",
                "Interferir o interrumpir el funcionamiento de la Plataforma.",
                "Usar la Plataforma para enviar comunicaciones comerciales no solicitadas.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Exactitud del contenido</h2>
            <p>Nos esforzamos por mantener toda la información de locales y eventos precisa y actualizada. Sin embargo, no podemos garantizar la exactitud, integridad o vigencia de la información en la Plataforma. Verifica siempre los detalles directamente con el local antes de asistir.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Propiedad intelectual</h2>
            <p>Todo el contenido de la Plataforma, incluidos textos, gráficos, logotipos y diseño, es propiedad de Noctua o de sus proveedores de contenido y está protegido por las leyes de propiedad intelectual aplicables. No puedes reproducir, distribuir ni crear obras derivadas sin nuestro permiso expreso por escrito.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Enlaces a terceros</h2>
            <p>La Plataforma puede contener enlaces a sitios web de terceros, incluidas webs de locales y plataformas de venta de entradas. Estos enlaces se ofrecen únicamente por comodidad. No tenemos control ni asumimos responsabilidad alguna sobre el contenido o las prácticas de dichos sitios.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Limitación de responsabilidad</h2>
            <p>En la máxima medida permitida por la ley, Noctua no será responsable de daños indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso de la Plataforma. Nuestra responsabilidad total por cualquier reclamación no excederá el importe pagado por ti por el uso de la Plataforma en los 12 meses anteriores a la reclamación.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. Exclusión de garantías</h2>
            <p>La Plataforma se ofrece &quot;tal cual&quot; y &quot;según disponibilidad&quot;, sin garantías de ningún tipo, expresas o implícitas. No garantizamos que la Plataforma esté libre de interrupciones o errores.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. Cancelación de cuenta</h2>
            <p>Nos reservamos el derecho de suspender o cancelar tu cuenta a nuestra discreción si incumples estos Términos de Servicio. Puedes eliminar tu cuenta en cualquier momento desde tu página de Perfil.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">11. Ley aplicable</h2>
            <p>Estos Términos de Servicio se rigen por las leyes de España. Cualquier disputa quedará sujeta a la jurisdicción exclusiva de los tribunales de Barcelona, España.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">12. Contacto</h2>
            <p>Para cualquier pregunta sobre estos Términos de Servicio, contáctanos en <a href="mailto:info@noctuaapp.com" className="text-purple-400 hover:text-purple-300 transition-colors">info@noctuaapp.com</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}