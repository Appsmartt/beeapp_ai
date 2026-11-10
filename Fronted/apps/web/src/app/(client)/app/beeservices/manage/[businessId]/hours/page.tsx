'use client';

import { useParams } from 'next/navigation';
import { ManageHours } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManageHours businessId={params.businessId} />;
}
