import { ProfileSectionPage } from '@/components/client/ProfileSectionPage';
import { PrivacyPanel } from '@/components/client/LegalPanels';

export default function PrivacyPage() {
  return (
    <ProfileSectionPage
      title="Política de privacidad"
      description="Cómo se tratan tus datos."
    >
      <PrivacyPanel />
    </ProfileSectionPage>
  );
}