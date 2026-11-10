'use client';

import { useParams } from 'next/navigation';
import { ManageCatalogs } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManageCatalogs businessId={params.businessId} archived />;
}
