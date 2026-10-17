"use client"

import { useEffect, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { BLOCK_REASONS, BLOCK_DURATIONS, computeBlockedUntil, type BlockDuration } from "../../../lib/blockReasons"

// Moderación de las notas de check-in que alguien ha denunciado ("¿se puede denunciar el
// perfil o lo que sea?"). Aquí SÍ se ve quién escribió cada nota (en la ficha del club es
// anónima a propósito) para poder bloquear a quien amenace o diga algo que no debería, o
// simplemente descartar la denuncia si la nota es inofensiva.

type ReportRow = { id: number; checkin_id: number; reporter_id: string; reason: string | null; created_at: string }
type CheckinRow = { id: number; user_id: string; club_id: number; note: string | null; note_created_at: string | null }
type Person = { email: string; username: string | null }

type Group = {
  checkinId: number
  note: string
  noteCreatedAt: string | null
  authorId: string
  clubName: string
  reports: { id: number; reporterId: string; createdAt: string }[]
}

export default function AdminNotasPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])
  const [peopleById, setPeopleById] = useState<Record<string, Person>>({})
  const [workingId, setWorkingId] = useState<number | null>(null)

  const [blockTarget, setBlockTarget] = useState<{ checkinId: number; authorId: string; email: string } | null>(null)
  const [blockReason, setBlockReason] = useState("offensive")
  const [blockNote, setBlockNote] = useState("")
  const [blockDuration, setBlockDuration] = useState<BlockDuration>("forever")

  useEffect(() => {
    const checkAdmin = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error || data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    }
    checkAdmin()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    const { data: reports, error: reportsError } = await supabase
      .from("club_checkin_reports")
      .select("id, checkin_id, reporter_id, reason, created_at")
      .is("reviewed_at", null)
      .order("created_at", { ascending: false })
      .limit(300)

    if (reportsError) {
      logError("NOTAS REPORTS ERROR:", reportsError)
      setLoading(false)
      return
    }

    const rows = (reports || []) as ReportRow[]
    if (rows.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const checkinIds = Array.from(new Set(rows.map((r) => r.checkin_id)))
    const { data: checkins, error: checkinsError } = await supabase
      .from("club_checkins")
      .select("id, user_id, club_id, note, note_created_at")
      .in("id", checkinIds)

    if (checkinsError) logError("NOTAS CHECKINS ERROR:", checkinsError)
    const checkinsById = new Map(((checkins || []) as CheckinRow[]).map((c) => [c.id, c]))

    const clubIds = Array.from(new Set(Array.from(checkinsById.values()).map((c) => c.club_id)))
    const { data: clubs } = clubIds.length
      ? await supabase.from("clubs").select("id, name").in("id", clubIds)
      : { data: [] as any[] }
    const clubNameById = new Map((clubs || []).map((c: any) => [c.id, c.name as string]))

    const { data: allUsers, error: usersError } = await supabase.rpc("admin_list_users")
    if (usersError) logError("NOTAS USERS ERROR:", usersError)
    const people: Record<string, Person> = {}
    for (const u of (allUsers || []) as any[]) {
      people[u.id] = { email: u.email, username: u.username }
    }
    setPeopleById(people)

    // Varias denuncias pueden apuntar al mismo check-in: se agrupan para no repetir la nota.
    const byCheckin = new Map<number, Group>()
    for (const r of rows) {
      const c = checkinsById.get(r.checkin_id)
      if (!c || !c.note) continue // la nota ya se quitó o el check-in no existe: nada que mostrar
      if (!byCheckin.has(r.checkin_id)) {
        byCheckin.set(r.checkin_id, {
          checkinId: r.checkin_id,
          note: c.note,
          noteCreatedAt: c.note_created_at,
          authorId: c.user_id,
          clubName: clubNameById.get(c.club_id) || "Club desconocido",
          reports: [],
        })
      }
      byCheckin.get(r.checkin_id)!.reports.push({ id: r.id, reporterId: r.reporter_id, createdAt: r.created_at })
    }

    setGroups(Array.from(byCheckin.values()).sort((a, b) => b.reports.length - a.reports.length))
    setLoading(false)
  }

  useEffect(() => {
    if (!checkingAdmin) fetchReports()
  }, [checkingAdmin])

  const markReviewed = async (reportIds: number[]) => {
    await supabase.from("club_checkin_reports").update({ reviewed_at: new Date().toISOString() }).in("id", reportIds)
  }

  const dismiss = async (group: Group) => {
    setWorkingId(group.checkinId)
    await markReviewed(group.reports.map((r) => r.id))
    setWorkingId(null)
    setGroups((prev) => prev.filter((g) => g.checkinId !== group.checkinId))
  }

  const removeNote = async (group: Group) => {
    if (!window.confirm("¿Quitar esta nota de la ficha del club? No se puede deshacer.")) return
    setWorkingId(group.checkinId)
    const { error } = await supabase
      .from("club_checkins")
      .update({ note: null, note_created_at: null })
      .eq("id", group.checkinId)
    if (error) {
      logError("NOTAS REMOVE ERROR:", error)
      window.alert("No se pudo quitar la nota")
      setWorkingId(null)
      return
    }
    await markReviewed(group.reports.map((r) => r.id))
    setWorkingId(null)
    setGroups((prev) => prev.filter((g) => g.checkinId !== group.checkinId))
  }

  const openBlock = (group: Group) => {
    setBlockReason("offensive")
    setBlockNote("")
    setBlockDuration("forever")
    setBlockTarget({ checkinId: group.checkinId, authorId: group.authorId, email: peopleById[group.authorId]?.email || group.authorId })
  }

  const confirmBlock = async () => {
    if (!blockTarget) return
    setWorkingId(blockTarget.checkinId)
    const { error } = await supabase.from("profiles").upsert({
      id: blockTarget.authorId,
      is_blocked: true,
      block_reason: blockReason,
      block_note: blockNote.trim().slice(0, 300) || null,
      blocked_at: new Date().toISOString(),
      blocked_until: computeBlockedUntil(blockDuration),
    })
    if (error) {
      logError("NOTAS BLOCK ERROR:", error)
      window.alert("No se pudo bloquear al usuario")
      setWorkingId(null)
      return
    }
    const group = groups.find((g) => g.checkinId === blockTarget.checkinId)
    if (group) await markReviewed(group.reports.map((r) => r.id))
    setWorkingId(null)
    setBlockTarget(null)
    setGroups((prev) => prev.filter((g) => g.checkinId !== blockTarget.checkinId))
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">Cargando...</p>
      </main>
    )
  }

  return (
    <AdminShell
      title="Notas denunciadas"
      subtitle="Notas de check-in que alguien ha denunciado. Aquí sí se ve quién las escribió, para poder bloquear a quien amenace o diga algo que no debería."
    >
      {loading ? (
        <p className="mt-10 text-center text-zinc-400">Cargando...</p>
      ) : groups.length === 0 ? (
        <section className="mx-auto mt-10 max-w-4xl px-4">
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-3xl">✅</p>
            <p className="mt-3 text-zinc-400">No hay ninguna denuncia pendiente de revisar.</p>
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-6 max-w-4xl px-4 pb-10">
          <div className="grid gap-4">
            {groups.map((g) => {
              const author = peopleById[g.authorId]
              return (
                <div key={g.checkinId} className="rounded-card border border-red-500/20 bg-red-500/[0.04] p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-bold text-white">{g.clubName}</span>
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-bold text-red-300">
                      🚩 {g.reports.length} {g.reports.length === 1 ? "denuncia" : "denuncias"}
                    </span>
                    {g.noteCreatedAt && <span>{new Date(g.noteCreatedAt).toLocaleString("es-ES")}</span>}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white">“{g.note}”</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Escrita por{" "}
                    <span className="font-semibold text-zinc-200">
                      {author ? (author.username ? `@${author.username}` : author.email) : "usuario eliminado"}
                    </span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => dismiss(g)}
                      disabled={workingId === g.checkinId}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-40"
                    >
                      ✓ Descartar denuncia
                    </button>
                    <button
                      onClick={() => removeNote(g)}
                      disabled={workingId === g.checkinId}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
                    >
                      🗑 Quitar nota
                    </button>
                    <button
                      onClick={() => openBlock(g)}
                      disabled={workingId === g.checkinId || !author}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      🚫 Bloquear autor
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={() => setBlockTarget(null)}>
          <div className="w-full max-w-md rounded-card border border-red-500/30 bg-night p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black">Bloquear a {blockTarget.email}</p>
            <p className="mt-1 text-xs text-zinc-400">No podrá usar la app hasta que lo desbloquees o pase la duración elegida.</p>
            <label className="mt-4 block text-xs font-bold text-zinc-400">Motivo</label>
            <select
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white"
            >
              {BLOCK_REASONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-bold text-zinc-400">Duración</label>
            <select
              value={blockDuration}
              onChange={(e) => setBlockDuration(e.target.value as BlockDuration)}
              style={{ colorScheme: "dark" }}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white"
            >
              {BLOCK_DURATIONS.map((d) => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-bold text-zinc-400">Mensaje adicional (opcional, lo verá el usuario)</label>
            <textarea
              value={blockNote}
              onChange={(e) => setBlockNote(e.target.value)}
              rows={3}
              maxLength={300}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white"
            />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setBlockTarget(null)} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-zinc-300">Cancelar</button>
              <button
                onClick={confirmBlock}
                disabled={workingId === blockTarget.checkinId}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {workingId === blockTarget.checkinId ? "..." : "Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
