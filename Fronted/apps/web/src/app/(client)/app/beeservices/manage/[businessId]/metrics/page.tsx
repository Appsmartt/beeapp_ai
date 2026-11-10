'use client';

import { useParams } from 'next/navigation';
import { ManageMetrics } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManageMetrics businessId={params.businessId} />;
}
