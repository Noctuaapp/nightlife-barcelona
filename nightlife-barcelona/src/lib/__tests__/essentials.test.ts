import { describe, it, expect } from "vitest"
import { cleanEssential } from "../essentials"

describe("cleanEssential", () => {
  it("quita EVITAR del nombre y marca comisión alta", () => {
    const r = cleanEssential({ name: "Cajeros Euronet EVITAR", category: "ATM" })
    expect(r.name).toBe("Cajeros Euronet")
    expect(r.highFee).toBe(true)
  })
  it("marca los cajeros Euronet aunque no lo diga el nombre", () => {
    expect(cleanEssential({ name: "Euronet Rambla", category: "ATM" }).highFee).toBe(true)
  })
  it("deja igual un sitio normal", () => {
    expect(cleanEssential({ name: "Farmacia Centro", category: "Pharmacy" })).toMatchObject({ name: "Farmacia Centro", highFee: false })
  })
})
