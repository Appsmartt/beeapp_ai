import type { AuthCredentials } from '@beeapp/shared-types';
import { getSupabase } from '@beeapp/api-client';

/**
 * Credenciales Bearer para endpoints que usan AuthCredentials (paridad con apps/mobile).
 * Usar en lugar de duplicar getSession() en componentes.
 */
export async function getWebAuth(): Promise<AuthCredentials> {
  const { data, error } = await getSupabase().auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error('Inicia sesión para continuar.');
  }

  return { scheme: 'Bearer', token: data.session.access_token };
}
