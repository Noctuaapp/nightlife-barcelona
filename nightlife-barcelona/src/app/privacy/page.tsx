"use client"

import { useLanguage } from "../../context/LanguageContext"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"

export default function PrivacyPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-3">{t("privacy.title")}</h1>
          <p className="text-white/40 text-sm">{t("privacy.last_updated")}</p>
        </div>
        <div className="space-y-10 text-white/65 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. Quiénes somos</h2>
            <p>Noctua (&quot;nosotros&quot;, &quot;nuestro&quot;) es una plataforma de descubrimiento de vida nocturna centrada en Barcelona. Operamos el sitio web y la aplicación disponibles en noctuaapp.com. Para cualquier consulta relacionada con privacidad, contáctanos en <a href="mailto:info@noctuaapp.com" className="text-purple-400 hover:text-purple-300 transition-colors">info@noctuaapp.com</a>.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. Datos que recopilamos</h2>
            <p className="mb-3">Recopilamos las siguientes categorías de datos:</p>
            <ul className="space-y-2 pl-4">
              {[
                { label: "Datos de cuenta", desc: "Dirección de correo electrónico y contraseña cifrada al registrarte." },
                { label: "Datos de uso", desc: "Páginas visitadas, clubs y eventos vistos, y búsquedas realizadas." },
                { label: "Favoritos", desc: "Clubs, eventos y noches de club que decidas guardar." },
                { label: "Mensajes de contacto", desc: "Cualquier mensaje que nos envíes a través de la página de Contacto." },
                { label: "Datos del dispositivo", desc: "Tipo de navegador, tipo de dispositivo y ubicación aproximada (a nivel de país/ciudad) para análisis." },
              ].map(({ label, desc }) => (
                <li key={label} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span><span className="text-white/80 font-medium">{label}:</span> {desc}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. Cómo usamos tus datos</h2>
            <p className="mb-3">Usamos los datos que recopilamos para:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Proporcionar y operar la plataforma Noctua.",
                "Guardar y mostrar tus clubs, eventos y noches de club favoritos.",
                "Responder a mensajes y solicitudes de soporte.",
                "Mejorar la plataforma en base a patrones de uso.",
                "Enviar comunicaciones importantes del servicio (sin marketing sin tu consentimiento).",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. Base legal (RGPD)</h2>
            <p>Procesamos tus datos bajo las siguientes bases legales definidas por el Reglamento General de Protección de Datos (RGPD): ejecución de contrato (para prestarte el servicio al que te suscribiste), interés legítimo (para mejorar y proteger la plataforma) y consentimiento (para comunicaciones opcionales). Puedes retirar tu consentimiento en cualquier momento.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Almacenamiento y seguridad de los datos</h2>
            <p>Tus datos se almacenan de forma segura mediante Supabase, que ofrece cifrado de nivel profesional tanto en reposo como en tránsito. No vendemos tus datos personales a terceros. El acceso a los datos personales está restringido únicamente a personal autorizado.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Conservación de datos</h2>
            <p>Conservamos los datos de tu cuenta mientras esta permanezca activa. Si eliminas tu cuenta, todos los datos personales asociados se eliminarán de forma permanente en un plazo de 30 días. Los mensajes de contacto se conservan hasta 12 meses con fines de soporte.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Tus derechos</h2>
            <p className="mb-3">Bajo el RGPD, tienes derecho a:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Acceder a los datos personales que tenemos sobre ti.",
                "Solicitar la corrección de datos inexactos.",
                "Solicitar la eliminación de tus datos ('derecho al olvido').",
                "Oponerte o restringir el tratamiento de tus datos.",
                "Recibir una copia de tus datos en un formato portable.",
                "Presentar una reclamación ante tu autoridad local de protección de datos.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">Para ejercer cualquiera de estos derechos, contáctanos en <a href="mailto:info@noctuaapp.com" className="text-purple-400 hover:text-purple-300 transition-colors">info@noctuaapp.com</a>.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Cookies</h2>
            <p>Usamos únicamente cookies esenciales necesarias para la autenticación y la gestión de sesión. No usamos cookies publicitarias ni de seguimiento. Ninguna red publicitaria de terceros tiene acceso a tus datos.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. Servicios de terceros</h2>
            <p>Usamos Supabase para los servicios de autenticación y base de datos. Supabase procesa los datos de acuerdo con el RGPD. No compartimos tus datos personales con ningún otro tercero salvo que la ley lo exija.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. Inicio de sesión con Google</h2>
            <p className="mb-3">Noctua permite a los usuarios iniciar sesión con su cuenta de Google mediante Google OAuth 2.0. Cuando eliges iniciar sesión con Google, recibimos la siguiente información de Google:</p>
            <ul className="space-y-2 pl-4">
              {[
                { label: "Nombre", desc: "Tu nombre de perfil registrado en Google." },
                { label: "Correo electrónico", desc: "Usado para crear e identificar tu cuenta de Noctua." },
                { label: "Foto de perfil", desc: "Mostrada opcionalmente en tu perfil de Noctua." },
              ].map(({ label, desc }) => (
                <li key={label} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span><span className="text-white/80 font-medium">{label}:</span> {desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">No accedemos a tus contactos de Google, Google Drive, Gmail ni a ningún otro servicio de Google. Los datos recibidos de Google se usan únicamente para crear y gestionar tu cuenta de Noctua. Puedes revocar el acceso de Noctua a tu cuenta de Google en cualquier momento desde tu <a href="https://myaccount.google.com/permissions" target="_blank" className="text-purple-400 hover:text-purple-300 transition-colors">configuración de cuenta de Google</a>.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">11. Cambios en esta política</h2>
            <p>Podemos actualizar esta Política de Privacidad de vez en cuando. Cuando lo hagamos, actualizaremos la fecha en la parte superior de esta página. El uso continuado de Noctua tras los cambios constituye la aceptación de la política actualizada.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">12. Contacto</h2>
            <p>Para cualquier pregunta sobre esta Política de Privacidad, contáctanos en <a href="mailto:info@noctuaapp.com" className="text-purple-400 hover:text-purple-300 transition-colors">info@noctuaapp.com</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}