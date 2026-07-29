'use client';

import AiSettingsScreen from '@/components/app/chat/modals/AiSettingsScreen';
import { useRouter } from 'next/navigation';

export default function AiSettingsPage() {
  const router = useRouter();
  return <AiSettingsScreen onBack={() => router.push('/app')} />;
}
