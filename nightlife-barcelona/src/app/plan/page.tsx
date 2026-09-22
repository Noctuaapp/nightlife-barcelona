"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

const musicTypes = ["Any", "Techno", "Commercial", "House", "Reggaeton", "Rock", "Cocktail Bar"]
const neighborhoodOptions = ["Anywhere", "Eixample", "Gràcia", "Barceloneta", "Poblenou", "Raval", "El Born", "Parallel", "Les Corts", "Montjuïc"]
const dresscodeOptions = ["Any", "Casual", "Smart casual", "Elegant", "Dark casual"]
const vibeOptions = [
  { emoji: "🔥", label: "Party hard", music: "Commercial", area: "Anywhere", time: "late" },
  { emoji: "💜", label: "Chill vibes", music: "Cocktail Bar", area: "Anywhere", time: "early" },
  { emoji: "🕺", label: "Dance all night", music: "Techno", area: "Anywhere", time: "peak" },
  { emoji: "🍸", label: "Cocktails & talk", music: "Cocktail Bar", area: "Eixample", time: "early" },
  { emoji: "🌊", label: "Beach vibes", music: "Any", area: "Barceloneta", time: "early" },
  { emoji: "🎶", label: "Live music", music: "Any", area: "Anywhere", time: "early" },
]

