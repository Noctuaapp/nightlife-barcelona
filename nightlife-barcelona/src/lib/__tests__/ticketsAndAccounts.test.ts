import { describe, expect, it } from "vitest"
import { topTicketClicks } from "../ticketClicks"
import { activeAccounts, lastSeenLabel } from "../activeAccounts"

describe("topTicketClicks", () => {
  const all = { club: () => true, event: () => true }
  it("ordena clubs y eventos juntos por clics y deja fuera los que no tienen", () => {
    const top = topTicketClicks(
      [{ id: 1, name: "Razzmatazz", tickets: 9 }, { id: 2, name: "Apolo", tickets: 0 }, { id: 3, name: "Opium", tickets: "4" }],
      [{ id: 7, name: "Sónar", tickets: 6 }],
      all
    )
    expect(top.map((r) => `${r.kind}:${r.name}:${r.clicks}`)).toEqual(["club:Razzmatazz:9", "event:Sónar:6", "club:Opium:4"])
  })
  it("solo cuenta lo de la ciudad elegida y respeta el límite", () => {
    const top = topTicketClicks(
      [{ id: 1, name: "A", tickets: 5 }, { id: 2, name: "B", tickets: 8 }],
      [{ id: 9, name: "Madrid fest", tickets: 20 }],
      { club: (id) => id === "1", event: () => false },
      1
    )
    expect(top).toEqual([{ key: "club-1", kind: "club", name: "A", clicks: 5 }])
  })
})

describe("activeAccounts", () => {
  const users = [
    { id: "u1", email: "a@x.com", username: "fiorenzo" },
    { id: "u2", email: "b@x.com", username: null },
    { id: "u3", email: "info@noctuaapp.com", username: "noctua" },
  ]
  it("une actividad y nombre, ordena por la última vez y marca la cuenta propia", () => {
    const rows = activeAccounts(
      users,
      [
        { user_id: "u2", last_seen: "2026-11-19T10:00:00Z", active_days: 2 },
        { user_id: "u3", last_seen: "2026-11-20T00:10:00Z", active_days: 3 },
        { user_id: "u1", last_seen: "2026-11-18T09:00:00Z", active_days: null },
        { user_id: "borrada", last_seen: "2026-11-20T00:00:00Z", active_days: 1 },
      ],
      "info@noctuaapp.com"
    )
    expect(rows.map((r) => r.label)).toEqual(["@noctua", "b@x.com", "@fiorenzo"])
    expect(rows[0].self).toBe(true)
    expect(rows[2].days).toBe(1)
  })
})

describe("lastSeenLabel", () => {
  const now = Date.parse("2026-11-20T12:00:00Z")
  it("dice cuánto hace", () => {
    expect(lastSeenLabel("2026-11-20T11:58:00Z", now)).toBe("hace 2 min")
    expect(lastSeenLabel("2026-11-20T09:00:00Z", now)).toBe("hace 3 h")
    expect(lastSeenLabel("2026-11-19T10:00:00Z", now)).toBe("ayer")
    expect(lastSeenLabel("2026-11-16T12:00:00Z", now)).toBe("hace 4 días")
    expect(lastSeenLabel(null, now)).toBe("sin fecha")
  })
})
