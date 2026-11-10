'use client';

import { useParams } from 'next/navigation';
import { ManageRequestDetail } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string; requestId: string }>();
  return <ManageRequestDetail businessId={params.businessId} requestId={params.requestId} />;
}
