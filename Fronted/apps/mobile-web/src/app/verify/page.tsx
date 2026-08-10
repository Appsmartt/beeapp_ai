import { redirect } from 'next/navigation';

/**
 * La verificación por OTP quedó fuera: la web solo inicia sesión escaneando el
 * código QR desde la app móvil. La ruta se conserva redirigiendo a /login para
 * no dejar enlaces antiguos rotos.
 */
export default function VerifyPage() {
  redirect('/login');
}
