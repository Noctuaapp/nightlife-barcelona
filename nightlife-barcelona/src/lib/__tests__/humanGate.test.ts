import { describe, it, expect } from "vitest"
import { createHumanGate, listenForHuman, HUMAN_SIGNALS } from "../humanGate"

describe("createHumanGate", () => {
  it("guarda los eventos hasta la primera señal humana y los suelta en orden", () => {
    const sent: string[][] = []
    const gate = createHumanGate<string>((items) => sent.push(items))
    gate.hold("session_start")
    gate.hold("page_nav")
    expect(gate.isHuman()).toBe(false)
    expect(sent).toEqual([])
    gate.markHuman()
    expect(gate.isHuman()).toBe(true)
    expect(sent).toEqual([["session_start", "page_nav"]])
  })

  it("sin señal humana no se envía nada (un bot que solo carga la página no deja rastro)", () => {
    const sent: string[][] = []
    const gate = createHumanGate<string>((items) => sent.push(items))
    gate.hold("session_start")
    expect(sent).toEqual([])
  })

  it("la segunda señal no repite el envío", () => {
    const sent: string[][] = []
    const gate = createHumanGate<string>((items) => sent.push(items))
    gate.hold("a")
    gate.markHuman()
    gate.markHuman()
    expect(sent).toEqual([["a"]])
  })

  it("una señal sin nada esperando no envía una lista vacía", () => {
    const sent: string[][] = []
    const gate = createHumanGate<string>((items) => sent.push(items))
    gate.markHuman()
    expect(sent).toEqual([])
  })

  it("tiene tope de espera: un bot no puede llenar la memoria", () => {
    const sent: string[][] = []
    const gate = createHumanGate<number>((items) => sent.push(items.map(String)), 3)
    for (let i = 0; i < 10; i++) gate.hold(i)
    gate.markHuman()
    expect(sent).toEqual([["0", "1", "2"]])
  })

  it("después de la señal, hold ya no acumula (los eventos se envían directos)", () => {
    const sent: string[][] = []
    const gate = createHumanGate<string>((items) => sent.push(items))
    gate.markHuman()
    gate.hold("tarde")
    gate.markHuman()
    expect(sent).toEqual([])
  })
})

describe("listenForHuman", () => {
  it("avisa una sola vez con una señal de confianza y se desconecta", () => {
    const target = new EventTarget()
    let calls = 0
    listenForHuman(target, () => calls++, () => true)
    target.dispatchEvent(new Event("touchstart"))
    target.dispatchEvent(new Event("keydown"))
    expect(calls).toBe(1)
  })

  it("ignora las señales que no son de confianza (fabricadas por un script)", () => {
    const target = new EventTarget()
    let calls = 0
    listenForHuman(target, () => calls++) // sin isTrusted a mano: un Event de Node tiene isTrusted = false
    target.dispatchEvent(new Event("pointerdown"))
    target.dispatchEvent(new Event("mousemove"))
    expect(calls).toBe(0)
  })

  it("escucha las cinco señales y no usa scroll (el navegador lo dispara solo)", () => {
    expect([...HUMAN_SIGNALS].sort()).toEqual(["keydown", "mousemove", "pointerdown", "touchstart", "wheel"])
    for (const type of HUMAN_SIGNALS) {
      const target = new EventTarget()
      let calls = 0
      listenForHuman(target, () => calls++, () => true)
      target.dispatchEvent(new Event(type))
      expect(calls).toBe(1)
    }
    const target = new EventTarget()
    let calls = 0
    listenForHuman(target, () => calls++, () => true)
    target.dispatchEvent(new Event("scroll"))
    expect(calls).toBe(0)
  })

  it("la función devuelta desconecta antes de la primera señal", () => {
    const target = new EventTarget()
    let calls = 0
    const stop = listenForHuman(target, () => calls++, () => true)
    stop()
    target.dispatchEvent(new Event("touchstart"))
    expect(calls).toBe(0)
  })
})
