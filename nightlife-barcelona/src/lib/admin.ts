// Cuenta de administración de Noctua. Antes este email estaba escrito a mano en ~20 archivos; si
// algún día cambia, basta con tocarlo aquí. (La comprobación de verdad la hacen la base de datos
// —is_noctua_admin()— y las rutas de servidor —src/lib/adminAuth.ts—; esto solo decide qué se
// enseña en pantalla.)
export const ADMIN_EMAIL = "info@noctuaapp.com"

export const isAdminEmail = (email: string | null | undefined): boolean => email === ADMIN_EMAIL
