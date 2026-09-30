// Protege los endpoints /api/cron/* que no la tenían ya, siguiendo el mismo patrón que ya usan
// refresh-google-data y refresh-events-google-data: CRON_SECRET (cabecera Authorization que
// Vercel añade solo en sus propias llamadas programadas) o ADMIN_SECRET como query param, para
// poder disparar un refresco a mano visitando la URL con ?secret=TU_ADMIN_SECRET.
export function isAuthorizedCronRequest(req: Request): boolean {
  const { searchParams } = new URL(req.url)
  const authHeader = req.headers.get("authorization")
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isManual = searchParams.get("secret") === process.env.ADMIN_SECRET
  return isVercelCron || isManual
}
