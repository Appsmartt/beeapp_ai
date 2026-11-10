'use client';

import AiSettingsScreen from '@/components/client/chat/modals/AiSettingsScreen';
import { ProfileSectionPage } from '@/components/client/ProfileSectionPage';
import { useRouter } from 'next/navigation';

export default function AiSettingsPage() {
  const router = useRouter();
  return (
    <ProfileSectionPage
      wide
      title="Configuración del Asistente"
      description="Personalidad, voz, permisos y memoria de Buddy AI."
    >
      <AiSettingsScreen hideHeader onBack={() => router.push('/app')} />
    </ProfileSectionPage>
  );
}
