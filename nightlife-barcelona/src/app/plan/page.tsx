"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

const musicTypes = ["Any", "Techno", "Commercial", "House", "Reggaeton", "Rock", "Cocktail Bar"]
const neighborhoodOptions = ["Anywhere", "Eixample", "Gràcia", "Barceloneta", "Poblenou", "Raval", "El Born", "Parallel", "Les Corts", "Montjuïc"]
const dresscodeOptions = ["Any", "Casual", "Smart casual", "Elegant", "Dark casual"]
const timeOptions = [
  { label: "Early", sublabel: "before 1AM", value: "early" },
  { label: "Peak", sublabel: "1AM – 3AM", value: "peak" },
  { label: "Late", sublabel: "after 3AM", value: "late" },
]
const vibeOptions = ["🔥 Party hard", "💜 Chill vibes", "🕺 Dance all night", "🍸 Cocktails & talk", "🌊 Beach vibes", "🎶 Live music"]

export default function PlanPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [clubs, setClubs] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const [group, setGroup] = useState(2)
  const [budget, setBudget] = useState(25)
  const [music, setMusic] = useState("Any")
  const [neighborhood, setNeighborhood] = useState("Anywhere")
  const [dresscode, setDresscode] = useState("Any")
  const [time, setTime] = useState("peak")
  const [vibe, setVibe] = useState("")
  const [lgtbi, setLgtbi] = useState(false)

  const [aiResponse, setAiResponse] = useState<{
    intro: string
    clubs: { id: number; reason: string }[]
    events: { id: number; reason: string }[]
    tip: string
  } | null>(null)

  const [suggestedClubs, setSuggestedClubs] = useState<any[]>([])
  const [suggestedEvents, setSuggestedEvents] = useState<any[]>([])

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
    }
    checkSession()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: clubsData }, { data: eventsData }] = await Promise.all([
        supabase.from("clubs").select("*").eq("hidden", false),
        supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true }),
      ])
      if (clubsData) setClubs(clubsData)
      if (eventsData) setEvents(eventsData)
      setLoading(false)
    }
    fetchData()
  }, [])

  const generatePlan = async () => {
    setGenerating(true)
    setGenerated(false)

    const parseBudget = (price: string | null) => {
      if (!price) return 0
      const num = parseInt(price.replace(/[^0-9]/g, ""))
      return isNaN(num) ? 0 : num
    }

    const filteredClubs = clubs.filter((club) => {
      if (club.sold_out) return false
      if (music !== "Any" && club.music !== music) return false
      if (neighborhood !== "Anywhere" && club.neighborhood !== neighborhood) return false
      if (budget < 200 && parseBudget(club.price) > budget) return false
      if (lgtbi && !club.lgtbi_friendly) return false
      return true
    }).slice(0, 15)

    const filteredEvents = events.filter((event) => {
      if (event.sold_out) return false
      if (budget < 200 && event.price?.toLowerCase() !== "free" && parseBudget(event.price) > budget) return false
      return true
    }).slice(0, 10)

    const prompt = `You are Noctua, a Barcelona nightlife expert AI. A user wants help planning their night out in Barcelona.

User preferences:
- Group size: ${group > 14 ? "15+" : group} people
- Budget per person: ${budget >= 200 ? "€200+" : `€${budget}`}
- Music preference: ${music}
- Area: ${neighborhood}
- Dress code: ${dresscode}
- Time: ${timeOptions.find(t => t.value === time)?.label} (${timeOptions.find(t => t.value === time)?.sublabel})
- Vibe: ${vibe || "Not specified"}
- LGTBI+ friendly: ${lgtbi ? "Yes" : "No preference"}

Available clubs:
${filteredClubs.map(c => `ID:${c.id} | ${c.name} | ${c.music} | ${c.neighborhood} | ${c.price} | ${c.hours} | Trending:${c.trending} | LGTBI:${c.lgtbi_friendly}`).join("\n")}

Available events:
${filteredEvents.map(e => `ID:${e.id} | ${e.title} | ${e.date} | ${e.price} | Featured:${e.featured}`).join("\n")}

Respond ONLY with a JSON object, no markdown, no backticks:
{
  "intro": "A short, exciting 1-2 sentence intro personalised to their preferences",
  "clubs": [
    {"id": <club_id>, "reason": "One sentence why this club fits them perfectly"},
    {"id": <club_id>, "reason": "One sentence why this club fits them perfectly"},
    {"id": <club_id>, "reason": "One sentence why this club fits them perfectly"}
  ],
  "events": [
    {"id": <event_id>, "reason": "One sentence why this event fits them"}
  ],
  "tip": "One insider Barcelona nightlife tip relevant to their situation"
}

Pick the 3 best clubs and 1-2 best events. Be specific and enthusiastic. Write in English.`

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      const data = await res.json()
      const text = data.content?.[0]?.text || ""
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())

      setAiResponse(parsed)

      const recommendedClubs = parsed.clubs
        .map((c: any) => clubs.find((club) => club.id === c.id))
        .filter(Boolean)

      const recommendedEvents = parsed.events
        .map((e: any) => events.find((event) => event.id === e.id))
        .filter(Boolean)

      setSuggestedClubs(recommendedClubs)
      setSuggestedEvents(recommendedEvents)
      setGenerated(true)

      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    } catch (e) {
      console.log("AI error:", e)
      // Fallback to random if AI fails
      const shuffleAndPick = (arr: any[], count: number) =>
        [...arr].sort(() => Math.random() - 0.5).slice(0, count)
      setSuggestedClubs(shuffleAndPick(filteredClubs, 3))
      setSuggestedEvents(shuffleAndPick(filteredEvents, 2))
      setGenerated(true)
    } finally {
      setGenerating(false)
    }
  }

  if (isLoggedIn === null || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading...</p>
      </main>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-black text-white px-4">
          <div className="max-w-md text-center">
            <div className="text-7xl mb-6">✨</div>
            <h1 className="text-4xl font-black text-white">Plan your night</h1>
            <p className="mt-4 text-zinc-400 text-lg leading-relaxed">
              Create a free account to get AI-powered nightlife recommendations based on your group, budget and vibe.
            </p>
            <div className="mt-8 flex gap-4 justify-center">
              <Link href="/signup" className="rounded-full bg-white px-8 py-4 font-bold text-black hover:scale-105 transition">Create account</Link>
              <Link href="/login" className="rounded-full border border-white/10 bg-white/5 px-8 py-4 font-bold text-white hover:bg-white/10 transition">Log in</Link>
            </div>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">

        <section className="px-4 pt-14">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Noctua AI</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">Plan your night</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-400">
              Tell us your vibe — our AI will find the perfect spots for tonight in Barcelona.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-4xl px-4">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 md:p-10">

            {/* GROUP + BUDGET */}
            <div className="grid gap-10 md:grid-cols-2">
              <div>
              <div className="flex items-center justify-between mb-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Group size</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-black text-white">{group > 14 ? "15+" : group}</p>
                    <p className="text-base font-normal text-zinc-500">people</p>
                  </div>
                </div>
                <input type="range" min={1} max={15} step={1} value={group} onChange={(e) => setGroup(Number(e.target.value))} className="w-full accent-purple-500" />
                <div className="flex justify-between text-xs text-zinc-600 mt-2"><span>1</span><span>15+</span></div>
              </div>

              <div>
                <div className="flex items-end justify-between mb-5">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Budget per person</p>
                  <p className="text-3xl font-black text-white">{budget >= 200 ? "€200+" : `€${budget}`}</p>
                </div>
                <input type="range" min={0} max={200} step={5} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-pink-500" />
                <div className="flex justify-between text-xs text-zinc-600 mt-2"><span>Free</span><span>€200+</span></div>
              </div>
            </div>

            {/* TIME */}
            <div className="border-t border-white/5 pt-8 mt-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">What time are you going out?</p>
              <div className="grid grid-cols-3 gap-3">
                {timeOptions.map((t) => (
                  <button key={t.value} onClick={() => setTime(t.value)} className="rounded-2xl border py-4 text-center transition"
                    style={{ borderColor: time === t.value ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.08)", background: time === t.value ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.02)" }}>
                    <p className={`font-bold text-sm ${time === t.value ? "text-white" : "text-zinc-300"}`}>{t.label}</p>
                    <p className="text-xs text-zinc-500 mt-1">{t.sublabel}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* VIBE */}
            <div className="border-t border-white/5 pt-8 mt-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">What's your vibe?</p>
              <div className="flex gap-3 flex-wrap">
                {vibeOptions.map((v) => (
                  <button key={v} onClick={() => setVibe(vibe === v ? "" : v)}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${vibe === v ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* MUSIC */}
            <div className="border-t border-white/5 pt-8 mt-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Music</p>
              <div className="flex gap-3 flex-wrap">
                {musicTypes.map((m) => (
                  <button key={m} onClick={() => setMusic(m)}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${music === m ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* DRESSCODE */}
            <div className="border-t border-white/5 pt-8 mt-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Dress code</p>
              <div className="flex gap-3 flex-wrap">
                {dresscodeOptions.map((d) => (
                  <button key={d} onClick={() => setDresscode(d)}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${dresscode === d ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* AREA */}
            <div className="border-t border-white/5 pt-8 mt-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Area</p>
              <div className="flex gap-3 flex-wrap">
                {neighborhoodOptions.map((n) => (
                  <button key={n} onClick={() => setNeighborhood(n)}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${neighborhood === n ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* LGTBI */}
            <div className="border-t border-white/5 pt-8 mt-8">
              <button onClick={() => setLgtbi(!lgtbi)}
                className={`flex items-center gap-3 rounded-2xl border px-6 py-4 text-sm font-semibold transition ${lgtbi ? "border-pink-500/40 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                <span>🏳️‍🌈</span>
                <span>LGTBI+ friendly only</span>
              </button>
            </div>

            {/* CTA */}
            <div className="border-t border-white/5 pt-8 mt-8">
              <button onClick={generatePlan} disabled={generating}
                className="w-full rounded-2xl py-5 font-black text-xl text-white transition hover:scale-[1.01] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}>
                {generating ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Finding your perfect night...
                  </span>
                ) : "✨ Find my night"}
              </button>
            </div>
          </div>
        </section>

        {/* RESULTS */}
        {generated && (
          <section id="results" className="mx-auto mt-14 max-w-4xl px-4">
            <div className="space-y-10">

              {/* AI intro */}
              {aiResponse?.intro && (
                <div className="rounded-[28px] p-6" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.10) 100%)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <p className="text-xs uppercase tracking-widest text-purple-300 mb-3">✨ Your night plan</p>
                  <p className="text-lg text-white leading-relaxed">{aiResponse.intro}</p>
                  {aiResponse.tip && (
                    <div className="mt-4 rounded-2xl bg-white/5 px-4 py-3 border border-white/10">
                      <p className="text-xs text-zinc-500 mb-1">💡 Insider tip</p>
                      <p className="text-sm text-zinc-300">{aiResponse.tip}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Clubs */}
              {suggestedClubs.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Clubs for you</p>
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {suggestedClubs.map((club) => {
                      const reason = aiResponse?.clubs?.find((c: any) => c.id === club.id)?.reason
                      return (
                        <Link key={club.id} href={`/clubs/${createSlug(club.name)}`}
                          className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] hover:border-white/20 hover:scale-[1.02] transition">
                          <div className="relative h-44 overflow-hidden">
                            <img src={club.image || "/clubs/razz.jpg"} alt={club.name} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-4">
                              <p className="text-xs text-zinc-400 uppercase tracking-wide">{club.music}</p>
                              <h3 className="text-xl font-black text-white">{club.name}</h3>
                            </div>
                          </div>
                          <div className="p-4">
                            {reason && <p className="text-sm text-zinc-400 mb-3 leading-relaxed">"{reason}"</p>}
                            <div className="flex flex-wrap gap-2">
                              {club.neighborhood && <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-zinc-300">📍 {club.neighborhood}</span>}
                              {club.price && <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-zinc-300">🎟 {club.price}</span>}
                              {club.hours && <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-zinc-300">🕒 {club.hours}</span>}
                              {club.trending && <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300">🔥 Trending</span>}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Events */}
              {suggestedEvents.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">Events tonight</p>
                  <div className="grid gap-5 md:grid-cols-2">
                    {suggestedEvents.map((event) => {
                      const reason = aiResponse?.events?.find((e: any) => e.id === event.id)?.reason
                      return (
                        <Link key={event.id} href={`/event/${createSlug(event.title)}`}
                          className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] hover:border-white/20 hover:scale-[1.02] transition">
                          <div className="relative h-44 overflow-hidden">
                            <img src={event.image || "/events/gracia.jpg"} alt={event.title} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-4">
                              {event.date && <p className="text-xs text-zinc-400">{new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>}
                              <h3 className="text-xl font-black text-white">{event.title}</h3>
                            </div>
                          </div>
                          <div className="p-4">
                            {reason && <p className="text-sm text-zinc-400 mb-3 leading-relaxed">"{reason}"</p>}
                            <div className="flex flex-wrap gap-2">
                              {event.price && <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-zinc-300">🎟 {event.price}</span>}
                              {event.start_time && <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-zinc-300">🕒 {event.start_time}</span>}
                              {event.featured && <span className="rounded-full bg-pink-500/20 px-3 py-1.5 text-xs text-pink-300">⭐ Featured</span>}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              <button onClick={generatePlan} disabled={generating}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 font-bold text-white hover:bg-white/10 transition disabled:opacity-50">
                🔄 Generate new suggestions
              </button>
            </div>
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}