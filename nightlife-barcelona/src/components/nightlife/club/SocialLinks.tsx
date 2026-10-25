"use client"

import Icon from "../../ui/Icon"
import { InlineEditText } from "../../admin/InlineEdit"
import { useCanEdit } from "../../admin/EditAccess"
import { useLanguage } from "../../../context/LanguageContext"

// Redes del local o evento (25/10/2026): botones «Síguelos» de Instagram y TikTok (y la web, en
// los eventos). El admin y el dueño vinculado ven además, en la misma ficha, los campos para
// añadirlas o cambiarlas: vale escribir "@usuario" o pegar el enlace entero.
// Columnas: instagram, tiktok y website en clubs y events (supabase/40_redes_sociales.sql).

export function socialUrl(kind: "instagram" | "tiktok" | "website", raw?: string | null): string | null {
  const v = (raw || "").trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  if (kind === "website") return `https://${v.replace(/^\/+/, "")}`
  const handle = v
    .replace(/^@/, "")
    .replace(/^(www\.)?(instagram\.com|tiktok\.com)\/@?/i, "")
    .replace(/[/?#].*$/, "")
  if (!handle) return null
  return kind === "instagram" ? `https://instagram.com/${handle}` : `https://www.tiktok.com/@${handle}`
}

export default function SocialLinks({
  table,
  id,
  instagram,
  tiktok,
  website,
  showWebsite = false,
  onClick,
  className = "",
}: {
  table: "clubs" | "events"
  id: number
  instagram?: string | null
  tiktok?: string | null
  website?: string | null
  showWebsite?: boolean
  onClick?: (kind: "instagram_click" | "website_click" | "tiktok_click") => void
  className?: string
}) {
  const { t } = useLanguage()
  const canEdit = useCanEdit()
  const ig = socialUrl("instagram", instagram)
  const tt = socialUrl("tiktok", tiktok)
  const web = showWebsite ? socialUrl("website", website) : null

  const btn =
    "flex flex-1 items-center justify-center gap-2 rounded-ctl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/10"

  if (!ig && !tt && !web && !canEdit) return null

  return (
    <div className={className}>
      {(ig || tt || web) && (
        <>
          <p className="mb-2 text-xs font-semibold text-zinc-400">{t("clubPage.followThem")}</p>
          <div className="flex flex-wrap gap-2">
            {ig && (
              <a href={ig} target="_blank" rel="noopener noreferrer" onClick={() => onClick?.("instagram_click")} className={btn}>
                <Icon name="instagram" className="h-4 w-4" /> Instagram
              </a>
            )}
            {tt && (
              <a href={tt} target="_blank" rel="noopener noreferrer" onClick={() => onClick?.("tiktok_click")} className={btn}>
                <Icon name="tiktok" className="h-4 w-4" /> TikTok
              </a>
            )}
            {web && (
              <a href={web} target="_blank" rel="noopener noreferrer" onClick={() => onClick?.("website_click")} className={btn}>
                <Icon name="globe" className="h-4 w-4" /> {t("clubPage.website")}
              </a>
            )}
          </div>
        </>
      )}

      {canEdit && (
        <dl className="mt-3 space-y-1.5 rounded-ctl border border-dashed border-purple-400/30 bg-purple-400/[0.04] p-3 text-xs">
          <p className="font-semibold text-purple-200">Redes (solo lo ves tú)</p>
          {(
            [
              ["instagram", "Instagram", instagram, "@usuario o enlace"],
              ["tiktok", "TikTok", tiktok, "@usuario o enlace"],
              ["website", "Web", website, "https://..."],
            ] as const
          ).map(([field, label, value, ph]) => (
            <div key={field} className="flex items-baseline gap-2">
              <dt className="w-16 shrink-0 text-zinc-400">{label}</dt>
              <dd className="min-w-0 flex-1 break-all text-zinc-200">
                <InlineEditText table={table} id={id} field={field} value={value} placeholder={ph} emptyLabel={`añadir ${label}`} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
