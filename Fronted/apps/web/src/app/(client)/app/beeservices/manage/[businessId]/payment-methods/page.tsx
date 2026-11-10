'use client';

import { useParams } from 'next/navigation';
import { ManagePayments } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManagePayments businessId={params.businessId} />;
}
