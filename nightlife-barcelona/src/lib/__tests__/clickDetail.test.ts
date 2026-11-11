import { describe, expect, it } from "vitest"
import { destinationRows, rideOriginRows, rideRows, shareChannelRows } from "../clickDetail"
import { outboundHost } from "../outbound"

describe("rideRows", () => {
  it("pone nombre a cada app, cuenta las llamadas al taxi y ordena de más a menos", () => {
    const rows = rideRows([
      { provider: "freenow", n: 1 },
      { provider: "uber", n: 5 },
      { provider: "taxi_phone", n: 3 },
      { provider: "cabify", n: 3 },
    ])
    expect(rows).toEqual([
      { label: "Uber", n: 5 },
      { label: "Cabify", n: 3 },
      { label: "Llamada a un taxi (teléfono)", n: 3 },
      { label: "FREE NOW", n: 1 },
    ])
  })

  it("lo que no se conoce sale tal cual, los ceros no salen y 'unknown' es «Sin registrar»", () => {
    expect(rideRows([{ provider: "bolt", n: 2 }, { provider: "uber", n: 0 }, { provider: "unknown", n: 1 }])).toEqual([
      { label: "bolt", n: 2 },
      { label: "Sin registrar", n: 1 },
    ])
  })

  it("sin datos devuelve una lista vacía", () => {
    expect(rideRows(undefined)).toEqual([])
    expect(rideRows(null)).toEqual([])
    expect(rideRows([])).toEqual([])
  })
})

describe("rideOriginRows", () => {
  it("dice desde qué página se pide", () => {
    expect(rideOriginRows([{ origin: "taxi_page", n: 2 }, { origin: "club_page", n: 5 }, { origin: "event_page", n: 1 }])).toEqual([
      { label: "Ficha de un club", n: 5 },
      { label: "Página de taxi", n: 2 },
      { label: "Ficha de un evento", n: 1 },
    ])
  })
})

describe("destinationRows", () => {
  const dests = [
    { kind: "tickets_click", host: "fourvenues.com", n: 4 },
    { kind: "tickets_click", host: "ticketmaster.es", n: 1 },
    { kind: "tickets_click", host: null, n: 2 },
    { kind: "website_click", host: "sutton.es", n: 9 },
  ]

  it("solo cuenta el tipo de clic pedido", () => {
    expect(destinationRows(dests, "tickets_click").map((r) => r.label)).toEqual(["fourvenues.com", "Sin registrar", "ticketmaster.es"])
    expect(destinationRows(dests, "website_click")).toEqual([{ label: "sutton.es", n: 9 }])
  })

  it("suma los que no tienen dominio guardado en «Sin registrar»", () => {
    const rows = destinationRows([{ kind: "tickets_click", host: null, n: 2 }, { kind: "tickets_click", host: "", n: 3 }], "tickets_click")
    expect(rows).toEqual([{ label: "Sin registrar", n: 5 }])
  })

  it("sin datos devuelve una lista vacía", () => {
    expect(destinationRows(undefined, "tickets_click")).toEqual([])
  })
})

describe("shareChannelRows", () => {
  it("distingue el menú del móvil del enlace copiado", () => {
    expect(shareChannelRows([{ channel: "copy", n: 3 }, { channel: "native", n: 7 }, { channel: "unknown", n: 1 }])).toEqual([
      { label: "Menú de compartir del móvil", n: 7 },
      { label: "Enlace copiado", n: 3 },
      { label: "Sin registrar", n: 1 },
    ])
  })
})

describe("outboundHost", () => {
  it("devuelve solo el dominio, sin www y en minúsculas", () => {
    expect(outboundHost("https://www.FourVenues.com/es/entradas/abc?code=SECRETO#x")).toBe("fourvenues.com")
    expect(outboundHost("http://ticketmaster.es/event/1")).toBe("ticketmaster.es")
    expect(outboundHost("https://entradas.sala-apolo.com/a")).toBe("entradas.sala-apolo.com")
  })

  it("no devuelve nada si no es una dirección web válida", () => {
    expect(outboundHost(null)).toBeNull()
    expect(outboundHost(undefined)).toBeNull()
    expect(outboundHost("")).toBeNull()
    expect(outboundHost("no es una url")).toBeNull()
    expect(outboundHost("mailto:hola@sutton.es")).toBeNull()
    expect(outboundHost("javascript:alert(1)")).toBeNull()
  })

  it("nunca guarda la dirección completa (códigos de compra, sesión...)", () => {
    expect(outboundHost("https://tickets.test/comprar?token=abc123&user=42")).not.toMatch(/abc123|token|user/)
  })
})
