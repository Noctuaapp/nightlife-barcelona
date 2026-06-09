import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-white/40 text-sm">Last updated: June 2026</p>
        </div>
        <div className="space-y-10 text-white/65 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. Acceptance of terms</h2>
            <p>By accessing or using Noctua (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. We reserve the right to update these terms at any time; continued use constitutes acceptance of any changes.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. Description of service</h2>
            <p>Noctua is a nightlife discovery platform that provides information about clubs, events, and nightlife in Barcelona. We are an information platform — we do not operate venues, organise events, or sell tickets directly.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. User accounts</h2>
            <p className="mb-3">When you create an account, you agree to:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Provide accurate and complete information.",
                "Keep your password secure and confidential.",
                "Notify us immediately of any unauthorised use of your account.",
                "Be responsible for all activity that occurs under your account.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">You must be at least 18 years old to create an account on Noctua, in line with the nature of nightlife content.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. Acceptable use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Use the Platform for any unlawful purpose.",
                "Scrape, copy, or reproduce any content without permission.",
                "Attempt to gain unauthorised access to any part of the Platform.",
                "Submit false, misleading, or defamatory information.",
                "Interfere with or disrupt the Platform's operation.",
                "Use the Platform to send unsolicited commercial communications.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Content accuracy</h2>
            <p>We strive to keep all venue and event information accurate and up to date. However, we cannot guarantee the accuracy, completeness, or timeliness of any information on the Platform. Always verify details directly with the venue before attending.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Intellectual property</h2>
            <p>All content on the Platform, including text, graphics, logos, and design, is the property of Noctua or its content suppliers and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Third-party links</h2>
            <p>The Platform may contain links to third-party websites, including venue websites and ticketing platforms. These links are provided for convenience only. We have no control over and assume no responsibility for the content or practices of any third-party sites.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Limitation of liability</h2>
            <p>To the fullest extent permitted by law, Noctua shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability for any claim shall not exceed the amount paid by you to use the Platform in the 12 months preceding the claim.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. Disclaimer of warranties</h2>
            <p>The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, either express or implied. We do not warrant that the Platform will be uninterrupted or error-free.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. Account termination</h2>
            <p>We reserve the right to suspend or terminate your account at our discretion if you breach these Terms of Service. You may delete your account at any time from your Profile page.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">11. Governing law</h2>
            <p>These Terms of Service are governed by the laws of Spain. Any disputes shall be subject to the exclusive jurisdiction of the courts of Barcelona, Spain.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">12. Contact</h2>
            <p>For any questions about these Terms of Service, please contact us at{" "}<a href="mailto:info@noctuaapp.com" className="text-purple-400 hover:text-purple-300 transition-colors">info@noctuaapp.com</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}