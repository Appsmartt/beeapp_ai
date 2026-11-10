'use client';

import { useParams } from 'next/navigation';
import { ManageRequests } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManageRequests businessId={params.businessId} />;
}
