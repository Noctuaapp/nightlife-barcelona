import { describe, it, expect } from "vitest"
import { dressCodeOf } from "../dressCode"

describe("dressCodeOf", () => {
  it("lee la columna real de clubs (dress_code)", () => {
    expect(dressCodeOf({ dress_code: "Casual elegant" })).toBe("Casual elegant")
  })

  it("acepta también dresscode (club_sessions) y prefiere dress_code", () => {
    expect(dressCodeOf({ dresscode: "Elegant" })).toBe("Elegant")
    expect(dressCodeOf({ dress_code: "Casual", dresscode: "Elegant" })).toBe("Casual")
  })

  it("quita espacios y trata vacío, null y valores raros como sin dato", () => {
    expect(dressCodeOf({ dress_code: "  Smart-casual " })).toBe("Smart-casual")
    expect(dressCodeOf({ dress_code: "", dresscode: "Casual" })).toBe("Casual")
    for (const v of [{ dress_code: null }, { dress_code: "   " }, { dress_code: 3 }, {}, null, undefined]) {
      expect(dressCodeOf(v as never)).toBe("")
    }
  })
})
