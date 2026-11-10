import { Linking } from 'react-native';
import { getSupportConfig } from '@beeapp/api-client';
import { appAlert } from '../components/feedback/appAlert';

const SUPPORT_SUBJECT = 'Ayuda con mi cuenta Buddy';
const SUPPORT_BODY =
  'Hola soporte de Buddy, necesito ayuda con mi cuenta.';

export async function openConfiguredSupportEmail(): Promise<void> {
  let email = '';

  try {
    const config = await getSupportConfig();
    email = config.email.trim();
  } catch {
    appAlert(
      'Soporte',
      'No fue posible obtener el correo de soporte. Inténtalo de nuevo.',
    );
    return;
  }

  if (!email) {
    appAlert(
      'Soporte',
      'El correo de soporte todavía no está configurado.',
    );
    return;
  }

  const url = `mailto:${email}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}&body=${encodeURIComponent(SUPPORT_BODY)}`;

  try {
    await Linking.openURL(url);
  } catch {
    appAlert(
      'Soporte',
      'No se pudo abrir la aplicación de correo en este dispositivo.',
    );
  }
}
