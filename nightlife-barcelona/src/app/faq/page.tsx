"use client"

import { useState } from "react"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"

const faqs = [
  {
    category: "General",
    items: [
      {
        q: "What is Noctua?",
        a: "Noctua is Barcelona's nightlife discovery platform. We help you find the best clubs, events, and club nights happening in the city — all in one place.",
      },
      {
        q: "Is Noctua free to use?",
        a: "Yes, Noctua is completely free for users. Browse clubs, discover events, and save your favorites at no cost.",
      },
      {
        q: "Which cities does Noctua cover?",
        a: "We currently focus exclusively on Barcelona. Expansion to Madrid, Ibiza, and other cities is planned for future phases.",
      },
    ],
  },
  {
    category: "Account",
    items: [
      {
        q: "Do I need an account to use Noctua?",
        a: "You can browse clubs and events without an account. However, creating a free account lets you save favorites and access personalised features.",
      },
      {
        q: "How do I create an account?",
        a: "Tap the profile icon or visit /signup. You only need an email address and a password.",
      },
      {
        q: "How do I change my password?",
        a: "Go to your Profile and tap Change Password. You will receive a link to reset it securely via email.",
      },
      {
        q: "How do I delete my account?",
        a: "You can request account deletion from your Profile page. All your data, including saved favorites, will be permanently removed.",
      },
    ],
  },
  {
    category: "Clubs & Events",
    items: [
      {
        q: "How do I save a club or event?",
        a: "Tap the heart icon on any club card or event page. You will find all your saved items under Favorites in the bottom navigation.",
      },
      {
        q: "What does Trending mean?",
        a: "Trending clubs are those currently generating the most interest in Barcelona's nightlife scene, updated regularly by our team.",
      },
      {
        q: "What does Sold Out mean?",
        a: "Sold Out indicates that tickets or entry for a specific event or club night are no longer available.",
      },
      {
        q: "Can I buy tickets through Noctua?",
        a: "Ticketing integrations are coming in a future update. For now, we link directly to official ticket sources where available.",
      },
    ],
  },
  {
    category: "Listings & Partnerships",
    items: [
      {
        q: "How can I get my venue listed on Noctua?",
        a: "Use our Contact page and select Suggest a Venue or Club Partnership. Our team reviews all submissions and will get back to you.",
      },
      {
        q: "I found incorrect information about a venue. How do I report it?",
        a: "Use the Contact page and select Report an Issue. Include the venue name and the incorrect details. We will update it promptly.",
      },
    ],
  },
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  const toggle = (key: string) => {
    setOpenIndex(openIndex === key ? null : key)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 py-16 max-w-2xl mx-auto w-full">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-white/50 text-sm">
            Everything you need to know about Noctua.
          </p>
        </div>

        <div className="space-y-10">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-4">
                {section.category}
              </h2>
              <div className="space-y-2">
                {section.items.map((item, i) => {
                  const key = `${section.category}-${i}`
                  const isOpen = openIndex === key
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-white/8 overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 cursor-pointer"
                      >
                        <span className="text-white/90 text-sm font-medium leading-snug">
                          {item.q}
                        </span>
                        <span
                          className="text-white/40 text-lg flex-shrink-0 transition-transform duration-200"
                          style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                        >
                          +
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4">
                          <p className="text-white/55 text-sm leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-14 rounded-2xl border border-white/8 p-8 text-center"
          style={{ background: "rgba(168,85,247,0.06)" }}
        >
          <p className="text-white/80 font-medium mb-1">Still have questions?</p>
          <p className="text-white/40 text-sm mb-5">Our team is happy to help.</p>
          
          <a href="/contact"
            className="inline-block px-6 py-2.5 rounded-full text-sm font-medium text-white border border-white/20 hover:bg-white/10 transition-colors"
          >
            Contact us
          </a>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}