export default function PlanPage() {
  const { t } = useLanguage()
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

  const timeOptions = [
    { label: t("plan.early"), sublabel: "antes de la 1AM", value: "early", emoji: "🌙" },
    { label: t("plan.peak"), sublabel: "1AM – 3AM", value: "peak", emoji: "🔥" },
    { label: t("plan.late"), sublabel: "después de las 3AM", value: "late", emoji: "🌅" },
  ]

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
      if (music !== "Any" && !club.music?.toLowerCase().includes(music.toLowerCase())) return false
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
- Time: ${timeOptions.find(t => t.value === time)?.label}
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
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("common.loading")}</p>
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
            <h1 className="text-4xl font-black text-white">{t("plan.title")}</h1>
            <p className="mt-4 text-zinc-400 text-lg leading-relaxed">{t("plan.subtitle")}</p>
            <div className="mt-8 flex gap-4 justify-center">
              <Link href="/signup" className="rounded-full bg-white px-8 py-4 font-bold text-black hover:scale-105 transition">{t("nav.signup")}</Link>
              <Link href="/login" className="rounded-full border border-white/10 bg-white/5 px-8 py-4 font-bold text-white hover:bg-white/10 transition">{t("nav.login")}</Link>
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

        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-14 pb-10">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-pink-500/5 to-transparent" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 mb-6">
              ✨ Noctua AI
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white md:text-7xl">{t("plan.title")}</h1>
            <p className="mt-4 max-w-xl mx-auto text-lg leading-relaxed text-zinc-400">{t("plan.subtitle")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4">
          <div className="space-y-4">

            {/* GROUP + BUDGET */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">{t("plan.group")}</p>
                  <p className="text-3xl font-black text-white">{group > 14 ? "15+" : group} <span className="text-sm font-normal text-zinc-500">{t("plan.people")}</span></p>
                </div>
                <input type="range" min={1} max={15} step={1} value={group} onChange={(e) => setGroup(Number(e.target.value))} className="w-full accent-purple-500" />
                <div className="flex justify-between text-xs text-zinc-600 mt-2"><span>1</span><span>15+</span></div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">{t("plan.budget")}</p>
                  <p className="text-3xl font-black text-white">{budget >= 200 ? "€200+" : `€${budget}`}</p>
                </div>
                <input type="range" min={0} max={200} step={5} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-pink-500" />
                <div className="flex justify-between text-xs text-zinc-600 mt-2"><span>Gratis</span><span>€200+</span></div>
              </div>
            </div>

            {/* TIME */}
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{t("plan.time")}</p>
              <div className="grid grid-cols-3 gap-3">
                {timeOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setTime(opt.value)}
                    className="rounded-2xl border py-4 text-center transition"
                    style={{
                      borderColor: time === opt.value ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.08)",
                      background: time === opt.value ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.02)"
                    }}>
                    <p className="text-2xl mb-1">{opt.emoji}</p>
                    <p className={`font-bold text-sm ${time === opt.value ? "text-white" : "text-zinc-300"}`}>{opt.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{opt.sublabel}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* VIBE */}
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{t("plan.vibe")}</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {vibeOptions.map((v) => {
                  const val = `${v.emoji} ${v.label}`
                  return (
                    <button key={val} onClick={() => {
                      if (vibe === val) {
                        setVibe("")
                      } else {
                        setVibe(val)
                        setMusic(v.music)
                        setNeighborhood(v.area)
                        setTime(v.time)
                      }
                    }}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition text-left ${vibe === val ? "border-purple-500/40 bg-purple-500/10 text-white" : "border-white/10 bg-white/[0.02] text-zinc-300 hover:bg-white/5"}`}>
                      <span className="text-xl mr-2">{v.emoji}</span>{v.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* MUSIC + AREA */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{t("plan.music")}</p>
                <div className="flex gap-2 flex-wrap">
                  {musicTypes.map((m) => (
                    <button key={m} onClick={() => setMusic(m)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${music === m ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{t("plan.area")}</p>
                <div className="flex gap-2 flex-wrap">
                  {neighborhoodOptions.map((n) => (
                    <button key={n} onClick={() => setNeighborhood(n)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${neighborhood === n ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DRESSCODE + LGTBI */}
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{t("plan.dresscode")}</p>
                  <div className="flex gap-2 flex-wrap">
                    {dresscodeOptions.map((d) => (
                      <button key={d} onClick={() => setDresscode(d)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${dresscode === d ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{t("plan.lgtbi")}</p>
                  <button onClick={() => setLgtbi(!lgtbi)}
                    className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${lgtbi ? "border-pink-500/40 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                    🏳️‍🌈 LGTBI+ friendly
                  </button>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button onClick={generatePlan} disabled={generating}
              className="w-full rounded-[28px] py-6 font-black text-xl text-white transition hover:scale-[1.01] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}>
              {generating ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {t("plan.finding")}
                </span>
              ) : t("plan.find")}
            </button>
          </div>
        </section>

        {/* RESULTS */}
        {generated && (
          <section id="results" className="mx-auto mt-14 max-w-4xl px-4">
            <div className="space-y-10">

              {aiResponse?.intro && (
                <div className="rounded-[28px] p-8" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.10) 100%)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <p className="text-xs uppercase tracking-widest text-purple-300 mb-3">{t("plan.results")}</p>
                  <p className="text-xl text-white leading-relaxed font-medium">{aiResponse.intro}</p>
                  {aiResponse.tip && (
                    <div className="mt-5 rounded-2xl bg-white/5 px-5 py-4 border border-white/10">
                      <p className="text-xs text-zinc-500 mb-1">{t("plan.tip")}</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{aiResponse.tip}</p>
                    </div>
                  )}
                </div>
              )}

              {suggestedClubs.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">{t("plan.clubs_for_you")}</p>
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {suggestedClubs.map((club) => {
                      const reason = aiResponse?.clubs?.find((c: any) => c.id === club.id)?.reason
                      return (
                        <Link key={club.id} href={`/clubs/${createSlug(club.name)}`}
                          className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] hover:border-white/20 hover:scale-[1.02] transition">
                          <div className="relative h-48 overflow-hidden">
                            <img src={club.image || "/clubs/razz.jpg"} alt={club.name} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-4">
                              <p className="text-xs text-zinc-400 uppercase tracking-wide">{club.music}</p>
                              <h3 className="text-xl font-black text-white">{club.name}</h3>
                            </div>
                            {club.trending && (
                              <div className="absolute top-3 right-3 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
                                🔥 Trending
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            {reason && <p className="text-sm text-zinc-400 mb-3 leading-relaxed italic">"{reason}"</p>}
                            <div className="flex flex-wrap gap-2">
                              {club.neighborhood && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">📍 {club.neighborhood}</span>}
                              {club.price && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">🎟 {club.price}</span>}
                              {club.hours && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">🕒 {club.hours}</span>}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {suggestedEvents.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-5">{t("plan.events_tonight")}</p>
                  <div className="grid gap-5 md:grid-cols-2">
                    {suggestedEvents.map((event) => {
                      const reason = aiResponse?.events?.find((e: any) => e.id === event.id)?.reason
                      return (
                        <Link key={event.id} href={`/event/${createSlug(event.title)}`}
                          className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] hover:border-white/20 hover:scale-[1.02] transition">
                          <div className="relative h-48 overflow-hidden">
                            <img src={event.image || "/events/gracia.jpg"} alt={event.title} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-4">
                              {event.date && <p className="text-xs text-zinc-400">{new Date(event.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>}
                              <h3 className="text-xl font-black text-white">{event.title}</h3>
                            </div>
                          </div>
                          <div className="p-4">
                            {reason && <p className="text-sm text-zinc-400 mb-3 leading-relaxed italic">"{reason}"</p>}
                            <div className="flex flex-wrap gap-2">
                              {event.price && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">🎟 {event.price}</span>}
                              {event.start_time && <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">🕒 {event.start_time}</span>}
                              {event.featured && <span className="rounded-full bg-pink-500/20 border border-pink-500/30 px-3 py-1 text-xs text-pink-300">⭐ Destacado</span>}
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
                {t("plan.generate_new")}
              </button>
            </div>
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}