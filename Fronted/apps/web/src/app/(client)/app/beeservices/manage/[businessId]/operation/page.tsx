'use client';

import { useParams } from 'next/navigation';
import { ManageOperation } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManageOperation businessId={params.businessId} />;
}
