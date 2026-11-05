// «El veredicto» de la encuesta del día (05/11/2026).
//
// Antes, al votar solo salían los porcentajes. Ahora, además, Noc te dice qué tal te ha ido contra el
// resto: «eres de los raros», «ciudad dividida», «pensamiento único»… según qué porcentaje de gente ha
// elegido lo mismo que tú. Es solo texto y cuentas: sin datos nuevos, sin guardar nada.
// Textos en es / ca / en (el resto de idiomas usan el inglés, igual que las preguntas).
//
// Con muy pocos votos el porcentaje no dice nada (1 voto = 100 %), así que hasta MIN_VOTES solo se
// dice que eres de los primeros.

export type VerdictBucket = "early" | "rare" | "minor" | "split" | "major" | "crush"
export type VerdictLocale = "es" | "ca" | "en"
export type VerdictText = { title: string; line: string }

export const MIN_VOTES = 8
export const DOTS = 20 // cada punto = 5 %

// Porcentaje (entero) de los votos que eligió lo mismo que tú.
export function verdictPct(mine: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((Math.max(0, mine) / total) * 100)
}

export function verdictBucket(mine: number, total: number): VerdictBucket {
  if (total < MIN_VOTES) return "early"
  const p = verdictPct(mine, total)
  if (p <= 20) return "rare"
  if (p <= 39) return "minor"
  if (p <= 60) return "split"
  if (p <= 79) return "major"
  return "crush"
}

// Puntos encendidos de 20 para ese porcentaje (al menos 1 si hay algún voto como el tuyo, que siempre
// lo hay: el tuyo).
export function dotsFilled(pct: number): number {
  return Math.min(DOTS, Math.max(1, Math.round((pct / 100) * DOTS)))
}

export const VERDICTS: Record<VerdictLocale, Record<VerdictBucket, VerdictText[]>> = {
  es: {
    early: [
      { title: "Eres de los primeros", line: "Todavía es pronto para compararte. Vuelve esta noche y mira cómo cambia." },
      { title: "Has abierto la veda", line: "Es pronto para juzgar a nadie. Vuelve luego." },
    ],
    rare: [
      { title: "Eres de los raros", line: "Solo el {p}% piensa como tú. En el grupo de WhatsApp esta la pierdes." },
      { title: "Rareza detectada", line: "El {p}% contigo. O eres un visionario o llevas demasiado sin salir." },
    ],
    minor: [
      { title: "Vas a contracorriente", line: "El {p}% piensa como tú. Poca gente, pero seguro que la mejor." },
      { title: "Minoría con estilo", line: "{p}% contra {q}%. Las mejores fiestas las montan las minorías." },
    ],
    split: [
      { title: "Ciudad dividida", line: "{p}% contra {q}%. Esta pregunta rompe grupos de WhatsApp." },
      { title: "Empate técnico", line: "Casi mitad y mitad. Alguien va a discutir esto en el afterhour." },
    ],
    major: [
      { title: "Con la mayoría", line: "El {p}% elige lo mismo que tú. Sois muchos y se os nota." },
      { title: "Voz del pueblo", line: "El {p}% opina como tú. Hoy el pueblo ha hablado." },
    ],
    crush: [
      { title: "Pensamiento único", line: "El {p}% opina igual. Aquí no hay debate, hay unanimidad." },
      { title: "Aplastante", line: "{p}% contigo. Si querías pelea, hoy no encuentras rival." },
    ],
  },
  ca: {
    early: [
      { title: "Ets dels primers", line: "Encara és d'hora per comparar-te. Torna aquesta nit i mira com canvia." },
      { title: "Has obert el ball", line: "És d'hora per jutjar ningú. Torna més tard." },
    ],
    rare: [
      { title: "Ets dels rars", line: "Només el {p}% pensa com tu. Al grup de WhatsApp aquesta la perds." },
      { title: "Raresa detectada", line: "El {p}% amb tu. O ets un visionari o fa massa que no surts." },
    ],
    minor: [
      { title: "Vas a contracorrent", line: "El {p}% pensa com tu. Poca gent, però segur que la millor." },
      { title: "Minoria amb estil", line: "{p}% contra {q}%. Les millors festes les munten les minories." },
    ],
    split: [
      { title: "Ciutat dividida", line: "{p}% contra {q}%. Aquesta pregunta trenca grups de WhatsApp." },
      { title: "Empat tècnic", line: "Gairebé meitat i meitat. Algú ho discutirà a l'afterhour." },
    ],
    major: [
      { title: "Amb la majoria", line: "El {p}% tria el mateix que tu. Sou molts i es nota." },
      { title: "Veu del poble", line: "El {p}% opina com tu. Avui ha parlat el poble." },
    ],
    crush: [
      { title: "Pensament únic", line: "El {p}% opina igual. Aquí no hi ha debat, hi ha unanimitat." },
      { title: "Aclaparador", line: "{p}% amb tu. Si volies baralla, avui no trobes rival." },
    ],
  },
  en: {
    early: [
      { title: "You're among the first", line: "Too early to compare you. Come back tonight and watch it move." },
      { title: "You broke the seal", line: "Too early to judge anyone. Check back later." },
    ],
    rare: [
      { title: "Odd one out", line: "Only {p}% think like you. You'll lose this one in the group chat." },
      { title: "Rare breed", line: "{p}% with you. Either you're a visionary or you need to go out more." },
    ],
    minor: [
      { title: "Against the current", line: "{p}% think like you. Not many, but probably the best ones." },
      { title: "Stylish minority", line: "{p}% to {q}%. The best parties are thrown by minorities." },
    ],
    split: [
      { title: "City divided", line: "{p}% to {q}%. This question breaks group chats." },
      { title: "Dead heat", line: "Almost fifty-fifty. Someone will argue about this at the afterhours." },
    ],
    major: [
      { title: "With the crowd", line: "{p}% picked what you picked. There are a lot of you and it shows." },
      { title: "Voice of the people", line: "{p}% agree with you. Today the people have spoken." },
    ],
    crush: [
      { title: "Hive mind", line: "{p}% think the same. This isn't a debate, it's unanimity." },
      { title: "Landslide", line: "{p}% with you. If you wanted a fight, nobody's up for it today." },
    ],
  },
}

