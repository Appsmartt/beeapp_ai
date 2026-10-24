'use client';

import AiSettingsScreen from '@/components/client/chat/modals/AiSettingsScreen';
import { useRouter } from 'next/navigation';

export default function AiSettingsPage() {
  const router = useRouter();
  return (
    <div className="h-full overflow-y-auto">
      <AiSettingsScreen onBack={() => router.push('/app')} />
    </div>
  );
}
