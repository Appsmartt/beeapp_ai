import { ProfileSectionPage } from '@/components/client/ProfileSectionPage';
import { SecurityPanel } from '@/components/client/SecurityPanel';

export default function SecurityPage() {
  return (
    <ProfileSectionPage
      title="Seguridad y PIN"
      description="El PIN de la cuenta y los chats protegidos."
    >
      <SecurityPanel />
    </ProfileSectionPage>
  );
}