const localeOf = (locale: string): VerdictLocale => (locale === "es" ? "es" : locale === "ca" ? "ca" : "en")

// Número estable a partir de un texto (el id de la pregunta), para que la misma pregunta enseñe
// siempre la misma frase y no cambie al abrir otra vez.
function seedOf(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}

export function verdictText(locale: string, mine: number, total: number, seed: string): VerdictText & { bucket: VerdictBucket; pct: number } {
  const bucket = verdictBucket(mine, total)
  const p = verdictPct(mine, total)
  const options = VERDICTS[localeOf(locale)][bucket]
  const pick = options[seedOf(seed) % options.length]
  const fill = (s: string) => s.replaceAll("{p}", String(p)).replaceAll("{q}", String(100 - p))
  return { bucket, pct: p, title: fill(pick.title), line: fill(pick.line) }
}

// Mood del búho según el veredicto.
export function verdictOwlMood(bucket: VerdictBucket): "happy" | "wink" | "sleepy" | "party" | "wow" {
  switch (bucket) {
    case "rare":
    case "minor":
      return "wow"
    case "split":
      return "wink"
    case "major":
      return "happy"
    case "crush":
      return "sleepy"
    default:
      return "party"
  }
}

export const SHARE_TEXT: Record<VerdictLocale, { picked: string; early: string }> = {
  es: { picked: "Elegí «{choice}» en Noctua y el {p}% piensa igual. ¿Y tú qué eliges?", early: "Hoy me ha tocado elegir en Noctua: «{choice}». ¿Y tú?" },
  ca: { picked: "He triat «{choice}» a Noctua i el {p}% pensa igual. I tu què tries?", early: "Avui m'ha tocat triar a Noctua: «{choice}». I tu?" },
  en: { picked: "I picked «{choice}» on Noctua and {p}% think the same. What would you pick?", early: "Today's pick on Noctua: «{choice}». What would you pick?" },
}

export function shareText(locale: string, choice: string, bucket: VerdictBucket, pct: number): string {
  const tpl = SHARE_TEXT[localeOf(locale)]
  return (bucket === "early" ? tpl.early : tpl.picked).replaceAll("{choice}", choice).replaceAll("{p}", String(pct))
}
