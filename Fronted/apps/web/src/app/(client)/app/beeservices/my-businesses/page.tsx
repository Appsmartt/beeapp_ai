'use client';

import { useRouter } from 'next/navigation';
import { BeeServicesPanel } from '@/components/client/BeeServicesPanel';

export default function MyBusinessesPage() {
  const router = useRouter();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FFFCF9]">
      <BeeServicesPanel onClose={() => router.push('/app')} />
    </div>
  );
}
