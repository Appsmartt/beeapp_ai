import { ProfileSectionPage } from '@/components/client/ProfileSectionPage';
import { TermsPanel } from '@/components/client/LegalPanels';

export default function TermsPage() {
  return (
    <ProfileSectionPage
      title="Términos y condiciones"
      description="Condiciones de uso de Buddy."
    >
      <TermsPanel />
    </ProfileSectionPage>
  );
}
