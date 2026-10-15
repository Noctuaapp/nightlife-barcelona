import { metroLineColor, NITBUS_PLATE } from "../../lib/transitColors"
import { getNightBusLine, nightBusStopsUrl, parseRoute } from "../../lib/nightBuses"

// Insignia de línea de transporte: redonda para metro (como el rótulo del andén), en placa
// rectangular para Nitbus (como el cartel azul de la parada). La forma distingue el modo sin
// necesitar una etiqueta de texto aparte; el color es el oficial de cada línea de metro.
export function MetroLineBadge({ code, size = "sm" }: { code: string; size?: "sm" | "md" }) {
  const { bg, fg } = metroLineColor(code)
  const dim = size === "md" ? "h-7 w-7 text-sm" : "h-6 w-6 text-xs"
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black ${dim}`}
      style={{ background: bg, color: fg }}
    >
      {code.replace(/^L/i, "")}
    </span>
  )
}

export function NitbusBadge({ code, size = "sm" }: { code: string; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-7 px-2.5 text-sm" : "h-6 px-2 text-xs"
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-black tracking-tight ${dim}`}
      style={{ background: NITBUS_PLATE.bg, color: NITBUS_PLATE.fg }}
    >
      {code}
    </span>
  )
}

// Fila de una línea Nitbus: placa + origen → destino (en vez de una frase corrida), para que a
// las 4 de la mañana se entienda de un vistazo a dónde va el bus, no haga falta leer una frase
// entera para encontrarlo. Si la línea no está en el catálogo (código nuevo o mal escrito), se
// enseña igual la placa con el código tal cual y el aviso de que no hay datos.
export function NitbusRouteRow({
  code,
  seeStopsLabel,
  unknownLabel,
  onLinkClick,
}: {
  code: string
  seeStopsLabel: string
  unknownLabel: string
  onLinkClick?: (e: React.MouseEvent) => void
}) {
  const line = getNightBusLine(code)
  if (!line) {
    return (
      <div className="flex items-center gap-2.5">
        <NitbusBadge code={code.trim().toUpperCase()} />
        <p className="text-xs text-zinc-400">{unknownLabel}</p>
      </div>
    )
  }
  const { from, to, note } = parseRoute(line.route)
  return (
    <div className="flex items-start gap-2.5">
      <NitbusBadge code={line.code} />
      <div className="min-w-0 text-xs leading-snug">
        <p className="font-semibold text-ink">
          {from}
          {to && (
            <>
              <span className="mx-1 text-zinc-500">→</span>
              {to}
            </>
          )}
        </p>
        <p className="mt-0.5 text-zinc-400">
          {note && <>{note} · </>}
          <a
            href={nightBusStopsUrl(line.code)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onLinkClick}
            className="font-semibold text-sky-300 underline underline-offset-2"
          >
            {seeStopsLabel}
          </a>
        </p>
      </div>
    </div>
  )
}
