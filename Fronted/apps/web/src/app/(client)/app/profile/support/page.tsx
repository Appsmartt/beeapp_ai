import { ProfileSectionPage } from '@/components/client/ProfileSectionPage';
import { SupportPanel } from '@/components/client/SupportPanel';

export default function SupportPage() {
  return (
    <ProfileSectionPage
      title="Contactar a soporte"
      description="Preguntas frecuentes y canales de contacto."
    >
      <SupportPanel />
    </ProfileSectionPage>
  );
}
