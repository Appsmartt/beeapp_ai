'use client';

import { useParams } from 'next/navigation';
import CommercialWorkspace from '@/components/client/beeservices/CommercialWorkspace';

export default function ManageHubPage() {
  const params = useParams<{ businessId: string }>();
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <CommercialWorkspace businessId={params.businessId} />
    </div>
  );
}
