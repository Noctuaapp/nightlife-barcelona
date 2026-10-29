import { POLL_VOTES_KEY, type KeyValueStore } from "./consent"

// Qué se ha votado ya en «¿Qué prefieres?» desde ESTE dispositivo, para quien juega sin cuenta
// (30/10/2026): { "id-de-la-pregunta": día en que se votó }. Con cuenta se mira la base de datos y
// esto no hace falta. Solo se guarda con permiso de cookies (lib/consent.ts): quien lo rechaza no
// recibe la encuesta sin cuenta, porque no habría forma de recordar que ya votó.
// Solo es memoria para no repetir preguntas: no identifica a nadie ni sale del dispositivo.

export type LocalVotes = Record<string, number>

const MAX_ENTRIES = 400 // sobra: hay unas 200 preguntas

export function parseLocalVotes(raw: string | null | undefined): LocalVotes {
  if (!raw) return {}
  try {
    const o = JSON.parse(raw)
    const out: LocalVotes = {}
    if (o && typeof o === "object" && !Array.isArray(o)) {
      for (const [id, day] of Object.entries(o)) {
        if (id && id.length <= 60 && typeof day === "number" && Number.isFinite(day)) out[id] = day
      }
    }
    return out
  } catch {
    return {}
  }
}

export function readLocalVotes(store: KeyValueStore | null): LocalVotes {
  try {
    return parseLocalVotes(store?.getItem(POLL_VOTES_KEY))
  } catch {
    return {}
  }
}

export function recordLocalVote(store: KeyValueStore | null, pollId: string, day: number): void {
  if (!store || !pollId) return
  try {
    const votes = readLocalVotes(store)
    votes[pollId] = day
    const ids = Object.keys(votes)
    if (ids.length > MAX_ENTRIES) {
      // Se olvidan las más antiguas.
      ids.sort((a, b) => votes[a] - votes[b]).slice(0, ids.length - MAX_ENTRIES).forEach((id) => delete votes[id])
    }
    store.setItem(POLL_VOTES_KEY, JSON.stringify(votes))
  } catch {
    /* sin almacenamiento: la encuesta volverá a salir, nada más */
  }
}

export function votedOnDay(votes: LocalVotes, day: number): boolean {
  return Object.values(votes).some((d) => d === day)
}
