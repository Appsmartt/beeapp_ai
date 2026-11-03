import { Redirect } from 'expo-router';

/** Ruta legada: unifica en la home de Buddy Services. */
export default function BeeServicesPrivateRedirect() {
  return <Redirect href="/(main)/beeservices" />;
}
