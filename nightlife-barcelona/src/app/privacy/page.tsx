import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-white/40 text-sm">Last updated: June 2026</p>
        </div>
        <div className="space-y-10 text-white/65 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-base mb-3">1. Who we are</h2>
            <p>Noctua (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a nightlife discovery platform focused on Barcelona. We operate the website and application available at noctuaapp.com. For any privacy-related queries, contact us at{" "}<a href="mailto:info@noctuaapp.com" className="text-purple-400 hover:text-purple-300 transition-colors">info@noctuaapp.com</a>.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">2. Data we collect</h2>
            <p className="mb-3">We collect the following categories of data:</p>
            <ul className="space-y-2 pl-4">
              {[
                { label: "Account data", desc: "Email address and encrypted password when you register." },
                { label: "Usage data", desc: "Pages visited, clubs and events viewed, and search queries." },
                { label: "Favorites", desc: "Clubs, events, and club nights you choose to save." },
                { label: "Contact messages", desc: "Any messages you send us through the Contact page." },
                { label: "Device data", desc: "Browser type, device type, and approximate location (country/city level) for analytics." },
              ].map(({ label, desc }) => (
                <li key={label} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span><span className="text-white/80 font-medium">{label}:</span> {desc}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">3. How we use your data</h2>
            <p className="mb-3">We use the data we collect to:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Provide and operate the Noctua platform.",
                "Save and display your favorite clubs, events, and club nights.",
                "Respond to messages and support requests.",
                "Improve the platform based on usage patterns.",
                "Send important service communications (no marketing without consent).",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">4. Legal basis (GDPR)</h2>
            <p>We process your data under the following legal bases as defined by the General Data Protection Regulation (GDPR): contract performance (to provide the service you signed up for), legitimate interests (to improve and secure the platform), and consent (for any optional communications). You can withdraw consent at any time.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">5. Data storage and security</h2>
            <p>Your data is stored securely using Supabase, which provides industry-standard encryption at rest and in transit. We do not sell your personal data to third parties. Access to personal data is restricted to authorised personnel only.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">6. Data retention</h2>
            <p>We retain your account data for as long as your account is active. If you delete your account, all associated personal data will be permanently removed within 30 days. Contact messages are retained for up to 12 months for support purposes.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">7. Your rights</h2>
            <p className="mb-3">Under GDPR, you have the right to:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Access the personal data we hold about you.",
                "Request correction of inaccurate data.",
                "Request deletion of your data ('right to be forgotten').",
                "Object to or restrict processing of your data.",
                "Receive a copy of your data in a portable format.",
                "Lodge a complaint with your local data protection authority.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at{" "}<a href="mailto:info@noctuaapp.com" className="text-purple-400 hover:text-purple-300 transition-colors">info@noctuaapp.com</a>.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">8. Cookies</h2>
            <p>We use only essential cookies required for authentication and session management. We do not use advertising or tracking cookies. No third-party ad networks have access to your data.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">9. Third-party services</h2>
            <p>We use Supabase for authentication and database services. Supabase processes data in accordance with GDPR. We do not share your personal data with any other third parties unless required by law.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">10. Google Sign-In</h2>
            <p className="mb-3">Noctua allows users to sign in using their Google account via Google OAuth 2.0. When you choose to sign in with Google, we receive the following information from Google:</p>
            <ul className="space-y-2 pl-4">
              {[
                { label: "Name", desc: "Your display name as registered with Google." },
                { label: "Email address", desc: "Used to create and identify your Noctua account." },
                { label: "Profile picture", desc: "Optionally displayed in your Noctua profile." },
              ].map(({ label, desc }) => (
                <li key={label} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">—</span>
                  <span><span className="text-white/80 font-medium">{label}:</span> {desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">We do not access your Google contacts, Google Drive, Gmail, or any other Google services. The data received from Google is used solely to create and manage your Noctua account. You can revoke Noctua&apos;s access to your Google account at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" className="text-purple-400 hover:text-purple-300 transition-colors">Google Account settings</a>.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">11. Changes to this policy</h2>
            <p>We may update this Privacy Policy from time to time. When we do, we will update the date at the top of this page. Continued use of Noctua after changes constitutes acceptance of the updated policy.</p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-base mb-3">12. Contact</h2>
            <p>For any questions about this Privacy Policy, please contact us at{" "}<a href="mailto:info@noctuaapp.com" className="text-purple-400 hover:text-purple-300 transition-colors">info@noctuaapp.com</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}