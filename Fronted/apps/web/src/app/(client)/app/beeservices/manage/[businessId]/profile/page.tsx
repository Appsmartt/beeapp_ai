'use client';

import { useParams } from 'next/navigation';
import { ManageProfile } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManageProfile businessId={params.businessId} />;
}
