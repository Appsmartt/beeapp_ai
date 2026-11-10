'use client';

import { useParams } from 'next/navigation';
import { ManageOffers } from '@/components/client/beeservices/manage/OwnerScreens';

export default function Page() {
  const params = useParams<{ businessId: string }>();
  return <ManageOffers businessId={params.businessId} archived />;
}
