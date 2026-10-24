import { ProfileSectionPage } from '@/components/client/ProfileSectionPage';
import { SubscriptionPanel } from '@/components/client/SubscriptionPanel';

export default function SubscriptionPage() {
  return (
    <ProfileSectionPage
      title="Suscripción y verificación"
      description="Tu plan, el almacenamiento y la insignia de cuenta verificada."
    >
      <SubscriptionPanel />
    </ProfileSectionPage>
  );
}
