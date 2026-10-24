import { ProfileSectionPage } from '@/components/client/ProfileSectionPage';
import { DevicesPanel } from '@/components/client/DevicesPanel';

export default function DevicesPage() {
  return (
    <ProfileSectionPage
      title="Dispositivos"
      description="Sesiones activas y acceso con código QR."
    >
      <DevicesPanel />
    </ProfileSectionPage>
  );
}
